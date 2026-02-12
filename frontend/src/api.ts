import axios from "axios";

const api = axios.create({
  baseURL: "/api"
});

api.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:required"));
    }
    return Promise.reject(err);
  }
);

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

export type SignalWaveType = "sine" | "saw" | "square" | "constant";
export type SignalDataType = "int16" | "float32" | "float64";

export interface SignalGeneratorConfig {
  id: string;
  enabled: boolean;
  name?: string | null;
  register_kind: "holding";
  start_address: number;
  register_count: number;
  data_type: SignalDataType;
  wave_type: SignalWaveType;
  amplitude: number;
  offset: number;
  frequency_hz: number;
  update_period_ms: number;
  /** Цвет неоновой подсветки рамки значения (hex, например #00ff88). */
  neon_color?: string | null;
}

export interface GeneratorsPayload {
  generators: SignalGeneratorConfig[];
}

export interface ServerStatus {
  running: boolean;
  host: string;
  port: number;
  error?: string | null;
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

export interface ModbusLogEntry {
  id: number;
  type: string;
  message: string;
  time: string;
}

export async function fetchModbusLog(since: number): Promise<{ events: ModbusLogEntry[]; next_id: number }> {
  const { data } = await api.get<{ events: ModbusLogEntry[]; next_id: number }>("/server/modbus_log", {
    params: { since }
  });
  return data;
}

export async function fetchSignalGenerators(): Promise<SignalGeneratorConfig[]> {
  const { data } = await api.get<GeneratorsPayload>("/generators");
  return data.generators;
}

export async function saveSignalGenerators(generators: SignalGeneratorConfig[]): Promise<SignalGeneratorConfig[]> {
  const { data } = await api.put<GeneratorsPayload>("/generators", { generators });
  return data.generators;
}

export async function startServer(): Promise<ServerStatus> {
  const { data } = await api.post<ServerStatus>("/server/start");
  return data;
}

export async function stopServer(): Promise<ServerStatus> {
  const { data } = await api.post<ServerStatus>("/server/stop");
  return data;
}

export interface ProfileItem {
  name: string;
  slug: string;
  comment: string;
}

export async function listProfiles(): Promise<ProfileItem[]> {
  const { data } = await api.get<ProfileItem[]>("/profiles");
  return data;
}

export async function saveProfile(name: string, comment?: string): Promise<{ slug: string; name: string }> {
  const { data } = await api.post<{ slug: string; name: string }>("/profiles", { name, comment: comment ?? "" });
  return data;
}

export async function loadProfile(slug: string): Promise<{ slug: string; loaded: boolean }> {
  const { data } = await api.post<{ slug: string; loaded: boolean }>(`/profiles/${slug}/load`);
  return data;
}

export async function deleteProfile(slug: string): Promise<void> {
  await api.delete(`/profiles/${slug}`);
}

export async function updateProfile(slug: string, comment?: string): Promise<{ slug: string; updated: boolean }> {
  const payload = comment !== undefined ? { comment } : {};
  const { data } = await api.post<{ slug: string; updated: boolean }>(`/profiles/${slug}/update`, payload);
  return data;
}

export async function authRequired(): Promise<{ required: boolean }> {
  const { data } = await api.get<{ required: boolean }>("/auth/required");
  return data;
}

export function setAuth(username: string, password: string): void {
  api.defaults.auth = { username, password };
}

