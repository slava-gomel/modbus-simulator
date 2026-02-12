from __future__ import annotations

import math
import threading
import time
from dataclasses import dataclass, field
from typing import List, Optional

from .encoding_utils import encode_float32, encode_float64, encode_int16
from .modbus_core import ModbusSimulatorCore
from .models import SignalGeneratorConfig


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

    def __init__(self, core: ModbusSimulatorCore) -> None:
        self._core = core
        self._lock = threading.Lock()
        self._generators: List[_RuntimeGenerator] = []
        self._running = False
        self._thread: Optional[threading.Thread] = None

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
        # Простой таймер: каждые 50 мс просматриваем генераторы и решаем, что обновлять.
        base_sleep = 0.05
        last_update: dict[str, float] = {}

        while self._running:
            now = time.time()
            with self._lock:
                gens = list(self._generators)
            for g in gens:
                cfg = g.cfg
                if not cfg.enabled:
                    continue
                last = last_update.get(cfg.id, 0.0)
                if now - last < g.period_seconds():
                    continue
                self._apply_generator(g, now)
                last_update[cfg.id] = now
            time.sleep(base_sleep)

    # --------- генерация значений ---------
    def _apply_generator(self, gen: _RuntimeGenerator, now: float) -> None:
        cfg = gen.cfg
        # Только holding‑регистры поддерживаются на первом этапе.
        if cfg.register_kind != "holding":
            return

        t = now - gen.start_time
        # Базовое значение сигнала в виде float
        base = self._eval_wave(cfg, t)

        # Кодируем в 16‑битные регистры в зависимости от data_type
        if cfg.data_type == "int16":
            word = encode_int16(int(round(base)))
            self._core.write_single_holding_register(cfg.start_address, word)
        elif cfg.data_type == "float32":
            regs = encode_float32(base)
            self._core.write_multiple_holding_registers(cfg.start_address, regs)
        elif cfg.data_type == "float64":
            regs = encode_float64(base)
            self._core.write_multiple_holding_registers(cfg.start_address, regs)

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

