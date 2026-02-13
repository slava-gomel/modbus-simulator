// Типы для журнала событий
export type AppLogEntry = {
  type: string;
  message: string;
  time: string;
  ip?: string;
};

export type LogFilterKey = "modbus" | "server" | "generators" | "profiles" | "errors";
