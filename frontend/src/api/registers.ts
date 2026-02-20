import { api } from "./client";
import { RegisterKind, RegisterRangeResponse } from "./types";

/**
 * Получить диапазон регистров
 */
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

/**
 * Записать одно значение в регистр (coils, holding или input).
 * Для input запись поддерживается только во внутреннем REST API симулятора.
 */
export async function writeSingle(
  kind: "coils" | "holding" | "input",
  address: number,
  value: number
): Promise<RegisterRangeResponse> {
  const { data } = await api.put<RegisterRangeResponse>(`/state/${kind}`, null, {
    params: { start: address, value }
  });
  return data;
}

/**
 * Пакетная запись регистров
 */
export async function writeBatch(
  kind: "coils" | "holding" | "input",
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
