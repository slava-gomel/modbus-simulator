import { RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";

/**
 * Результат конвертации строки в регистры
 */
export interface ConversionResult {
  registers: number[];
  error?: string;
}

/**
 * Проверка на пустой/недопустимый ввод
 */
export const isEmptyInput = (text: string): boolean => {
  const trimmed = text.trim();
  return (
    !trimmed ||
    trimmed === "-" ||
    trimmed === "+" ||
    trimmed === "." ||
    trimmed === "," ||
    trimmed === "-." ||
    trimmed === "+." ||
    trimmed === "-," ||
    trimmed === "+,"
  );
};

/**
 * Нормализация строки (замена запятой на точку)
 */
export const normalizeNumericString = (text: string): string => {
  return text.trim().replace(",", ".");
};

/**
 * Конвертация в INT16
 */
export const convertToInt16 = (text: string, sign: RegisterSign): ConversionResult => {
  const normalized = normalizeNumericString(text);
  const n = Number(normalized);
  
  if (!Number.isInteger(n)) {
    return { registers: [], error: "INT16: ожидается целое число" };
  }
  
  let value = n;
  
  if (sign === "unsigned") {
    if (value < 0 || value > 0xffff) {
      return { registers: [], error: "INT16 unsigned: 0..65535" };
    }
  } else {
    if (value < -32768 || value > 32767) {
      return { registers: [], error: "INT16 signed: -32768..32767" };
    }
    if (value < 0) value = 0x10000 + value;
  }
  
  return { registers: [value] };
};

/**
 * Конвертация в BITMAP
 */
export const convertToBitmap = (text: string): ConversionResult => {
  const trimmed = text.trim();
  let value: number;
  
  // Поддержка бинарной маски (строка из 0 и 1)
  if (/^[01]{1,16}$/.test(trimmed)) {
    value = parseInt(trimmed, 2);
  } else {
    const normalized = normalizeNumericString(text);
    const n = Number(normalized);
    if (!Number.isInteger(n)) {
      return { registers: [], error: "BITMAP: ожидается целое число или 16‑битная маска" };
    }
    value = n;
  }
  
  if (value < 0 || value > 0xffff) {
    return { registers: [], error: "BITMAP: значение должно быть в диапазоне 0..65535" };
  }
  
  return { registers: [value] };
};

/**
 * Конвертация в INT32
 */
export const convertToInt32 = (
  text: string,
  sign: RegisterSign,
  order: RegisterOrder
): ConversionResult => {
  const normalized = normalizeNumericString(text);
  const n = Number(normalized);
  
  if (!Number.isInteger(n)) {
    return { registers: [], error: "INT32: ожидается целое число" };
  }
  
  let bigint = BigInt(n);
  
  if (sign === "unsigned") {
    if (bigint < 0n || bigint > 0xffffffffn) {
      return { registers: [], error: "INT32 unsigned: 0..2^32-1" };
    }
  } else {
    const min = -(1n << 31n);
    const max = (1n << 31n) - 1n;
    if (bigint < min || bigint > max) {
      return { registers: [], error: "INT32 signed: -2^31..2^31-1" };
    }
    if (bigint < 0n) bigint = (1n << 32n) + bigint;
  }
  
  const u32 = Number(bigint & 0xffffffffn);
  let w0 = (u32 >>> 16) & 0xffff;
  let w1 = u32 & 0xffff;
  
  if (order === "CDAB") {
    [w0, w1] = [w1, w0];
  }
  
  return { registers: [w0, w1] };
};

/**
 * Конвертация в FLOAT32
 */
export const convertToFloat32 = (text: string, order: RegisterOrder): ConversionResult => {
  const normalized = normalizeNumericString(text);
  const f = Number(normalized);
  
  if (!Number.isFinite(f)) {
    return { registers: [], error: "FLOAT32: ожидается число" };
  }
  
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setFloat32(0, f);
  const u32 = view.getUint32(0);
  
  let w0 = (u32 >>> 16) & 0xffff;
  let w1 = u32 & 0xffff;
  
  if (order === "CDAB") {
    [w0, w1] = [w1, w0];
  }
  
  return { registers: [w0, w1] };
};

/**
 * Конвертация в INT64
 */
export const convertToInt64 = (
  text: string,
  sign: RegisterSign,
  order: RegisterOrder
): ConversionResult => {
  const normalized = normalizeNumericString(text);
  let bigint: bigint;
  
  try {
    bigint = BigInt(normalized);
  } catch {
    return { registers: [], error: "INT64: ожидается целое число" };
  }
  
  if (sign === "unsigned") {
    if (bigint < 0n || bigint > (1n << 64n) - 1n) {
      return { registers: [], error: "INT64 unsigned: 0..2^64-1" };
    }
  } else {
    const min = -(1n << 63n);
    const max = (1n << 63n) - 1n;
    if (bigint < min || bigint > max) {
      return { registers: [], error: "INT64 signed: -2^63..2^63-1" };
    }
    if (bigint < 0n) bigint = (1n << 64n) + bigint;
  }
  
  const words: number[] = [];
  let tmp = bigint;
  for (let i = 0; i < 4; i += 1) {
    words.unshift(Number(tmp & 0xffffn));
    tmp >>= 16n;
  }
  
  let regs = [...words];
  if (order === "CDAB") {
    regs = [regs[2], regs[3], regs[0], regs[1]];
  }
  
  return { registers: regs };
};

/**
 * Конвертация в FLOAT64
 */
export const convertToFloat64 = (text: string, order: RegisterOrder): ConversionResult => {
  const normalized = normalizeNumericString(text);
  const f = Number(normalized);
  
  if (!Number.isFinite(f)) {
    return { registers: [], error: "FLOAT64: ожидается число" };
  }
  
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, f);
  
  const words: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    words.push(view.getUint16(i * 2));
  }
  
  let regs = [...words];
  if (order === "CDAB") {
    regs = [regs[2], regs[3], regs[0], regs[1]];
  }
  
  return { registers: regs };
};

/**
 * Универсальная функция конвертации строки в регистры
 */
export const convertStringToRegisters = (
  text: string,
  format: RegisterFormatKind,
  sign: RegisterSign,
  order: RegisterOrder
): ConversionResult => {
  if (format === "int16") return convertToInt16(text, sign);
  if (format === "bitmap") return convertToBitmap(text);
  if (format === "int32") return convertToInt32(text, sign, order);
  if (format === "int64") return convertToInt64(text, sign, order);
  if (format === "float32") return convertToFloat32(text, order);
  if (format === "float64") return convertToFloat64(text, order);
  
  return { registers: [], error: "Неизвестный формат" };
};
