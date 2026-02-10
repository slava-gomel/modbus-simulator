from __future__ import annotations

"""
Локальный «форк» части pymodbus.server.async_io для TCP‑сервера,
который прокидывает IP клиента в callbacks request_tracer/response_manipulator.

Оригинальный pymodbus IP для TCP в эти callbacks не передаёт (addr пустой),
поэтому здесь мы подменяем RequestHandler и ModbusTcpServer.
"""

import asyncio
from typing import Any

from pymodbus.framer import Framer

from .modbus_log import append as modbus_log_append
from pymodbus.server.async_io import (  # type: ignore[import]
    ModbusServerRequestHandler,
    ModbusTcpServer,
    ServerStop as _ServerStop,
    StartAsyncTcpServer as _OrigStartAsyncTcpServer,
    _serverList,
)


class _PatchedRequestHandler(ModbusServerRequestHandler):  # type: ignore[misc]
    """
    RequestHandler, который вытаскивает IP клиента из transport.get_extra_info("peername")
    и передаёт его в *addr для request_tracer/response_manipulator.
    """

    def callback_connected(self) -> None:  # type: ignore[override]
        """Логируем подключение клиента и передаём управление базовой логике."""
        super().callback_connected()
        peer = None
        try:
            if getattr(self, "transport", None) is not None:
                peer = self.transport.get_extra_info("peername")
        except Exception:  # noqa: BLE001
            peer = None
        ip = peer[0] if isinstance(peer, tuple) else "?"
        try:
            modbus_log_append("client_connect", f"{ip}")
        except Exception:  # noqa: BLE001
            pass

    def callback_disconnected(self, call_exc: Exception | None) -> None:  # type: ignore[override]
        """Логируем отключение клиента и вызываем базовую логику."""
        peer = None
        try:
            if getattr(self, "transport", None) is not None:
                peer = self.transport.get_extra_info("peername")
        except Exception:  # noqa: BLE001
            peer = None
        ip = peer[0] if isinstance(peer, tuple) else "?"
        reason = repr(call_exc) if call_exc is not None else "normal"
        try:
            modbus_log_append("client_disconnect", f"{ip} reason={reason}")
        except Exception:  # noqa: BLE001
            pass
        super().callback_disconnected(call_exc)

    def execute(self, request: Any, *addr: Any) -> None:  # noqa: ANN401
        peer = None
        try:
            if getattr(self, "transport", None) is not None:
                peer = self.transport.get_extra_info("peername")
        except Exception:  # noqa: BLE001
            peer = None

        # peer ожидается как (ip, port); в *addr прокидываем именно этот tuple
        addr = (peer,) if isinstance(peer, tuple) else ()

        if self.server.request_tracer:
            self.server.request_tracer(request, *addr)

        asyncio.run_coroutine_threadsafe(self._async_execute(request, *addr), self.loop)

    def server_send(self, message, addr, **kwargs):  # type: ignore[override]
        """
        Переопределяем отправку ответа, чтобы залогировать HEX‑ответ с IP клиента.
        """
        try:
            peer = addr if isinstance(addr, tuple) else None
            client_ip = peer[0] if isinstance(peer, tuple) and peer else "?"
            try:
                pdu = message.encode()
                hex_str = pdu.hex(" ")
            except Exception:  # noqa: BLE001
                hex_str = "<no hex>"
            fc = getattr(message, "function_code", "?")
            unit = getattr(message, "slave_id", "?")
            msg = f"{client_ip} ← HEX RSP unit={unit} func={fc} hex={hex_str}"
            modbus_log_append("modbus_rsp_hex", msg)
        except Exception:  # noqa: BLE001
            pass
        # дальше даём базовому классу реально отправить ответ
        return super().server_send(message, addr, **kwargs)


class _PatchedModbusTcpServer(ModbusTcpServer):  # type: ignore[misc]
    """TCP‑сервер, который использует _PatchedRequestHandler для новых подключений."""

    def callback_new_connection(self):  # type: ignore[override]
        return _PatchedRequestHandler(self)


async def StartAsyncTcpServer(  # noqa: N802
    context=None,
    identity=None,
    address=None,
    custom_functions=None,
    **kwargs,
):
    """
    Async‑обёртка TCP‑сервера, аналогичная оригинальной StartAsyncTcpServer,
    но использующая _PatchedModbusTcpServer.
    """
    if custom_functions is None:
        custom_functions = []
    # Совместимость с сигнатурой pymodbus: host выпиливается, framer по умолчанию SOCKET.
    kwargs.pop("host", None)
    server = _PatchedModbusTcpServer(
        context,
        kwargs.pop("framer", Framer.SOCKET),
        identity,
        address,
        **kwargs,
    )
    await _serverList.run(server, custom_functions)  # type: ignore[arg-type]


def StartTcpServer(**kwargs):  # noqa: N802
    """
    Синхронная обёртка вокруг StartAsyncTcpServer, по контракту pymodbus.
    Используется нашим backend’ом.
    """
    return asyncio.run(StartAsyncTcpServer(**kwargs))


def ServerStop() -> None:  # noqa: N802
    """Просто делегируем в оригинальный ServerStop."""
    _ServerStop()

