// Константы приложения

export const MAX_LOG_ENTRIES = 300;
export const GENERATOR_CHART_MAX_SAMPLES = 80;
export const DEFAULT_NEON_COLOR = "#3b82f6";
export const REGISTER_FLASH_DURATION_MS = 3000;

export const LOG_COLORS: Record<string, string> = {
  error: "#fca5a5",
  server_start: "#4ade80",
  server_stop: "#fdba74",
  client_connect: "#6ee7b7",
  client_disconnect: "#f97316",
  generator_create: "#67e8f9",
  generator_edit: "#7dd3fc",
  generator_enable: "#4ade80",
  generator_disable: "#fdba74",
  generator_delete: "#f87171",
  generator_load: "#38bdf8",
  profile_save: "#e5e7eb",
  profile_load: "#e5e7eb",
  profile_update: "#e5e7eb",
  modbus_request: "#93c5fd",
  modbus_response: "#9ca3af",
  modbus_req_hex: "#7dd3fc",
  modbus_rsp_hex: "#a5b4fc",
  request: "#93c5fd",
  response: "#9ca3af",
  info: "#e5e7eb"
};

export type LogCategory = "error" | "server" | "modbus" | "generator" | "profile";

export const LOG_TYPE_CATEGORIES: Record<string, LogCategory> = {
  error: "error",
  server_start: "server",
  server_stop: "server",
  client_connect: "server",
  client_disconnect: "server",
  generator_create: "generator",
  generator_edit: "generator",
  generator_enable: "generator",
  generator_disable: "generator",
  generator_delete: "generator",
  generator_load: "generator",
  profile_save: "profile",
  profile_load: "profile",
  profile_update: "profile",
  modbus_request: "modbus",
  modbus_response: "modbus",
  modbus_req_hex: "modbus",
  modbus_rsp_hex: "modbus",
  modbus_write: "modbus",
  request: "modbus",
  response: "modbus",
};
