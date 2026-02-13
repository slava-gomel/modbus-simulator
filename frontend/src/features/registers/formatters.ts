import { RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";

/**
 * Форматирование значения регистра в строку для отображения
 */
export const formatRegisterValue = (
  globalIndex: number,
  raw: number,
  values: number[],
  registerFormatKind: RegisterFormatKind,
  registerSign: RegisterSign,
  registerOrder: RegisterOrder
): string => {
  const v = Number.isFinite(raw) ? raw : 0;
  const unsigned16 = v & 0xffff;

  if (registerFormatKind === "bitmap") {
    return unsigned16.toString(2).padStart(16, "0");
  }

  if (registerFormatKind === "int16") {
    if (registerSign === "unsigned") {
      return String(unsigned16);
    }
    const signed = v & 0x8000 ? v - 0x10000 : v;
    return String(signed);
  }

  if (registerFormatKind === "int32") {
    const evenIndex = globalIndex % 2 === 0 ? globalIndex : globalIndex - 1;
    const i0 = evenIndex;
    const i1 = evenIndex + 1;
    if (i1 >= values.length) return String(unsigned16);
    let w0 = values[i0] & 0xffff;
    let w1 = values[i1] & 0xffff;
    if (registerOrder === "CDAB") {
      [w0, w1] = [w1, w0];
    }
    const u32 = (w0 << 16) | w1;
    if (registerSign === "unsigned") {
      return String(u32 >>> 0);
    }
    const s32 = u32 & 0x80000000 ? u32 - 0x100000000 : u32;
    return String(s32);
  }

  if (registerFormatKind === "int64") {
    const groupBase = globalIndex - (globalIndex % 4);
    const idx = [groupBase, groupBase + 1, groupBase + 2, groupBase + 3];
    if (idx[3] >= values.length) return String(unsigned16);
    let regs = idx.map((i) => values[i] & 0xffff);
    if (registerOrder === "CDAB") {
      regs = [regs[2], regs[3], regs[0], regs[1]];
    }
    let acc = 0n;
    for (const r of regs) {
      acc = (acc << 16n) | BigInt(r);
    }
    if (registerSign === "unsigned") {
      return acc.toString();
    }
    const bit63 = 1n << 63n;
    const mod64 = 1n << 64n;
    if (acc & bit63) {
      acc = acc - mod64;
    }
    return acc.toString();
  }

  if (registerFormatKind === "float32") {
    const evenIndex = globalIndex % 2 === 0 ? globalIndex : globalIndex - 1;
    const i0 = evenIndex;
    const i1 = evenIndex + 1;
    if (i1 >= values.length) return String(unsigned16);
    let w0 = values[i0] & 0xffff;
    let w1 = values[i1] & 0xffff;
    if (registerOrder === "CDAB") {
      [w0, w1] = [w1, w0];
    }
    const word = (w0 << 16) | w1;
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, word >>> 0);
    const f = view.getFloat32(0);
    return Number.isFinite(f) ? f.toString() : "NaN";
  }

  if (registerFormatKind === "float64") {
    const groupBase = globalIndex - (globalIndex % 4);
    const idx = [groupBase, groupBase + 1, groupBase + 2, groupBase + 3];
    if (idx[3] >= values.length) return String(unsigned16);
    let regs = idx.map((i) => values[i] & 0xffff);
    if (registerOrder === "CDAB") {
      regs = [regs[2], regs[3], regs[0], regs[1]];
    }
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint16(0, regs[0]);
    view.setUint16(2, regs[1]);
    view.setUint16(4, regs[2]);
    view.setUint16(6, regs[3]);
    const f = view.getFloat64(0);
    return Number.isFinite(f) ? f.toString() : "NaN";
  }

  return String(unsigned16);
};

/**
 * Вычисление размера группы регистров в зависимости от формата
 */
export const getFormatGroupSize = (format: RegisterFormatKind): number => {
  if (format === "int32" || format === "float32") return 2;
  if (format === "int64" || format === "float64") return 4;
  return 1;
};

/**
 * Создание ключа для отслеживания изменений регистра
 */
export const makeRegisterKey = (kind: "coils" | "holding", addr: number): string =>
  `${kind}:${addr}`;
