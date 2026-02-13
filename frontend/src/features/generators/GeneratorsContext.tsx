import React, { createContext, useState, useCallback, ReactNode } from "react";
import { SignalGeneratorConfig, fetchSignalGenerators, saveSignalGenerators } from "../../api";
import { useLogsContext } from "../logs";
import { usePolling } from "../../shared/hooks";
import { GENERATOR_CHART_POLL_MS, GENERATOR_CHART_MAX_SAMPLES, DEFAULT_NEON_COLOR } from "../../shared/constants";
import { fetchRegisters } from "../../api";
import { getGeneratorNumericValue, formatGeneratorLogParams } from "./utils";

interface GeneratorsContextValue {
  signalGenerators: SignalGeneratorConfig[];
  editingGenerator: SignalGeneratorConfig | null;
  generatorValues: Record<string, number[]>;
  generatorChartSamples: Record<string, number[]>;
  loadGenerators: () => Promise<void>;
  handleCreateGenerator: () => void;
  handleEditGenerator: (id: string) => void;
  handleSaveGenerator: () => Promise<void>;
  handleCancelEditGenerator: () => void;
  handleDeleteGenerator: (id: string) => Promise<void>;
  handleToggleGenerator: (id: string) => Promise<void>;
  setEditingGenerator: React.Dispatch<React.SetStateAction<SignalGeneratorConfig | null>>;
}

const GeneratorsContext = createContext<GeneratorsContextValue | undefined>(undefined);

export const GeneratorsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pushLog } = useLogsContext();
  const [signalGenerators, setSignalGenerators] = useState<SignalGeneratorConfig[]>([]);
  const [editingGenerator, setEditingGenerator] = useState<SignalGeneratorConfig | null>(null);
  const [generatorValues, setGeneratorValues] = useState<Record<string, number[]>>({});
  const [generatorChartSamples, setGeneratorChartSamples] = useState<Record<string, number[]>>({});

  const loadGenerators = useCallback(async () => {
    try {
      const generators = await fetchSignalGenerators();
      if (Array.isArray(generators)) {
        setSignalGenerators(generators);
      }
    } catch {
      // Игнорируем ошибки загрузки
    }
  }, []);

  // Polling значений генераторов для живого графика
  usePolling(
    async () => {
      if (signalGenerators.length === 0) {
        setGeneratorValues({});
        setGeneratorChartSamples({});
        return;
      }
      const nextValues: Record<string, number[]> = {};
      for (const g of signalGenerators) {
        try {
          const data = await fetchRegisters("holding", g.start_address, g.register_count);
          nextValues[g.id] = data.values;
        } catch {
          nextValues[g.id] = [];
        }
      }
      setGeneratorValues((prev) => (JSON.stringify(prev) === JSON.stringify(nextValues) ? prev : nextValues));
      setGeneratorChartSamples((prev) => {
        const next: Record<string, number[]> = { ...prev };
        for (const g of signalGenerators) {
          const raw = nextValues[g.id] ?? [];
          const num = getGeneratorNumericValue(g, raw);
          const buf = [...(prev[g.id] ?? []), num].slice(-GENERATOR_CHART_MAX_SAMPLES);
          next[g.id] = buf;
        }
        return next;
      });
    },
    signalGenerators.length > 0 ? GENERATOR_CHART_POLL_MS : null,
    [signalGenerators]
  );

  const emptyGenerator = (): SignalGeneratorConfig => ({
    id: `gen-${Date.now()}`,
    enabled: true,
    name: "",
    register_kind: "holding",
    start_address: 0,
    register_count: 1,
    data_type: "int16",
    wave_type: "sine",
    amplitude: 1,
    offset: 0,
    frequency_hz: 1,
    update_period_ms: 100,
    neon_color: DEFAULT_NEON_COLOR
  });

  const handleCreateGenerator = useCallback(() => {
    setEditingGenerator(emptyGenerator());
  }, []);

  const handleEditGenerator = useCallback((id: string) => {
    const found = signalGenerators.find((g) => g.id === id);
    if (found) {
      setEditingGenerator({ ...found });
    }
  }, [signalGenerators]);


  const handleSaveGenerator = useCallback(async () => {
    if (!editingGenerator) return;
    const label = editingGenerator.name || editingGenerator.id;
    const existingIndex = signalGenerators.findIndex((g) => g.id === editingGenerator.id);
    let next: SignalGeneratorConfig[];
    if (existingIndex === -1) {
      next = [...signalGenerators, editingGenerator];
    } else {
      next = [...signalGenerators];
      next[existingIndex] = editingGenerator;
    }
    setSignalGenerators(next);
    setEditingGenerator(null);
    try {
      await saveSignalGenerators(next);
      const action = existingIndex === -1 ? "generator_create" : "generator_edit";
      const verb = existingIndex === -1 ? "создан" : "изменён";
      pushLog(
        action,
        `Генератор «${label}» ${verb}. ${formatGeneratorLogParams(editingGenerator)}`
      );
    } catch {
      pushLog("error", "Не удалось сохранить генераторы");
    }
  }, [editingGenerator, signalGenerators, pushLog]);

  const handleCancelEditGenerator = useCallback(() => {
    setEditingGenerator(null);
  }, []);

  const handleDeleteGenerator = useCallback(async (id: string) => {
    const gen = signalGenerators.find((g) => g.id === id);
    const label = gen ? gen.name || gen.id : id;
    const next = signalGenerators.filter((g) => g.id !== id);
    setSignalGenerators(next);
    try {
      await saveSignalGenerators(next);
      if (gen) {
        pushLog(
          "generator_delete",
          `Генератор «${label}» удалён. ${formatGeneratorLogParams(gen)}`
        );
      } else {
        pushLog("generator_delete", `Генератор «${label}» удалён.`);
      }
    } catch {
      pushLog("error", "Не удалось сохранить генераторы");
    }
  }, [signalGenerators, pushLog]);

  const handleToggleGenerator = useCallback(async (id: string) => {
    const next = signalGenerators.map((g) =>
      g.id === id ? { ...g, enabled: !g.enabled } : g
    );
    const gen = next.find((g) => g.id === id);
    const label = gen ? gen.name || gen.id : id;
    const enabled = gen?.enabled ?? false;
    setSignalGenerators(next);
    try {
      await saveSignalGenerators(next);
      if (gen) {
        pushLog(
          enabled ? "generator_enable" : "generator_disable",
          (enabled
            ? `Генератор «${label}» включён. `
            : `Генератор «${label}» выключен. `) + formatGeneratorLogParams(gen)
        );
      } else {
        pushLog(
          enabled ? "generator_enable" : "generator_disable",
          enabled ? `Генератор «${label}» включён.` : `Генератор «${label}» выключен.`
        );
      }
    } catch {
      pushLog("error", "Не удалось сохранить генераторы");
    }
  }, [signalGenerators, pushLog]);

  return (
    <GeneratorsContext.Provider
      value={{
        signalGenerators,
        editingGenerator,
        generatorValues,
        generatorChartSamples,
        loadGenerators,
        handleCreateGenerator,
        handleEditGenerator,
        handleSaveGenerator,
        handleCancelEditGenerator,
        handleDeleteGenerator,
        handleToggleGenerator,
        setEditingGenerator
      }}
    >
      {children}
    </GeneratorsContext.Provider>
  );
};

export const useGenerators = (): GeneratorsContextValue => {
  const context = React.useContext(GeneratorsContext);
  if (!context) {
    throw new Error("useGenerators must be used within GeneratorsProvider");
  }
  return context;
};
