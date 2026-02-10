import React, { useEffect, useState } from "react";
import {
  fetchConfig,
  fetchRegisters,
  fetchServerStatus,
  ModbusConfigDto,
  RegisterKind,
  ServerStatus,
  startServer,
  stopServer,
  updateConfig,
  writeBatch,
  writeSingle
} from "./api";

const kinds: { id: RegisterKind; label: string }[] = [
  { id: "coils", label: "Coils (01/05)" },
  { id: "discrete_inputs", label: "Discrete Inputs (02)" },
  { id: "holding", label: "Holding Registers (03/06)" },
  { id: "input", label: "Input Registers (04)" }
];

export const App: React.FC = () => {
  const [config, setConfig] = useState<ModbusConfigDto | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  const [selectedKind, setSelectedKind] = useState<RegisterKind>("holding");
  const [start, setStart] = useState(0);
  const [count, setCount] = useState(16);
  const [values, setValues] = useState<number[]>([]);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setConfigLoading(true);
        setConfigError(null);
        const [cfg, status] = await Promise.all([
          fetchConfig(),
          fetchServerStatus().catch(() => null)
        ]);
        setConfig(cfg);
        if (status) setServerStatus(status);
      } catch (e) {
        setConfigError("Не удалось загрузить конфигурацию");
      } finally {
        setConfigLoading(false);
      }
    };
    load();
  }, []);

  const reloadRegisters = async () => {
    try {
      setStateLoading(true);
      setStateError(null);
      const data = await fetchRegisters(selectedKind, start, count);
      setValues(data.values);
    } catch (e) {
      setStateError("Не удалось загрузить значения регистров");
    } finally {
      setStateLoading(false);
    }
  };

  useEffect(() => {
    void reloadRegisters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind]);

  const handleConfigSave = async () => {
    if (!config) return;
    try {
      setConfigLoading(true);
      setConfigError(null);
      const saved = await updateConfig(config);
      setConfig(saved);
    } catch (e) {
      setConfigError("Не удалось сохранить конфигурацию");
    } finally {
      setConfigLoading(false);
    }
  };

  const handleCellChange = async (index: number, newValue: number) => {
    const addr = start + index;
    if (selectedKind === "discrete_inputs" || selectedKind === "input") {
      // Только чтение на этом этапе
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
    }
  };

  const handleBatchSave = async () => {
    if (values.length === 0) return;
    if (selectedKind !== "coils" && selectedKind !== "holding") return;
    try {
      setStateError(null);
      await writeBatch(
        selectedKind === "coils" ? "coils" : "holding",
        start,
        values
      );
      // после batch-записи перечитаем диапазон на всякий случай
      await reloadRegisters();
    } catch (e) {
      setStateError("Не удалось выполнить пакетную запись");
    }
  };

  const refreshServerStatus = async () => {
    try {
      const status = await fetchServerStatus();
      setServerStatus(status);
    } catch {
      setServerStatus(null);
    }
  };

  const handleServerStart = async () => {
    try {
      setServerLoading(true);
      const status = await startServer();
      setServerStatus(status);
    } finally {
      setServerLoading(false);
    }
  };

  const handleServerStop = async () => {
    try {
      setServerLoading(true);
      const status = await stopServer();
      setServerStatus(status);
    } finally {
      setServerLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Modbus TCP Simulator</h1>

      <section style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Modbus сервер</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span>
            Статус:{" "}
            <strong style={{ color: serverStatus?.running ? "green" : "red" }}>
              {serverStatus?.running ? "запущен" : "остановлен"}
            </strong>
            {serverStatus && (
              <> ( {serverStatus.host}:{serverStatus.port} )</>
            )}
          </span>
          <button type="button" onClick={() => void refreshServerStatus()} disabled={serverLoading}>
            Обновить статус
          </button>
          <button
            type="button"
            onClick={() => void handleServerStart()}
            disabled={serverLoading || serverStatus?.running}
          >
            Запустить
          </button>
          <button
            type="button"
            onClick={() => void handleServerStop()}
            disabled={serverLoading || !serverStatus?.running}
          >
            Остановить
          </button>
        </div>
      </section>

      <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Конфигурация</h2>
        {configLoading && <p>Загрузка конфигурации...</p>}
        {configError && <p style={{ color: "red" }}>{configError}</p>}
        {config && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <label>
              Host:
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
              />
            </label>
            <label>
              Port:
              <input
                type="number"
                value={config.port}
                onChange={(e) =>
                  setConfig({ ...config, port: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Unit ID:
              <input
                type="number"
                value={config.unit_id}
                onChange={(e) =>
                  setConfig({ ...config, unit_id: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Coils size:
              <input
                type="number"
                value={config.coils_size}
                onChange={(e) =>
                  setConfig({ ...config, coils_size: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Holding size:
              <input
                type="number"
                value={config.holding_registers_size}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    holding_registers_size: Number(e.target.value) || 0
                  })
                }
              />
            </label>
            <button type="button" onClick={handleConfigSave}>
              Сохранить конфигурацию
            </button>
          </div>
        )}
      </section>

      <section style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Регистры</h2>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
          <label>
            Тип:
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as RegisterKind)}
            >
              {kinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start:
            <input
              type="number"
              value={start}
              onChange={(e) => setStart(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            Count:
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </label>
          <button type="button" onClick={() => void reloadRegisters()}>
            Обновить
          </button>
          {(selectedKind === "coils" || selectedKind === "holding") && (
            <button type="button" onClick={() => void handleBatchSave()}>
              Сохранить диапазон (batch)
            </button>
          )}
        </div>
        {stateLoading && <p>Загрузка регистров...</p>}
        {stateError && <p style={{ color: "red" }}>{stateError}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "0.5rem"
          }}
        >
          {values.map((v, idx) => {
            const addr = start + idx;
            const editable = selectedKind === "coils" || selectedKind === "holding";
            return (
              <div
                key={addr}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  padding: "0.25rem 0.5rem",
                  fontSize: 14
                }}
              >
                <div>Addr {addr}</div>
                {editable ? (
                  <input
                    type="number"
                    value={v}
                    onChange={(e) =>
                      void handleCellChange(idx, Number(e.target.value) || 0)
                    }
                    style={{ width: "100%" }}
                  />
                ) : (
                  <div>{v}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

