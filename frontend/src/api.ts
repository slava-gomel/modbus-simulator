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

