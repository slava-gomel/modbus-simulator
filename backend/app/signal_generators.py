from __future__ import annotations

import asyncio
import math
import threading
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, List, Optional

from .encoding_utils import encode_float32, encode_float64, encode_int16
from .modbus_core import ModbusSimulatorCore
from .models import SignalGeneratorConfig

if TYPE_CHECKING:
    from .websocket_manager import ConnectionManager


@dataclass
class _RuntimeGenerator:
    cfg: SignalGeneratorConfig
    # Временная «фаза» в секундах, чтобы изменения частоты не ломали форму волны резко.
    start_time: float = field(default_factory=time.time)

    def period_seconds(self) -> float:
        return max(self.cfg.update_period_ms, 10) / 1000.0


class SignalGeneratorEngine:
    """
    Простой движок генераторов сигналов, работающий поверх ModbusSimulatorCore.

    - хранит список конфигураций генераторов;
    - по таймеру рассчитывает новые значения;
    - пишет их в holding‑регистры ядра.
    """

    def __init__(self, core: ModbusSimulatorCore, ws_manager: Optional[ConnectionManager] = None) -> None:
        self._core = core
        self._ws_manager = ws_manager
        self._lock = threading.Lock()
        self._generators: List[_RuntimeGenerator] = []
        self._running = False
        self._thread: Optional[threading.Thread] = None
        # Основной event loop приложения (передаётся из lifespan) — для broadcast из фонового потока
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Установить основной event loop для WebSocket broadcast из фонового потока."""
        self._loop = loop

    # --------- управление конфигурацией ---------
    def set_generators(self, configs: List[SignalGeneratorConfig]) -> None:
        """Полная замена набора генераторов."""

        with self._lock:
            # Храним все генераторы (включённые и выключенные), чтобы конфигурация
            # полностью сохранялась в профилях и через /api/generators.
            # Логика включения/выключения учитывается в _run_loop.
            self._generators = [_RuntimeGenerator(cfg=c) for c in configs]

    def get_generators(self) -> List[SignalGeneratorConfig]:
        """Текущий набор конфигураций (копия)."""

        with self._lock:
            return [g.cfg for g in self._generators]

    # --------- поток обновления ---------
    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._run_loop, name="signal-generator", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

    def _run_loop(self) -> None:
        # Простой таймер: каждые 20 мс просматриваем генераторы и решаем, что обновлять.
        # Производительность: base_sleep = 20ms обеспечивает быстрое обновление регистров в UI
        # (синхронно с типичным update_period_ms = 100ms генераторов)
        base_sleep = 0.02  # 20ms для быстрых обновлений
        last_update: dict[str, float] = {}
        last_broadcast = 0.0
        broadcast_interval = 0.1  # 100ms для live графиков (синхронно с генераторами)

        while self._running:
            now = time.time()
            with self._lock:
                gens = list(self._generators)
            
            # Собираем все обновления регистров за этот цикл
            registers_updates: dict[int, int] = {}  # {address: value}
            
            # Применяем генераторы
            for g in gens:
                cfg = g.cfg
                if not cfg.enabled:
                    continue
                last = last_update.get(cfg.id, 0.0)
                if now - last < g.period_seconds():
                    continue
                updated_regs = self._apply_generator(g, now)
                # Собираем обновления
                if updated_regs:
                    for addr, val in updated_regs.items():
                        registers_updates[addr] = val
                last_update[cfg.id] = now
            
            # Batch broadcast всех обновлений регистров за этот цикл
            if self._ws_manager and registers_updates:
                self._broadcast_registers_batch(registers_updates)
            
            # WebSocket broadcast значений генераторов
            if self._ws_manager and (now - last_broadcast) >= broadcast_interval:
                self._broadcast_generator_values(gens, now)
                last_broadcast = now
            
            time.sleep(base_sleep)

    def _broadcast_generator_values(self, gens: List[_RuntimeGenerator], now: float) -> None:
        """Отправить текущие значения генераторов через WebSocket."""
        if not self._ws_manager:
            return
        
        # Собираем данные только для включенных генераторов
        generator_data = []
        for g in gens:
            if not g.cfg.enabled:
                continue
            
            t = now - g.start_time
            value = self._eval_wave(g.cfg, t)
            
            # Определяем затрагиваемые регистры
            reg_count = 1 if g.cfg.data_type == "int16" else (2 if g.cfg.data_type == "float32" else 4)
            registers = list(range(g.cfg.start_address, g.cfg.start_address + reg_count))
            
            generator_data.append({
                "id": g.cfg.id,
                "name": g.cfg.name,
                "value": value,
                "registers": registers,
                "neon_color": g.cfg.neon_color,
            })
        
        if generator_data and self._ws_manager and self._loop:
            try:
                asyncio.run_coroutine_threadsafe(
                    self._ws_manager.broadcast("generators", {
                        "event": "generator_values",
                        "data": {"generators": generator_data}
                    }),
                    self._loop
                )
            except RuntimeError:
                pass

    def _broadcast_registers_batch(self, registers_updates: dict[int, int]) -> None:
        """Отправить batch обновление регистров через WebSocket."""
        if not registers_updates:
            return
        
        # Группируем последовательные регистры для эффективной передачи
        sorted_addrs = sorted(registers_updates.keys())
        
        # Отправляем диапазоны последовательных регистров
        start_addr = sorted_addrs[0]
        values = [registers_updates[start_addr]]
        
        for addr in sorted_addrs[1:]:
            if addr == start_addr + len(values):
                # Последовательный регистр
                values.append(registers_updates[addr])
            else:
                # Разрыв - отправляем предыдущий диапазон
                self._broadcast_register_range(start_addr, values)
                start_addr = addr
                values = [registers_updates[addr]]
        
        # Отправляем последний диапазон
        if values:
            self._broadcast_register_range(start_addr, values)
    
    def _broadcast_register_range(self, start: int, values: list[int]) -> None:
        """Отправить один диапазон регистров через WebSocket."""
        if not self._ws_manager or not self._loop:
            return
        try:
            asyncio.run_coroutine_threadsafe(
                self._ws_manager.broadcast("registers", {
                    "event": "registers_changed",
                    "data": {
                        "kind": "holding",
                        "start": start,
                        "count": len(values),
                        "values": values
                    }
                }),
                self._loop
            )
        except RuntimeError:
            pass

    # --------- генерация значений ---------
    def _apply_generator(self, gen: _RuntimeGenerator, now: float) -> dict[int, int] | None:
        """Применить генератор и вернуть обновлённые регистры {address: value}."""
        cfg = gen.cfg
        # Только holding‑регистры поддерживаются на первом этапе.
        if cfg.register_kind != "holding":
            return None

        t = now - gen.start_time
        # Базовое значение сигнала в виде float
        base = self._eval_wave(cfg, t)

        # Кодируем в 16‑битные регистры в зависимости от data_type
        registers_written = []
        if cfg.data_type == "int16":
            word = encode_int16(int(round(base)))
            self._core.write_single_holding_register(cfg.start_address, word)
            registers_written = [word]
        elif cfg.data_type == "float32":
            regs = encode_float32(base)
            self._core.write_multiple_holding_registers(cfg.start_address, regs)
            registers_written = regs
        elif cfg.data_type == "float64":
            regs = encode_float64(base)
            self._core.write_multiple_holding_registers(cfg.start_address, regs)
            registers_written = regs
        
        # Возвращаем обновлённые регистры для batch broadcast
        if registers_written:
            return {cfg.start_address + i: val for i, val in enumerate(registers_written)}
        return None

    @staticmethod
    def _eval_wave(cfg: SignalGeneratorConfig, t: float) -> float:
        """Посчитать значение волны в момент времени t (секунды)."""

        # Нормализуем период: для очень маленьких частот не даём делить на ноль
        freq = max(cfg.frequency_hz, 1e-6)
        phase = 2.0 * math.pi * freq * t
        a = cfg.amplitude
        off = cfg.offset

        if cfg.wave_type == "sine":
            return off + a * math.sin(phase)
        if cfg.wave_type == "saw":
            # saw: значение в [0, 1) → масштабируем амплитудой
            frac = (t * freq) % 1.0
            return off + a * (2.0 * frac - 1.0)
        if cfg.wave_type == "square":
            sign = 1.0 if math.sin(phase) >= 0 else -1.0
            return off + a * sign
        if cfg.wave_type == "constant":
            return off

        # fallback
        return off

