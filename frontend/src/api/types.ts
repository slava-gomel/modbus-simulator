export type RegisterKind = "coils" | "discrete_inputs" | "holding" | "input";

export interface RegisterRangeResponse {
  kind: RegisterKind;
  start: number;
  values: number[];
}

export interface ModbusConfigDto {
  host: string;
  port: number;
  unit_id: number;
  coils_size: number;
  discrete_inputs_size: number;
  holding_registers_size: number;
  input_registers_size: number;
}

export interface ModbusLogEntry {
  id: number;
  type: string;
  message: string;
  time: string;
  kind?: string;
  start?: number;
  count?: number;
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

export interface ProfileItem {
  name: string;
  slug: string;
  comment: string;
}
