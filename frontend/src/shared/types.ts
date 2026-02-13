// Общие типы приложения

export type RegisterKind = "coils" | "discrete_inputs" | "holding" | "input";

export type RegisterFormatKind = "int16" | "int32" | "int64" | "float32" | "float64" | "bitmap";
export type RegisterSign = "signed" | "unsigned";
export type RegisterOrder = "ABCD" | "CDAB";

export type AppLogEntry = { 
  type: string; 
  message: string; 
  time: string; 
  ip?: string;
};

export type LogFilterKey = "modbus" | "server" | "generators" | "profiles" | "errors";

export const REGISTER_KINDS: { id: RegisterKind; label: string }[] = [
  { id: "coils", label: "Coils (01/05)" },
  { id: "discrete_inputs", label: "Discrete Inputs (02)" },
  { id: "holding", label: "Holding Registers (03/06)" },
  { id: "input", label: "Input Registers (04)" }
];
