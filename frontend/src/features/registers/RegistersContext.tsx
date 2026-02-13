import React, { createContext, useState, useCallback, ReactNode, useRef } from "react";
import { RegisterKind, RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";
import { fetchRegisters, writeSingle, writeBatch } from "../../api";
import { useLogsContext } from "../logs";
import { usePolling } from "../../shared/hooks";
import { REGISTERS_AUTO_REFRESH_MS, REGISTER_FLASH_DURATION_MS } from "../../shared/constants";
import { makeRegisterKey, getFormatGroupSize } from "./formatters";
import { convertStringToRegisters, isEmptyInput } from "./converters";

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

    // Пустое или недопустимое значение → пишем 0
    if (isEmptyInput(text)) {
      await applyZero();
      return;
    }

    try {
      setStateError(null);

      // Конвертация через converters.ts
      const result = convertStringToRegisters(text, registerFormatKind, registerSign, registerOrder);
      
      if (result.error) {
        throw new Error(result.error);
      }

      const regs = result.registers;

      // Проверка размера группы
      if (groupSize > 1 && regs.length < groupSize) {
        throw new Error(`Недостаточно регистров для ${registerFormatKind}`);
      }

      // Запись в Modbus
      if (groupSize === 1) {
        const resp = await writeSingle("holding", baseAddr, regs[0]);
        const updated = [...values];
        updated[groupBaseIndex] = resp.values[0];
        setValues(updated);
      } else {
        await writeBatch("holding", baseAddr, regs);
        const updated = [...values];
        for (let i = 0; i < regs.length; i += 1) {
          if (groupBaseIndex + i < updated.length) updated[groupBaseIndex + i] = regs[i];
        }
        setValues(updated);
      }

      setEditHolding((prev) => {
        const next = { ...prev };
        delete next[globalIndex];
        return next;
      });
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
