import React, { createContext, useState, useCallback, ReactNode, useRef } from "react";
import { RegisterKind, RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";
import { fetchRegisters, writeSingle, writeBatch } from "../../api";
import { useLogsContext } from "../logs";
import { usePolling } from "../../shared/hooks";
import { REGISTERS_AUTO_REFRESH_MS, REGISTER_FLASH_DURATION_MS } from "../../shared/constants";
import { makeRegisterKey, getFormatGroupSize } from "./formatters";

interface RegistersContextValue {
  selectedKind: RegisterKind;
  start: number;
  count: number;
  values: number[];
  stateLoading: boolean;
  stateError: string | null;
  registerFormatKind: RegisterFormatKind;
  registerSign: RegisterSign;
  registerOrder: RegisterOrder;
  editHolding: Record<number, string>;
  recentRegisterChanges: Record<string, number>;
  columnsPerRow: number;
  setSelectedKind: (kind: RegisterKind) => void;
  setStart: (start: number) => void;
  setCount: (count: number) => void;
  setValues: (values: number[]) => void;
  setRegisterFormatKind: (kind: RegisterFormatKind) => void;
  setRegisterSign: (sign: RegisterSign) => void;
  setRegisterOrder: (order: RegisterOrder) => void;
  setEditHolding: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  reloadRegisters: (silent?: boolean) => Promise<void>;
  handleCellChange: (index: number, newValue: number) => Promise<void>;
  handleHoldingValueChange: (globalIndex: number, text: string) => Promise<void>;
  handleBatchSave: () => Promise<void>;
  handlePresetApply: (newValues: number[]) => Promise<void>;
  markRegistersChanged: (kind: "coils" | "holding", addrStart: number, count: number) => void;
  isRegisterRecentlyChanged: (kind: "coils" | "holding", addr: number) => boolean;
}

const RegistersContext = createContext<RegistersContextValue | undefined>(undefined);

export const RegistersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pushLog } = useLogsContext();
  
  const [selectedKind, setSelectedKind] = useState<RegisterKind>("holding");
  const [start, setStart] = useState(0);
  const [count, setCount] = useState(16);
  const [values, setValues] = useState<number[]>([]);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  
  const [registerFormatKind, setRegisterFormatKind] = useState<RegisterFormatKind>("int16");
  const [registerSign, setRegisterSign] = useState<RegisterSign>("unsigned");
  const [registerOrder, setRegisterOrder] = useState<RegisterOrder>("ABCD");
  
  const [editHolding, setEditHolding] = useState<Record<number, string>>({});
  const [recentRegisterChanges, setRecentRegisterChanges] = useState<Record<string, number>>({});
  
  const columnsPerRow = 8;

  const reloadRegisters = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setStateLoading(true);
        setStateError(null);
      }
      const data = await fetchRegisters(selectedKind, start, count);
      setValues(data.values);
    } catch (e) {
      if (!silent) {
        setStateError("Не удалось загрузить значения регистров");
        pushLog("error", "Загрузка регистров: ошибка");
      }
    } finally {
      if (!silent) setStateLoading(false);
    }
  }, [selectedKind, start, count, pushLog]);

  // Автообновление значений регистров
  usePolling(
    () => reloadRegisters(true),
    REGISTERS_AUTO_REFRESH_MS,
    [selectedKind, start, count]
  );

  const handleCellChange = useCallback(async (index: number, newValue: number) => {
    const addr = start + index;
    if (selectedKind === "discrete_inputs" || selectedKind === "input") {
      return;
    }
    try {
      setStateError(null);
      const resp = await writeSingle(
        selectedKind === "coils" ? "coils" : "holding",
        addr,
        newValue
      );
      const updated = [...values];
      updated[index] = resp.values[0];
      setValues(updated);
    } catch (e) {
      setStateError("Не удалось записать значение");
      pushLog("error", "Запись регистра: ошибка");
    }
  }, [start, selectedKind, values, pushLog]);

  const handleBatchSave = useCallback(async () => {
    if (values.length === 0) return;
    if (selectedKind !== "coils" && selectedKind !== "holding") return;
    try {
      setStateError(null);
      await writeBatch(
        selectedKind === "coils" ? "coils" : "holding",
        start,
        values
      );
      await reloadRegisters();
    } catch (e) {
      setStateError("Не удалось выполнить пакетную запись");
      pushLog("error", "Пакетная запись: ошибка");
    }
  }, [values, selectedKind, start, reloadRegisters, pushLog]);

  const handlePresetApply = useCallback(async (newValues: number[]) => {
    if (newValues.length === 0 || (selectedKind !== "coils" && selectedKind !== "holding")) return;
    try {
      setStateError(null);
      await writeBatch(selectedKind === "coils" ? "coils" : "holding", start, newValues);
      setValues(newValues);
    } catch (e) {
      setStateError("Не удалось применить пресет");
      pushLog("error", "Пресет: ошибка");
    }
  }, [selectedKind, start, pushLog]);

  const markRegistersChanged = useCallback((kind: "coils" | "holding", addrStart: number, count: number) => {
    const keys = Array.from({ length: count }, (_, i) => makeRegisterKey(kind, addrStart + i));

    setRecentRegisterChanges((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        next[key] = (next[key] ?? 0) + 1;
      }
      return next;
    });

    window.setTimeout(() => {
      setRecentRegisterChanges((prev) => {
        const next = { ...prev };
        for (const key of keys) {
          const current = next[key];
          if (current === undefined) continue;
          if (current <= 1) {
            delete next[key];
          } else {
            next[key] = current - 1;
          }
        }
        return next;
      });
    }, REGISTER_FLASH_DURATION_MS);
  }, []);

  const isRegisterRecentlyChanged = useCallback((kind: "coils" | "holding", addr: number): boolean =>
    !!recentRegisterChanges[makeRegisterKey(kind, addr)],
    [recentRegisterChanges]
  );

  const handleHoldingValueChange = useCallback(async (globalIndex: number, text: string) => {
    if (selectedKind !== "holding") return;
    
    setEditHolding((prev) => ({ ...prev, [globalIndex]: text }));

    const trimmed = (text ?? "").trim();
    const normalized = trimmed.replace(",", ".");

    const groupSize = getFormatGroupSize(registerFormatKind);

    const rowIndex = Math.floor(globalIndex / columnsPerRow);
    const colIndex = globalIndex % columnsPerRow;
    const groupBaseIndex =
      groupSize === 1 ? globalIndex : rowIndex * columnsPerRow + Math.floor(colIndex / groupSize) * groupSize;
    const baseAddr = start + groupBaseIndex;

    const applyZero = async () => {
      try {
        if (groupSize === 1) {
          const resp = await writeSingle("holding", baseAddr, 0);
          const updated = [...values];
          updated[groupBaseIndex] = resp.values[0];
          setValues(updated);
        } else {
          const regs = new Array(groupSize).fill(0);
          await writeBatch("holding", baseAddr, regs);
          const updated = [...values];
          for (let i = 0; i < regs.length; i += 1) {
            if (groupBaseIndex + i < updated.length) updated[groupBaseIndex + i] = regs[i];
          }
          setValues(updated);
        }
      } finally {
        setEditHolding((prev) => {
          const next = { ...prev };
          delete next[globalIndex];
          return next;
        });
      }
    };

    // Пустое или "сырая" строка → пишем 0
    if (
      !trimmed ||
      trimmed === "-" ||
      trimmed === "+" ||
      trimmed === "." ||
      trimmed === "," ||
      trimmed === "-." ||
      trimmed === "+." ||
      trimmed === "-," ||
      trimmed === "+,"
    ) {
      await applyZero();
      return;
    }

    try {
      setStateError(null);

      // BITMAP
      if (registerFormatKind === "bitmap") {
        let value: number;
        if (/^[01]{1,16}$/.test(trimmed)) {
          value = parseInt(trimmed, 2);
        } else {
          const n = Number(normalized);
          if (!Number.isInteger(n)) throw new Error("BITMAP: ожидается целое число или 16‑битная маска");
          value = n;
        }
        if (value < 0 || value > 0xffff) throw new Error("BITMAP: значение должно быть в диапазоне 0..65535");
        const resp = await writeSingle("holding", baseAddr, value);
        const updated = [...values];
        updated[groupBaseIndex] = resp.values[0];
        setValues(updated);
        setEditHolding((prev) => {
          const next = { ...prev };
          delete next[globalIndex];
          return next;
        });
        return;
      }

      // INT16
      if (registerFormatKind === "int16") {
        const n = Number(normalized);
        if (!Number.isInteger(n)) throw new Error("INT16: ожидается целое число");
        let value = n;
        if (registerSign === "unsigned") {
          if (value < 0 || value > 0xffff) throw new Error("INT16 unsigned: 0..65535");
        } else {
          if (value < -32768 || value > 32767) throw new Error("INT16 signed: -32768..32767");
          if (value < 0) value = 0x10000 + value;
        }
        const resp = await writeSingle("holding", baseAddr, value);
        const updated = [...values];
        updated[groupBaseIndex] = resp.values[0];
        setValues(updated);
        setEditHolding((prev) => {
          const next = { ...prev };
          delete next[globalIndex];
          return next;
        });
        return;
      }

      // INT32 / FLOAT32
      if (groupSize === 2 && (registerFormatKind === "int32" || registerFormatKind === "float32")) {
        const slice = values.slice(groupBaseIndex, groupBaseIndex + 2);
        if (slice.length < 2) throw new Error("Недостаточно регистров для 32‑битного значения");

        let regs: number[] = [];
        if (registerFormatKind === "int32") {
          const n = Number(normalized);
          if (!Number.isInteger(n)) throw new Error("INT32: ожидается целое число");
          let bigint = BigInt(n);
          if (registerSign === "unsigned") {
            if (bigint < 0n || bigint > 0xffffffffn) throw new Error("INT32 unsigned: 0..2^32-1");
          } else {
            const min = -(1n << 31n);
            const max = (1n << 31n) - 1n;
            if (bigint < min || bigint > max) throw new Error("INT32 signed: -2^31..2^31-1");
            if (bigint < 0n) bigint = (1n << 32n) + bigint;
          }
          const u32 = Number(bigint & 0xffffffffn);
          let w0 = (u32 >>> 16) & 0xffff;
          let w1 = u32 & 0xffff;
          if (registerOrder === "CDAB") {
            [w0, w1] = [w1, w0];
          }
          regs = [w0, w1];
        } else {
          const f = Number(normalized);
          if (!Number.isFinite(f)) throw new Error("FLOAT32: ожидается число");
          const buf = new ArrayBuffer(4);
          const view = new DataView(buf);
          view.setFloat32(0, f);
          const u32 = view.getUint32(0);
          let w0 = (u32 >>> 16) & 0xffff;
          let w1 = u32 & 0xffff;
          if (registerOrder === "CDAB") {
            [w0, w1] = [w1, w0];
          }
          regs = [w0, w1];
        }

        await writeBatch("holding", baseAddr, regs);
        const updated = [...values];
        for (let i = 0; i < regs.length; i += 1) {
          if (groupBaseIndex + i < updated.length) updated[groupBaseIndex + i] = regs[i];
        }
        setValues(updated);
        setEditHolding((prev) => {
          const next = { ...prev };
          delete next[globalIndex];
          return next;
        });
        return;
      }

      // INT64 / FLOAT64
      if (groupSize === 4 && (registerFormatKind === "int64" || registerFormatKind === "float64")) {
        const slice = values.slice(groupBaseIndex, groupBaseIndex + 4);
        if (slice.length < 4) throw new Error("Недостаточно регистров для 64‑битного значения");

        let regs: number[] = [];
        if (registerFormatKind === "int64") {
          let bigint: bigint;
          try {
            bigint = BigInt(normalized);
          } catch {
            throw new Error("INT64: ожидается целое число");
          }
          if (registerSign === "unsigned") {
            if (bigint < 0n || bigint > (1n << 64n) - 1n)
              throw new Error("INT64 unsigned: 0..2^64-1");
          } else {
            const min = -(1n << 63n);
            const max = (1n << 63n) - 1n;
            if (bigint < min || bigint > max) throw new Error("INT64 signed: -2^63..2^63-1");
            if (bigint < 0n) bigint = (1n << 64n) + bigint;
          }
          const words: number[] = [];
          let tmp = bigint;
          for (let i = 0; i < 4; i += 1) {
            words.unshift(Number(tmp & 0xffffn));
            tmp >>= 16n;
          }
          regs = [...words];
          if (registerOrder === "CDAB") {
            regs = [regs[2], regs[3], regs[0], regs[1]];
          }
        } else {
          const f = Number(normalized);
          if (!Number.isFinite(f)) throw new Error("FLOAT64: ожидается число");
          const buf = new ArrayBuffer(8);
          const view = new DataView(buf);
          view.setFloat64(0, f);
          const words: number[] = [];
          for (let i = 0; i < 4; i += 1) {
            words.push(view.getUint16(i * 2));
          }
          regs = [...words];
          if (registerOrder === "CDAB") {
            regs = [regs[2], regs[3], regs[0], regs[1]];
          }
        }

        await writeBatch("holding", baseAddr, regs);
        const updated = [...values];
        for (let i = 0; i < regs.length; i += 1) {
          if (groupBaseIndex + i < updated.length) updated[groupBaseIndex + i] = regs[i];
        }
        setValues(updated);
        setEditHolding((prev) => {
          const next = { ...prev };
          delete next[globalIndex];
          return next;
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Не удалось интерпретировать значение для выбранного формата";
      setStateError(msg);
      pushLog("error", msg);
      await applyZero();
    }
  }, [selectedKind, registerFormatKind, registerSign, registerOrder, columnsPerRow, start, values, pushLog]);

  return (
    <RegistersContext.Provider
      value={{
        selectedKind,
        start,
        count,
        values,
        stateLoading,
        stateError,
        registerFormatKind,
        registerSign,
        registerOrder,
        editHolding,
        recentRegisterChanges,
        columnsPerRow,
        setSelectedKind,
        setStart,
        setCount,
        setValues,
        setRegisterFormatKind,
        setRegisterSign,
        setRegisterOrder,
        setEditHolding,
        reloadRegisters,
        handleCellChange,
        handleHoldingValueChange,
        handleBatchSave,
        handlePresetApply,
        markRegistersChanged,
        isRegisterRecentlyChanged
      }}
    >
      {children}
    </RegistersContext.Provider>
  );
};

export const useRegisters = (): RegistersContextValue => {
  const context = React.useContext(RegistersContext);
  if (!context) {
    throw new Error("useRegisters must be used within RegistersProvider");
  }
  return context;
};
