import React, { createContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { ServerStatus, fetchServerStatus, startServer, stopServer, fetchModbusLog } from "../../api";
import { useLogsContext } from "../logs";
import { usePolling } from "../../shared/hooks";
import { SERVER_STATUS_POLL_MS, MODBUS_LOG_POLL_MS } from "../../shared/constants";

interface ServerContextValue {
  serverStatus: ServerStatus | null;
  serverLoading: boolean;
  handleServerStart: () => Promise<void>;
  handleServerStop: () => Promise<void>;
  refreshServerStatus: () => Promise<void>;
  onModbusWrite?: (kind: "coils" | "holding", start: number, count: number) => void;
}

const ServerContext = createContext<ServerContextValue | undefined>(undefined);

export const ServerProvider: React.FC<{ 
  children: ReactNode;
  onModbusWrite?: (kind: "coils" | "holding", start: number, count: number) => void;
}> = ({ children, onModbusWrite }) => {
  const { pushLog } = useLogsContext();
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const prevServerRunningRef = useRef<boolean | null>(null);
  const modbusLogSinceRef = useRef<number>(0);

  const refreshServerStatus = useCallback(async () => {
    try {
      const status = await fetchServerStatus();
      setServerStatus(status);
    } catch {
      setServerStatus(null);
    }
  }, []);

  const handleServerStart = useCallback(async () => {
    pushLog("server_start", "Запрос на запуск Modbus-сервера отправлен");
    try {
      setServerLoading(true);
      const status = await startServer();
      prevServerRunningRef.current = status.running;
      setServerStatus(status);
      if (status.running) {
        pushLog("server_start", `Сервер Modbus запущен (${status.host}:${status.port})`);
      }
      if (status.error) pushLog("error", status.error);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка запуска сервера";
      pushLog("error", msg);
      const status = await fetchServerStatus().catch(() => null);
      if (status) setServerStatus(status);
    } finally {
      setServerLoading(false);
    }
  }, [pushLog]);

  const handleServerStop = useCallback(async () => {
    pushLog("server_stop", "Запрос на остановку Modbus-сервера отправлен");
    try {
      setServerLoading(true);
      const status = await stopServer();
      prevServerRunningRef.current = status.running;
      setServerStatus(status);
      if (!status.running) {
        pushLog("server_stop", "Сервер Modbus остановлен");
      } else if (status.error) {
        pushLog("error", status.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка остановки сервера";
      pushLog("error", msg);
      const status = await fetchServerStatus().catch(() => null);
      if (status) setServerStatus(status);
    } finally {
      setServerLoading(false);
    }
  }, [pushLog]);

  // Автообновление статуса Modbus-сервера
  usePolling(
    async () => {
      if (serverLoading) return;
      try {
        const status = await fetchServerStatus();
        const wasRunning = prevServerRunningRef.current;
        prevServerRunningRef.current = status.running;
        setServerStatus(status);
        if (wasRunning === true && !status.running) {
          const msg = status.error
            ? `Сервер Modbus остановился: ${status.error}`
            : "Сервер Modbus остановился (поток завершился)";
          pushLog("server_stop", msg);
        }
      } catch {
        prevServerRunningRef.current = false;
        setServerStatus(null);
      }
    },
    SERVER_STATUS_POLL_MS,
    [serverLoading, pushLog]
  );

  // Опрос лога Modbus (запросы/ответы), когда сервер запущен
  usePolling(
    async () => {
      if (!serverStatus?.running) return;
      try {
        const { events, next_id } = await fetchModbusLog(modbusLogSinceRef.current);
        modbusLogSinceRef.current = next_id;
        for (const e of events) {
          // Лог в панель событий
          window.dispatchEvent(
            new CustomEvent("app:log", { detail: { type: e.type, message: e.message } })
          );
          // Точное событие изменения от Modbus: структурированные поля kind/start/count
          if (e.type === "modbus_write" && typeof e.start === "number" && typeof e.count === "number") {
            const kind = e.kind === "coils" || e.kind === "holding" ? e.kind : null;
            if (kind && onModbusWrite) {
              onModbusWrite(kind, e.start, e.count);
            }
          }
        }
      } catch {
        // игнорируем ошибки опроса лога
      }
    },
    serverStatus?.running ? MODBUS_LOG_POLL_MS : null,
    [serverStatus?.running, onModbusWrite]
  );

  return (
    <ServerContext.Provider
      value={{
        serverStatus,
        serverLoading,
        handleServerStart,
        handleServerStop,
        refreshServerStatus
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = (): ServerContextValue => {
  const context = React.useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within ServerProvider");
  }
  return context;
};
