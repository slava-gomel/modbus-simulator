import axios from "axios";

const api = axios.create({
  baseURL: "/api"
});

export interface ModbusConfigDto {
  host: string;
  port: number;
  unit_id: number;
  coils_size: number;
  discrete_inputs_size: number;
  holding_registers_size: number;
  input_registers_size: number;
}

export type RegisterKind = "coils" | "discrete_inputs" | "holding" | "input";

export interface RegisterRangeResponse {
  kind: RegisterKind;
  start: number;
  values: number[];
}

export interface ServerStatus {
  running: boolean;
  host: string;
  port: number;
}

export async function fetchConfig(): Promise<ModbusConfigDto> {
  const { data } = await api.get<ModbusConfigDto>("/config");
  return data;
}

export async function updateConfig(cfg: ModbusConfigDto): Promise<ModbusConfigDto> {
  const { data } = await api.put<ModbusConfigDto>("/config", cfg);
  return data;
}

export async function fetchRegisters(
  kind: RegisterKind,
  start: number,
  count: number
): Promise<RegisterRangeResponse> {
  const { data } = await api.get<RegisterRangeResponse>(`/state/${kind}`, {
    params: { start, count }
  });
  return data;
}

export async function writeSingle(
  kind: "coils" | "holding",
  address: number,
  value: number
): Promise<RegisterRangeResponse> {
  const { data } = await api.put<RegisterRangeResponse>(`/state/${kind}`, null, {
    params: { start: address, value }
  });
  return data;
}

export async function writeBatch(
  kind: "coils" | "holding",
  start: number,
  values: number[]
): Promise<RegisterRangeResponse> {
  const { data } = await api.put<RegisterRangeResponse>(`/state/${kind}/batch`, {
    start,
    count: values.length,
    values
  });
  return data;
}

export async function fetchServerStatus(): Promise<ServerStatus> {
  const { data } = await api.get<ServerStatus>("/server/status");
  return data;
}

export async function startServer(): Promise<ServerStatus> {
  const { data } = await api.post<ServerStatus>("/server/start");
  return data;
}

export async function stopServer(): Promise<ServerStatus> {
  const { data } = await api.post<ServerStatus>("/server/stop");
  return data;
}

