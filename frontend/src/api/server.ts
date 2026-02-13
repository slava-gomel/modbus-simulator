import { api } from "./client";
import { ServerStatus, ModbusLogEntry, ModbusConfigDto } from "./types";

/**
 * Получить конфигурацию Modbus
 */
export async function fetchConfig(): Promise<ModbusConfigDto> {
  const { data } = await api.get<ModbusConfigDto>("/config");
  return data;
}

/**
 * Обновить конфигурацию Modbus
 */
export async function updateConfig(cfg: ModbusConfigDto): Promise<ModbusConfigDto> {
  const { data } = await api.put<ModbusConfigDto>("/config", cfg);
  return data;
}

/**
 * Получить статус сервера
 */
export async function fetchServerStatus(): Promise<ServerStatus> {
  const { data } = await api.get<ServerStatus>("/server/status");
  return data;
}

/**
 * Запустить сервер
 */
export async function startServer(): Promise<ServerStatus> {
  const { data } = await api.post<ServerStatus>("/server/start");
  return data;
}

/**
 * Остановить сервер
 */
export async function stopServer(): Promise<ServerStatus> {
  const { data } = await api.post<ServerStatus>("/server/stop");
  return data;
}

/**
 * Получить лог Modbus событий
 */
export async function fetchModbusLog(
  since: number
): Promise<{ events: ModbusLogEntry[]; next_id: number }> {
  const { data } = await api.get<{ events: ModbusLogEntry[]; next_id: number }>(
    "/server/modbus_log",
    {
      params: { since }
    }
  );
  return data;
}

/**
 * Проверить, требуется ли авторизация
 */
export async function authRequired(): Promise<{ required: boolean }> {
  const { data } = await api.get<{ required: boolean }>("/auth/required");
  return data;
}
