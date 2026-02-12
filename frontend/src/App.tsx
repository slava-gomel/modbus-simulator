import React, { useEffect, useRef, useState } from "react";
import {
  authRequired,
  deleteProfile,
  fetchConfig,
  fetchModbusLog,
  fetchRegisters,
  fetchServerStatus,
  fetchSignalGenerators,
  listProfiles,
  loadProfile,
  ModbusConfigDto,
  ProfileItem,
  RegisterKind,
  saveProfile,
  saveSignalGenerators,
  setAuth,
  ServerStatus,
  SignalGeneratorConfig,
  SignalWaveType,
  SignalDataType,
  startServer,
  stopServer,
  updateConfig,
  updateProfile,
  writeBatch,
  writeSingle
} from "./api";

const kinds: { id: RegisterKind; label: string }[] = [
  { id: "coils", label: "Coils (01/05)" },
  { id: "discrete_inputs", label: "Discrete Inputs (02)" },
  { id: "holding", label: "Holding Registers (03/06)" },
  { id: "input", label: "Input Registers (04)" }
];

type AppLogEntry = { type: string; message: string; time: string; ip?: string };

type LogFilterKey = "modbus" | "server" | "generators" | "profiles" | "errors";

type RegisterFormatKind = "int16" | "int32" | "int64" | "float32" | "float64" | "bitmap";
type RegisterSign = "signed" | "unsigned";
type RegisterOrder = "ABCD" | "CDAB";

const LogView: React.FC<{
  entries: AppLogEntry[];
  logColors: Record<string, string>;
  onClear: () => void;
}> = ({ entries, logColors, onClear }) => {
  const [activeFilters, setActiveFilters] = useState<LogFilterKey[]>([]);
  const [ipFilter, setIpFilter] = useState("");
  const [search, setSearch] = useState("");

  const toggleFilter = (key: LogFilterKey) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const hasFilter = (key: LogFilterKey): boolean => activeFilters.includes(key);

  const isVisible = (entry: AppLogEntry): boolean => {
    if (ipFilter.trim()) {
      if (!entry.ip || !entry.ip.startsWith(ipFilter.trim())) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const text =
        `${entry.type} ${entry.message}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    if (activeFilters.length === 0) return true;

    let match = false;

    if (hasFilter("modbus")) {
      if (
        entry.type === "modbus_request" ||
        entry.type === "modbus_response" ||
        entry.type === "modbus_req_hex" ||
        entry.type === "modbus_rsp_hex"
      ) {
        match = true;
      }
    }

    if (hasFilter("server")) {
      if (
        entry.type === "server_start" ||
        entry.type === "server_stop" ||
        entry.type === "client_connect" ||
        entry.type === "client_disconnect"
      ) {
        match = true;
      }
    }

    if (hasFilter("generators")) {
      if (
        entry.type === "generator_create" ||
        entry.type === "generator_edit" ||
        entry.type === "generator_enable" ||
        entry.type === "generator_disable" ||
        entry.type === "generator_delete" ||
        entry.type === "generator_load"
      ) {
        match = true;
      }
    }

    if (hasFilter("profiles")) {
      if (
        entry.type === "profile_save" ||
        entry.type === "profile_load" ||
        entry.type === "profile_update"
      ) {
        match = true;
      }
    }

    if (hasFilter("errors")) {
      if (entry.type === "error") {
        match = true;
      }
    }

    return match;
  };

  const filtered = entries.filter(isVisible);

  return (
    <section className="panel panel-log">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <div className="panel-title">Журнал событий</div>
            <div className="panel-subtitle">
              Modbus‑операции, ошибки и HEX‑трейсы — последние сверху
            </div>
          </div>
          <div className="panel-toolbar">
            <div className="btn-group" style={{ marginRight: "0.5rem" }}>
              <button
                type="button"
                className="btn-chip"
                data-variant={activeFilters.length === 0 ? "primary" : "ghost"}
                onClick={() => setActiveFilters([])}
              >
                Все
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={hasFilter("modbus") ? "primary" : "ghost"}
                onClick={() => toggleFilter("modbus")}
              >
                Modbus
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={hasFilter("server") ? "primary" : "ghost"}
                onClick={() => toggleFilter("server")}
              >
                Сервер
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={hasFilter("generators") ? "primary" : "ghost"}
                onClick={() => toggleFilter("generators")}
              >
                Генераторы
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={hasFilter("profiles") ? "primary" : "ghost"}
                onClick={() => toggleFilter("profiles")}
              >
                Профили
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={hasFilter("errors") ? "primary" : "ghost"}
                onClick={() => toggleFilter("errors")}
              >
                Ошибки
              </button>
            </div>
            <div className="input-row" style={{ marginRight: "0.5rem" }}>
              <div className="field" style={{ minWidth: 120 }}>
                <label className="field-label" htmlFor="log-ip-filter">
                  IP
                </label>
                <input
                  id="log-ip-filter"
                  className="field-input"
                  type="text"
                  placeholder="192.168.0."
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                />
              </div>
              <div className="field" style={{ minWidth: 160 }}>
                <label className="field-label" htmlFor="log-search">
                  Поиск
                </label>
                <input
                  id="log-search"
                  className="field-input"
                  type="text"
                  placeholder="FC16, addr=0, error…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-icon"
              onClick={() => {
                if (filtered.length === 0) return;
                const payload = {
                  exported_at: new Date().toISOString(),
                  filter,
                  ipFilter: ipFilter.trim() || null,
                  search: search.trim() || null,
                  entries: filtered
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: "application/json"
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const ts = new Date().toISOString().replace(/[:.]/g, "-");
                a.href = url;
                a.download = `modbus-log-${ts}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Экспорт JSON
            </button>
            <button type="button" className="btn btn-sm btn-icon" onClick={onClear}>
              Очистить
            </button>
          </div>
        </div>
        <div className="log-container">
          {filtered.length === 0 ? (
            <div className="log-empty">Нет записей журнала</div>
          ) : (
            [...filtered].reverse().map((entry, i) => {
              const d = new Date(entry.time);
              const base = d.toLocaleTimeString("ru-RU", { hour12: false });
              const ms = String(d.getMilliseconds()).padStart(3, "0");
              const timeText = `${base}.${ms}`;
              return (
                <div
                  key={i}
                  className="log-line"
                  style={{ color: logColors[entry.type] ?? "#e5e7eb" }}
                >
                  <div className="log-time">{timeText}</div>
                  <div className="log-message">
                    <span className="badge-log-type">{entry.type}</span>
                    {entry.message}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export const App: React.FC = () => {
  const [authRequiredState, setAuthRequiredState] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [config, setConfig] = useState<ModbusConfigDto | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileComment, setProfileComment] = useState("");
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [currentProfileSlug, setCurrentProfileSlug] = useState<string>("default");

  const [selectedKind, setSelectedKind] = useState<RegisterKind>("holding");
  const [start, setStart] = useState(0);
  const [count, setCount] = useState(16);
  const [values, setValues] = useState<number[]>([]);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [registerFormatKind, setRegisterFormatKind] = useState<RegisterFormatKind>("int16");
  const [registerSign, setRegisterSign] = useState<RegisterSign>("unsigned");
  const [registerOrder, setRegisterOrder] = useState<RegisterOrder>("ABCD");

  const [eventLog, setEventLog] = useState<AppLogEntry[]>([]);
  const [editHolding, setEditHolding] = useState<Record<number, string>>({});
  const MAX_LOG_ENTRIES = 300;

  const [signalGenerators, setSignalGenerators] = useState<SignalGeneratorConfig[]>([]);
  const [editingGenerator, setEditingGenerator] = useState<SignalGeneratorConfig | null>(null);
  /** Буфер ввода числовых полей формы генератора (проверка по blur, как у регистров). */
  const [editGeneratorFields, setEditGeneratorFields] = useState<Record<string, string>>({});
  const [generatorValues, setGeneratorValues] = useState<Record<string, number[]>>({});
  /** Кольцевой буфер последних значений по каждому генератору для живого графика. */
  const [generatorChartSamples, setGeneratorChartSamples] = useState<Record<string, number[]>>({});
  const GENERATOR_CHART_MAX_SAMPLES = 80;
  const GENERATOR_CHART_POLL_MS = 120;

  const pushLog = (type: string, message: string) => {
    window.dispatchEvent(
      new CustomEvent("app:log", { detail: { type, message } })
    );
  };

  const loadData = async () => {
    try {
      setConfigLoading(true);
      setConfigError(null);
      const [cfg, status, profileList, generators] = await Promise.all([
        fetchConfig(),
        fetchServerStatus().catch(() => null),
        listProfiles().catch(() => []),
        fetchSignalGenerators().catch(() => [])
      ]);
      setConfig(cfg);
      if (status) {
        prevServerRunningRef.current = status.running;
        setServerStatus(status);
      }
      if (Array.isArray(profileList)) setProfiles(profileList);
      if (Array.isArray(generators)) setSignalGenerators(generators);
    } catch (e) {
      setConfigError("Не удалось загрузить конфигурацию");
      pushLog("error", "Загрузка конфигурации: ошибка");
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { required } = await authRequired();
        setAuthRequiredState(required);
        if (!required) {
          await loadData();
        }
      } catch {
        setAuthRequiredState(false);
        await loadData();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (authRequiredState !== true || !authenticated) return;
    void loadData();
  }, [authRequiredState, authenticated]);

  useEffect(() => {
    const onAuthRequired = () => setAuthenticated(false);
    window.addEventListener("auth:required", onAuthRequired);
    return () => window.removeEventListener("auth:required", onAuthRequired);
  }, []);

  useEffect(() => {
    const onLog = (e: Event) => {
      const { type, message } = (e as CustomEvent<{ type: string; message: string }>).detail;
      const m = message.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      const ip = m?.[1];
      setEventLog((prev) =>
        [
          ...prev,
          {
            type,
            message,
            time: new Date().toISOString(),
            ...(ip ? { ip } : {})
          }
        ].slice(-MAX_LOG_ENTRIES)
      );
    };
    window.addEventListener("app:log", onLog);
    return () => window.removeEventListener("app:log", onLog);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuth(loginUser, loginPass);
    setAuthenticated(true);
    try {
      await loadData();
    } catch {
      setLoginError("Неверный логин или пароль");
      setAuthenticated(false);
    }
  };

  const reloadRegisters = async (silent = false) => {
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
  };

  useEffect(() => {
    void reloadRegisters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind]);

  // Автообновление значений регистров (для отображения изменений от генератора сигналов и т.п.)
  const REGISTERS_AUTO_REFRESH_MS = 1500;
  useEffect(() => {
    const interval = setInterval(() => {
      void reloadRegisters(true);
    }, REGISTERS_AUTO_REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind, start, count]);

  // Подгрузка значений генераторов: частое обновление для живого графика и отображения значения
  useEffect(() => {
    if (signalGenerators.length === 0) {
      setGeneratorValues({});
      setGeneratorChartSamples({});
      return;
    }
    const fetchAll = async () => {
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
    };
    void fetchAll();
    const interval = setInterval(fetchAll, GENERATOR_CHART_POLL_MS);
    return () => clearInterval(interval);
  }, [signalGenerators]);

  const prevServerRunningRef = useRef<boolean | null>(null);
  const modbusLogSinceRef = useRef<number>(0);

  // Опрос лога Modbus (запросы/ответы), когда сервер запущен
  useEffect(() => {
    if (!serverStatus?.running) return;
    const interval = setInterval(async () => {
      try {
        const { events, next_id } = await fetchModbusLog(modbusLogSinceRef.current);
        modbusLogSinceRef.current = next_id;
        for (const e of events) {
          window.dispatchEvent(
            new CustomEvent("app:log", { detail: { type: e.type, message: e.message } })
          );
        }
      } catch {
        // игнорируем ошибки опроса лога
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [serverStatus?.running]);

  // Автообновление статуса Modbus-сервера каждые 5 с
  useEffect(() => {
    const interval = setInterval(async () => {
      if (serverLoading) return;
      try {
        const status = await fetchServerStatus();
        const wasRunning = prevServerRunningRef.current;
        prevServerRunningRef.current = status.running;
        setServerStatus(status);
        if (wasRunning === true && !status.running) {
          const msg = status.error
            ? `Сервер Modbus остановился: ${status.error}`
            : "Сервер Modbus остановился (поток завершился)";
          pushLog("server_stop", msg);
        }
      } catch {
        prevServerRunningRef.current = false;
        setServerStatus(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [serverLoading]);

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
      pushLog("error", "Запись регистра: ошибка");
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
      await reloadRegisters();
    } catch (e) {
      setStateError("Не удалось выполнить пакетную запись");
      pushLog("error", "Пакетная запись: ошибка");
    }
  };

  const handlePresetApply = async (newValues: number[]) => {
    if (newValues.length === 0 || (selectedKind !== "coils" && selectedKind !== "holding")) return;
    try {
      setStateError(null);
      await writeBatch(selectedKind === "coils" ? "coils" : "holding", start, newValues);
      setValues(newValues);
    } catch (e) {
      setStateError("Не удалось применить пресет");
      pushLog("error", "Пресет: ошибка");
    }
  };

  const handleHoldingValueChange = async (globalIndex: number, text: string) => {
    if (selectedKind !== "holding") return;
    setEditHolding((prev) => ({ ...prev, [globalIndex]: text }));

    const trimmed = (text ?? "").trim();
    const normalized = trimmed.replace(",", ".");

    const groupSize =
      registerFormatKind === "int32" || registerFormatKind === "float32"
        ? 2
        : registerFormatKind === "int64" || registerFormatKind === "float64"
        ? 4
        : 1;

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
    pushLog("server_start", "Запрос на запуск Modbus-сервера отправлен");
    try {
      setServerLoading(true);
      const status = await startServer();
      prevServerRunningRef.current = status.running;
      setServerStatus(status);
      if (status.running) {
        pushLog("server_start", `Сервер Modbus запущен (${status.host}:${status.port})`);
      }
      if (status.error) pushLog("error", status.error);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка запуска сервера";
      pushLog("error", msg);
      const status = await fetchServerStatus().catch(() => null);
      if (status) setServerStatus(status);
    } finally {
      setServerLoading(false);
    }
  };

  const handleServerStop = async () => {
    pushLog("server_stop", "Запрос на остановку Modbus-сервера отправлен");
    try {
      setServerLoading(true);
      const status = await stopServer();
      prevServerRunningRef.current = status.running;
      setServerStatus(status);
      if (!status.running) {
        pushLog("server_stop", "Сервер Modbus остановлен");
      } else if (status.error) {
        pushLog("error", status.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка остановки сервера";
      pushLog("error", msg);
      const status = await fetchServerStatus().catch(() => null);
      if (status) setServerStatus(status);
    } finally {
      setServerLoading(false);
    }
  };

  const refreshProfiles = async () => {
    try {
      setProfilesError(null);
      const list = await listProfiles();
      setProfiles(list);
      // Если текущий профиль ещё не выбран, но есть default – считаем его активным.
      if (!currentProfileSlug) {
        const def = list.find((p) => p.slug === "default");
        if (def) setCurrentProfileSlug(def.slug);
      }
    } catch (e) {
      setProfilesError("Не удалось загрузить список профилей");
      pushLog("error", "Список профилей: ошибка");
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      const saved = await saveProfile(profileName.trim(), profileComment.trim());
      setCurrentProfileSlug(saved.slug);
      setProfileName("");
      setProfileComment("");
      await refreshProfiles();
      pushLog(
        "profile_save",
        `Профиль «${saved.name}» сохранён (slug: ${saved.slug})`
      );
    } catch (e) {
      setProfilesError("Не удалось сохранить профиль");
      pushLog("error", "Сохранение профиля: ошибка");
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleLoadProfile = async (slug: string) => {
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      await loadProfile(slug);
      const [cfg, list, generators] = await Promise.all([
        fetchConfig(),
        listProfiles(),
        fetchSignalGenerators().catch(() => [])
      ]);
      setConfig(cfg);
      setProfiles(list);
      if (Array.isArray(generators)) {
        setSignalGenerators(generators);
      }
      setCurrentProfileSlug(slug);
      await reloadRegisters();
      const currentProfile =
        list.find((p) => p.slug === slug) ?? profiles.find((p) => p.slug === slug);
      const profileLabel = currentProfile?.name || slug;
      pushLog("profile_load", `Профиль «${profileLabel}» загружен`);
      if (Array.isArray(generators) && generators.length > 0) {
        for (const g of generators) {
          const label = g.name || g.id;
          // Событие загрузки генератора с полной конфигурацией
          pushLog(
            "generator_load",
            `Генератор «${label}» загружен из профиля «${profileLabel}». ${formatGeneratorLogParams(
              g
            )}`
          );
          // Событие включения/выключения в соответствии с последним сохранённым состоянием
          pushLog(
            g.enabled ? "generator_enable" : "generator_disable",
            g.enabled
              ? `Генератор «${label}» включён (из профиля «${profileLabel}»). ${formatGeneratorLogParams(
                  g
                )}`
              : `Генератор «${label}» выключен (из профиля «${profileLabel}»). ${formatGeneratorLogParams(
                  g
                )}`
          );
        }
      }
    } catch (e) {
      setProfilesError("Не удалось загрузить профиль");
      pushLog("error", "Загрузка профиля: ошибка");
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleDeleteProfile = async (slug: string) => {
    if (!window.confirm("Удалить профиль?")) return;
    try {
      setProfilesError(null);
      await deleteProfile(slug);
      await refreshProfiles();
      if (slug === currentProfileSlug) {
        setCurrentProfileSlug("default");
      }
    } catch (e) {
      setProfilesError("Не удалось удалить профиль");
      pushLog("error", "Удаление профиля: ошибка");
    }
  };

  const handleUpdateProfile = async (slug: string) => {
    if (
      !window.confirm(
        "Обновить выбранный профиль из текущей конфигурации?\n" +
          "Будут перезаписаны конфигурация, состояние регистров и генераторы."
      )
    ) {
      return;
    }
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      await updateProfile(slug);
      await refreshProfiles();
      setCurrentProfileSlug(slug);
      const currentProfile =
        profiles.find((p) => p.slug === slug) ?? { name: slug, slug, comment: "" };
      pushLog(
        "profile_update",
        `Профиль «${currentProfile.name}» обновлён из текущей конфигурации`
      );
    } catch (e) {
      setProfilesError("Не удалось обновить профиль");
      pushLog("error", "Обновление профиля: ошибка");
    } finally {
      setProfilesLoading(false);
    }
  };

  const logColors: Record<string, string> = {
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

  const columnsPerRow = 8;
  const registerRows: number[][] = [];
  for (let i = 0; i < values.length; i += columnsPerRow) {
    registerRows.push(values.slice(i, i + columnsPerRow));
  }

  const bitsPerRow = 32;
  const bitRows: number[][] = [];
  for (let i = 0; i < values.length; i += bitsPerRow) {
    bitRows.push(values.slice(i, i + bitsPerRow));
  }

  const formatRegisterValue = (globalIndex: number, raw: number): string => {
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
        // меняем местами старшее и младшее слово
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
      // собрать в BigInt
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

  /** Форматирование значения генератора по его data_type (порядок слов ABCD как в бэкенде). */
  const formatGeneratorValue = (g: SignalGeneratorConfig, rawValues: number[]): string => {
    const n = getGeneratorNumericValue(g, rawValues);
    if (rawValues.length === 0) return "—";
    if (g.data_type === "int16") return String(Math.round(n));
    return Number.isFinite(n) ? String(n) : "—";
  };

  /** Числовое значение генератора из сырых регистров (для графика и расчётов). */
  const getGeneratorNumericValue = (g: SignalGeneratorConfig, rawValues: number[]): number => {
    if (!rawValues.length) return 0;
    const regs = rawValues.map((v) => v & 0xffff);
    if (g.data_type === "int16") {
      const v = regs[0];
      return v > 0x7fff ? v - 0x10000 : v;
    }
    if (g.data_type === "float32" && regs.length >= 2) {
      const word = (regs[0] << 16) | regs[1];
      const buf = new ArrayBuffer(4);
      const view = new DataView(buf);
      view.setUint32(0, word >>> 0);
      return view.getFloat32(0);
    }
    if (g.data_type === "float64" && regs.length >= 4) {
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      view.setUint16(0, regs[0]);
      view.setUint16(2, regs[1]);
      view.setUint16(4, regs[2]);
      view.setUint16(6, regs[3]);
      return view.getFloat64(0);
    }
    return 0;
  };

  const DEFAULT_NEON_COLOR = "#3b82f6";

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

  const neonGlowStyle = (hex: string | null | undefined): React.CSSProperties => {
    const color = hex && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : DEFAULT_NEON_COLOR;
    return {
      borderColor: color,
      boxShadow: `0 0 6px ${color}, 0 0 12px ${color}, 0 0 20px ${color}`,
    };
  };

  /** Цвет подсветки для диапазона регистров, если его затрагивает включённый генератор (только holding). */
  const getGeneratorHighlightForRange = (
    addrStart: number,
    registerCount: number
  ): string | null => {
    for (const g of signalGenerators) {
      if (!g.enabled || g.register_kind !== "holding") continue;
      const genEnd = g.start_address + g.register_count;
      if (addrStart < genEnd && addrStart + registerCount > g.start_address) {
        return g.neon_color ?? DEFAULT_NEON_COLOR;
      }
    }
    return null;
  };

  /** Путь одного периода сигнала для мини-графика (запасной вариант при отсутствии выборок). */
  const getSignalWavePathStatic = (waveType: SignalWaveType): string => {
    const w = 120;
    const h = 32;
    const pad = 2;
    const cy = h / 2;
    const amp = (h - 2 * pad) / 2;
    const pts: string[] = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let val: number;
      if (waveType === "sine") {
        val = Math.sin(2 * Math.PI * t);
      } else if (waveType === "saw") {
        val = 2 * t - 1;
      } else if (waveType === "square") {
        val = t < 0.5 ? 1 : -1;
      } else {
        val = 0;
      }
      const x = pad + t * (w - 2 * pad);
      const y = cy - amp * val;
      pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return "M " + pts.join(" L ");
  };

  /** Путь графика по живым выборкам (нормализация по offset/amplitude генератора). */
  const getSignalWavePathLive = (samples: number[], g: SignalGeneratorConfig): string => {
    const w = 120;
    const h = 32;
    const pad = 2;
    const cy = h / 2;
    const amp = (h - 2 * pad) / 2;
    if (samples.length < 2) return getSignalWavePathStatic(g.wave_type);
    const a = g.amplitude !== 0 ? g.amplitude : 1;
    const pts: string[] = [];
    for (let i = 0; i < samples.length; i++) {
      const normalized = (samples[i] - g.offset) / a;
      const clamped = Math.max(-1, Math.min(1, normalized));
      const x = pad + (i / (samples.length - 1)) * (w - 2 * pad);
      const y = cy - amp * clamped;
      pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return "M " + pts.join(" L ");
  };

  /** Форматирование всех параметров генератора для журнала. */
  const formatGeneratorLogParams = (g: SignalGeneratorConfig): string => {
    return [
      `id=${g.id}`,
      `имя=${g.name ?? "-"}`,
      `включен=${g.enabled ? "да" : "нет"}`,
      `register_kind=${g.register_kind}`,
      `start_address=${g.start_address}`,
      `register_count=${g.register_count}`,
      `data_type=${g.data_type}`,
      `wave_type=${g.wave_type}`,
      `amplitude=${g.amplitude}`,
      `offset=${g.offset}`,
      `frequency_hz=${g.frequency_hz}`,
      `update_period_ms=${g.update_period_ms}`,
      `neon_color=${g.neon_color ?? "-"}`
    ].join("; ");
  };

  const handleCreateGenerator = () => {
    setEditGeneratorFields({});
    setEditingGenerator(emptyGenerator());
  };

  const handleEditGenerator = (id: string) => {
    const found = signalGenerators.find((g) => g.id === id);
    if (found) {
      setEditGeneratorFields({});
      setEditingGenerator({ ...found });
    }
  };

  /** Применить значение числового поля формы генератора по blur; при невалидном — подставить значение по умолчанию. */
  const applyGeneratorNumericField = (
    field: "start_address" | "amplitude" | "offset" | "frequency_hz" | "update_period_ms",
    raw: string
  ) => {
    if (!editingGenerator) return;
    const trimmed = raw.replace(",", ".").trim();
    const defaults: Record<string, number> = {
      start_address: 0,
      amplitude: 1,
      offset: 0,
      frequency_hz: 1,
      update_period_ms: 100,
    };
    setEditGeneratorFields((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "+") {
      setEditingGenerator({ ...editingGenerator, [field]: defaults[field] });
      return;
    }
    const num = field === "start_address" || field === "update_period_ms"
      ? Math.floor(Number(trimmed))
      : Number(trimmed);
    if (!Number.isFinite(num)) {
      setEditingGenerator({ ...editingGenerator, [field]: defaults[field] });
      return;
    }
    if (field === "start_address" && num < 0) {
      setEditingGenerator({ ...editingGenerator, [field]: 0 });
      return;
    }
    if (field === "frequency_hz" && num <= 0) {
      setEditingGenerator({ ...editingGenerator, [field]: 1 });
      return;
    }
    if (field === "update_period_ms" && num < 10) {
      setEditingGenerator({ ...editingGenerator, [field]: 10 });
      return;
    }
    setEditingGenerator({ ...editingGenerator, [field]: num });
  };

  const handleDeleteGenerator = async (id: string) => {
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
  };

  const handleToggleGenerator = async (id: string) => {
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
  };

  const handleSaveGenerator = async () => {
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
  };

  const handleCancelEditGenerator = () => {
    setEditGeneratorFields({});
    setEditingGenerator(null);
  };

  if (authRequiredState === true && !authenticated) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-title">Modbus TCP Simulator</div>
          <div className="login-subtitle">Требуется авторизация для доступа к панели управления</div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="field">
              <label className="field-label" htmlFor="login-user">
                Логин
              </label>
              <input
                id="login-user"
                className="field-input"
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="login-pass">
                Пароль
              </label>
              <input
                id="login-pass"
                className="field-input"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <div className="error-text">
                <span className="error-dot" />
                {loginError}
              </div>
            )}
            <button type="submit" className="btn">
              <span data-dot="" />
              Войти в панель
            </button>
          </form>
          <div className="login-footer">
            Доступ через Basic Auth. <strong>GUI_USER / GUI_PASSWORD</strong> задаются в окружении backend.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title-block">
          <div className="app-title">
            Modbus TCP Simulator
            <span className="app-title-pill">Modbus 01–06 · 15/16</span>
          </div>
          <div className="app-subtitle">
            Управление Modbus‑сервером, регистрами и профилями в одном современном интерфейсе
          </div>
        </div>
        <div className="app-badges">
          <span className="badge-soft">FastAPI · React · pymodbus</span>
          <span className="badge-soft" data-variant="danger">
            Только для тестирования и отладки
          </span>
        </div>
      </header>

      <main className="layout-grid">
        {/* Левая колонка: сервер + конфиг + профили */}
        <section className="panel panel-server">
          <div className="panel-inner">
            <div className="panel-header">
              <div>
                <div className="panel-title">Modbus сервер</div>
                <div className="panel-subtitle">Старт / стоп и текущее состояние TCP‑сервера</div>
              </div>
              <div className="panel-toolbar">
                <div className="status-pill">
                  <span
                    className="status-dot"
                    data-state={serverStatus?.running ? "running" : "stopped"}
                  />
                  <span className="status-label">
                    {serverStatus?.running ? "запущен" : "остановлен"}
                  </span>
                  {serverStatus && (
                    <span className="status-meta">
                      {serverStatus.host}:{serverStatus.port}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {serverStatus?.error && (
              <div className="error-text">
                <span className="error-dot" />
                {serverStatus.error}
              </div>
            )}

            <div className="panel-section">
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void handleServerStart()}
                  disabled={serverLoading || !!serverStatus?.running}
                >
                  <span data-dot="" />
                  Запустить сервер
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  data-variant="danger"
                  onClick={() => void handleServerStop()}
                  disabled={serverLoading || !serverStatus?.running}
                >
                  Остановить
                </button>
              </div>
            </div>

            <div className="panel-footer">
              <div className="panel-subtitle">
                Текущий профиль:{" "}
                {(() => {
                  const current = profiles.find((p) => p.slug === currentProfileSlug);
                  return current?.name || currentProfileSlug || "default";
                })()}
              </div>
            </div>
          </div>
        </section>

        <section className="panel panel-config">
          <div className="panel-inner">
            <div className="panel-header">
              <div>
                <div className="panel-title">Конфигурация сервера</div>
                <div className="panel-subtitle">
                  Хост, порт и размеры областей регистров
                </div>
              </div>
            </div>

            {configLoading && <div className="panel-subtitle">Загрузка конфигурации…</div>}
            {configError && (
              <div className="error-text">
                <span className="error-dot" />
                {configError}
              </div>
            )}

            {config && (
              <div className="panel-section">
                <div className="input-row">
                  <div className="field">
                    <label className="field-label" htmlFor="cfg-host">
                      Host
                    </label>
                    <input
                      id="cfg-host"
                      className="field-input"
                      type="text"
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="cfg-port">
                      Port
                    </label>
                    <input
                      id="cfg-port"
                      className="field-input"
                      type="number"
                      value={config.port}
                      onChange={(e) =>
                        setConfig({ ...config, port: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="cfg-unit">
                      Unit ID
                    </label>
                    <input
                      id="cfg-unit"
                      className="field-input"
                      type="number"
                      value={config.unit_id}
                      onChange={(e) =>
                        setConfig({ ...config, unit_id: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="input-row">
                  <div className="field">
                    <label className="field-label" htmlFor="cfg-coils">
                      Coils size
                    </label>
                    <input
                      id="cfg-coils"
                      className="field-input"
                      type="number"
                      value={config.coils_size}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          coils_size: Number(e.target.value) || 0
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="cfg-holding">
                      Holding size
                    </label>
                    <input
                      id="cfg-holding"
                      className="field-input"
                      type="number"
                      value={config.holding_registers_size}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          holding_registers_size: Number(e.target.value) || 0
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <button type="button" className="btn btn-sm" onClick={handleConfigSave}>
                    Сохранить конфигурацию
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel panel-profiles">
          <div className="panel-inner">
            <div className="panel-header">
              <div>
                <div className="panel-title">Профили</div>
                <div className="panel-subtitle">
                  Сохраняйте и переключайте наборы конфигурации и регистров
                </div>
              </div>
              <div className="panel-toolbar">
                <button
                  type="button"
                  className="btn btn-sm btn-icon"
                  onClick={() => void refreshProfiles()}
                >
                  Обновить список
                </button>
              </div>
            </div>

            {profilesError && (
              <div className="error-text">
                <span className="error-dot" />
                {profilesError}
              </div>
            )}

            <div className="panel-section">
              <div className="input-row">
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-label" htmlFor="profile-name">
                    Имя профиля
                  </label>
                  <input
                    id="profile-name"
                    className="field-input"
                    type="text"
                    placeholder="Например: demo‑проект"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-label" htmlFor="profile-comment">
                    Комментарий
                  </label>
                  <input
                    id="profile-comment"
                    className="field-input"
                    type="text"
                    placeholder="Опционально"
                    value={profileComment}
                    onChange={(e) => setProfileComment(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void handleSaveProfile()}
                  disabled={profilesLoading || !profileName.trim()}
                >
                  Сохранить текущий профиль
                </button>
              </div>

              <ul className="profiles-list">
                {profiles.map((p) => (
                  <li
                    key={p.slug}
                    className={
                      "profiles-item" +
                      (p.slug === currentProfileSlug ? " profiles-item-current" : "")
                    }
                  >
                    <div className="profiles-item-main">
                      <span className="profiles-name">{p.name}</span>
                      {p.comment && <span className="profiles-comment">{p.comment}</span>}
                    </div>
                    <div className="profiles-actions">
                      <button
                        type="button"
                        className="btn-chip"
                        onClick={() => void handleLoadProfile(p.slug)}
                        disabled={profilesLoading}
                      >
                        Загрузить
                      </button>
                      <button
                        type="button"
                        className="btn-chip"
                        onClick={() => void handleUpdateProfile(p.slug)}
                        disabled={profilesLoading}
                      >
                        Обновить из текущей конфигурации
                      </button>
                      {p.slug !== "default" && (
                        <button
                          type="button"
                          className="btn-chip"
                          data-variant="danger"
                          onClick={() => void handleDeleteProfile(p.slug)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Средняя колонка: регистры */}
        <section className="panel panel-registers">
          <div className="panel-inner">
            <div className="panel-header">
              <div>
                <div className="panel-title">Регистры</div>
                <div className="panel-subtitle">
                  Чтение и запись диапазонов регистров, пресеты и batch‑операции
                </div>
              </div>
            </div>

            <div className="registers-toolbar">
              <div className="field">
                <label className="field-label" htmlFor="reg-kind">
                  Тип
                </label>
                <select
                  id="reg-kind"
                  className="field-select"
                  value={selectedKind}
                  onChange={(e) => setSelectedKind(e.target.value as RegisterKind)}
                >
                  {kinds.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="reg-start">
                  Start
                </label>
                <input
                  id="reg-start"
                  className="field-input"
                  type="number"
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value) || 0)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="reg-count">
                  Count
                </label>
                <input
                  id="reg-count"
                  className="field-input"
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 1)}
                />
              </div>
              <div className="btn-group">
                {(selectedKind === "coils" || selectedKind === "holding") && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void handleBatchSave()}
                    >
                      Сохранить диапазон (batch)
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      data-variant="outline"
                      onClick={() => {
                        const zeros = values.map(() => 0);
                        setValues(zeros);
                        void handlePresetApply(zeros);
                      }}
                    >
                      Заполнить нулями
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      data-variant="ghost"
                      onClick={() => {
                        const rand = values.map(() =>
                          Math.floor(Math.random() * (selectedKind === "coils" ? 2 : 65536))
                        );
                        setValues(rand);
                        void handlePresetApply(rand);
                      }}
                    >
                      Случайные значения
                    </button>
                  </>
                )}
              </div>
            </div>

            {(selectedKind === "holding" || selectedKind === "input") && (
              <div className="reg-format-wrapper">
                <div className="reg-format-label">Формат отображения регистров</div>
                <div className="reg-format-group">
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormatKind === "int16"}
                      onChange={() => setRegisterFormatKind("int16")}
                    />
                    <span>INT16</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormatKind === "int32"}
                      onChange={() => setRegisterFormatKind("int32")}
                    />
                    <span>INT32</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormatKind === "int64"}
                      onChange={() => setRegisterFormatKind("int64")}
                    />
                    <span>INT64</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormatKind === "float32"}
                      onChange={() => setRegisterFormatKind("float32")}
                    />
                    <span>FLOAT32</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormatKind === "float64"}
                      onChange={() => setRegisterFormatKind("float64")}
                    />
                    <span>FLOAT64</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormatKind === "bitmap"}
                      onChange={() => setRegisterFormatKind("bitmap")}
                    />
                    <span>BITMAP</span>
                  </label>
                </div>

                {registerFormatKind !== "bitmap" && (
                  <div className="reg-format-subrow">
                    <div className="reg-format-subrow-label">Signedness</div>
                    <div className="reg-format-group">
                      <label className="reg-format-option">
                        <input
                          type="radio"
                          name="reg-sign"
                          checked={registerSign === "unsigned"}
                          onChange={() => setRegisterSign("unsigned")}
                        />
                        <span>Unsigned</span>
                      </label>
                      <label className="reg-format-option">
                        <input
                          type="radio"
                          name="reg-sign"
                          checked={registerSign === "signed"}
                          onChange={() => setRegisterSign("signed")}
                        />
                        <span>Signed</span>
                      </label>
                    </div>
                  </div>
                )}

                {(registerFormatKind === "int32" ||
                  registerFormatKind === "int64" ||
                  registerFormatKind === "float32" ||
                  registerFormatKind === "float64") && (
                  <div className="reg-format-subrow">
                    <div className="reg-format-subrow-label">Word order</div>
                    <div className="reg-format-group">
                      <label className="reg-format-option">
                        <input
                          type="radio"
                          name="reg-order"
                          checked={registerOrder === "ABCD"}
                          onChange={() => setRegisterOrder("ABCD")}
                        />
                        <span>ABCD</span>
                      </label>
                      <label className="reg-format-option">
                        <input
                          type="radio"
                          name="reg-order"
                          checked={registerOrder === "CDAB"}
                          onChange={() => setRegisterOrder("CDAB")}
                        />
                        <span>CDAB</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {stateLoading && (
              <div className="panel-subtitle">Загрузка значений регистров…</div>
            )}
            {stateError && (
              <div className="error-text">
                <span className="error-dot" />
                {stateError}
              </div>
            )}

            {(selectedKind === "coils" || selectedKind === "discrete_inputs") &&
              values.length > 0 && (
              <div className="bits-section">
                <div className="panel-subtitle">
                  Битовый вид для текущего диапазона{" "}
                  {selectedKind === "coils" ? "Coils (интерактивно)" : "Discrete Inputs (только чтение)"}.
                </div>
                <div className="bits-grid">
                  {bitRows.map((row, rowIndex) => {
                    const baseAddr = start + rowIndex * bitsPerRow;
                    return (
                      <div key={baseAddr} className="bits-row">
                        <div className="bits-row-label">
                          {baseAddr.toString().padStart(4, "0")}
                        </div>
                        <div className="bits-row-cells">
                          {row.map((value, colIndex) => {
                            const globalIndex = rowIndex * bitsPerRow + colIndex;
                            const addr = baseAddr + colIndex;
                            const on = value ? 1 : 0;
                            const interactive = selectedKind === "coils";
                            return (
                              <button
                                key={addr}
                                type="button"
                                className={`bit-cell ${on ? "bit-cell--on" : "bit-cell--off"} ${
                                  interactive ? "" : "bit-cell--readonly"
                                }`}
                                onClick={
                                  interactive
                                    ? () => void handleCellChange(globalIndex, on ? 0 : 1)
                                    : undefined
                                }
                                disabled={!interactive}
                              >
                                {addr.toString().padStart(2, "0")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(selectedKind === "holding" || selectedKind === "input") && (
              <div className="registers-table-wrapper">
                <table className="registers-table">
                  <thead>
                    <tr className="registers-header-row">
                      <th>Address range</th>
                      {Array.from({ length: columnsPerRow }, (_, i) => (
                        <th key={i}>+{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registerRows.map((row, rowIndex) => {
                      const baseAddr = start + rowIndex * columnsPerRow;
                      const lastAddr = baseAddr + row.length - 1;
                      const rangeLabel =
                        row.length > 1 ? `${baseAddr} - ${lastAddr}` : `${baseAddr}`;

                      const cells: JSX.Element[] = [];
                      const groupSize =
                        registerFormatKind === "int32" || registerFormatKind === "float32"
                          ? 2
                          : registerFormatKind === "int64" || registerFormatKind === "float64"
                          ? 4
                          : 1;

                      let colIndex = 0;
                      while (colIndex < columnsPerRow) {
                        const globalIndex = rowIndex * columnsPerRow + colIndex;
                        const addr = baseAddr + colIndex;

                        if (colIndex >= row.length) {
                          cells.push(<td key={addr} />);
                          colIndex += 1;
                          continue;
                        }

                        const remainingInRow = row.length - colIndex;
                        const span = Math.min(groupSize, remainingInRow, columnsPerRow - colIndex);
                        const value = row[colIndex];

                        if (groupSize === 1) {
                          if (selectedKind === "holding") {
                            const highlightColor = getGeneratorHighlightForRange(addr, 1);
                            cells.push(
                              <td key={addr}>
                                <input
                                  className="field-input registers-cell-input"
                                  type="text"
                                  value={editHolding[globalIndex] ?? formatRegisterValue(globalIndex, value)}
                                  onChange={(e) =>
                                    setEditHolding((prev) => ({
                                      ...prev,
                                      [globalIndex]: e.target.value
                                    }))
                                  }
                                  onBlur={(e) =>
                                    void handleHoldingValueChange(globalIndex, e.target.value)
                                  }
                                  style={highlightColor ? neonGlowStyle(highlightColor) : undefined}
                                />
                              </td>
                            );
                          } else {
                            cells.push(
                              <td key={addr}>
                                {formatRegisterValue(globalIndex, value)}
                              </td>
                            );
                          }
                          colIndex += 1;
                          continue;
                        }

                        // Широкие форматы: одно значение на 2 или 4 регистра
                        if (selectedKind === "holding") {
                          const highlightColor = getGeneratorHighlightForRange(addr, groupSize);
                          cells.push(
                            <td
                              key={addr}
                              colSpan={span}
                              className="registers-cell-wide"
                            >
                              <input
                                className="field-input registers-cell-input"
                                type="text"
                                value={editHolding[globalIndex] ?? formatRegisterValue(globalIndex, value)}
                                onChange={(e) =>
                                  setEditHolding((prev) => ({
                                    ...prev,
                                    [globalIndex]: e.target.value
                                  }))
                                }
                                onBlur={(e) =>
                                  void handleHoldingValueChange(globalIndex, e.target.value)
                                }
                                style={highlightColor ? neonGlowStyle(highlightColor) : undefined}
                              />
                            </td>
                          );
                        } else {
                          cells.push(
                            <td
                              key={addr}
                              colSpan={span}
                              className="registers-cell-wide"
                            >
                              {formatRegisterValue(globalIndex, value)}
                            </td>
                          );
                        }
                        colIndex += span;
                      }

                      return (
                        <tr key={baseAddr} className="registers-row">
                          <td>{rangeLabel}</td>
                          {cells}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Панель генератора сигналов */}
            <div className="panel-section signal-generator-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Генератор сигналов</div>
                  <div className="panel-subtitle">
                    Автоматическое обновление holding‑регистров по заданному сигналу (INT16 / FLOAT32 / FLOAT64)
                  </div>
                </div>
                <div className="panel-toolbar">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleCreateGenerator}
                  >
                    <span data-dot="" />
                    Добавить генератор
                  </button>
                </div>
              </div>

              {editingGenerator && (
                <div className="signal-generator-form">
                  <div className="input-row">
                    <div className="field">
                      <label className="field-label" htmlFor="gen-name">
                        Имя
                      </label>
                      <input
                        id="gen-name"
                        className="field-input"
                        type="text"
                        value={editingGenerator.name ?? ""}
                        onChange={(e) =>
                          setEditingGenerator({
                            ...editingGenerator,
                            name: e.target.value
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-start">
                        Start address
                      </label>
                      <input
                        id="gen-start"
                        className="field-input"
                        type="text"
                        inputMode="numeric"
                        value={editGeneratorFields["start_address"] ?? editingGenerator.start_address}
                        onChange={(e) =>
                          setEditGeneratorFields((prev) => ({
                            ...prev,
                            start_address: e.target.value
                          }))
                        }
                        onBlur={(e) =>
                          applyGeneratorNumericField("start_address", e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-type">
                        Тип сигнала
                      </label>
                      <select
                        id="gen-type"
                        className="field-select"
                        value={editingGenerator.wave_type}
                        onChange={(e) =>
                          setEditingGenerator({
                            ...editingGenerator,
                            wave_type: e.target.value as SignalWaveType
                          })
                        }
                      >
                        <option value="sine">Синусоида</option>
                        <option value="saw">Пилообразный</option>
                        <option value="square">Меандр</option>
                        <option value="constant">Константа</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-data-type">
                        Формат данных
                      </label>
                      <select
                        id="gen-data-type"
                        className="field-select"
                        value={editingGenerator.data_type}
                        onChange={(e) => {
                          const dt = e.target.value as SignalDataType;
                          const register_count =
                            dt === "int16" ? 1 : dt === "float32" ? 2 : 4;
                          setEditingGenerator({
                            ...editingGenerator,
                            data_type: dt,
                            register_count
                          });
                        }}
                      >
                        <option value="int16">INT16</option>
                        <option value="float32">FLOAT32</option>
                        <option value="float64">FLOAT64</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-row">
                    <div className="field">
                      <label className="field-label" htmlFor="gen-amplitude">
                        Амплитуда
                      </label>
                      <input
                        id="gen-amplitude"
                        className="field-input"
                        type="text"
                        inputMode="decimal"
                        value={editGeneratorFields["amplitude"] ?? editingGenerator.amplitude}
                        onChange={(e) =>
                          setEditGeneratorFields((prev) => ({
                            ...prev,
                            amplitude: e.target.value
                          }))
                        }
                        onBlur={(e) =>
                          applyGeneratorNumericField("amplitude", e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-offset">
                        Смещение
                      </label>
                      <input
                        id="gen-offset"
                        className="field-input"
                        type="text"
                        inputMode="decimal"
                        value={editGeneratorFields["offset"] ?? editingGenerator.offset}
                        onChange={(e) =>
                          setEditGeneratorFields((prev) => ({
                            ...prev,
                            offset: e.target.value
                          }))
                        }
                        onBlur={(e) =>
                          applyGeneratorNumericField("offset", e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-frequency">
                        Частота, Гц
                      </label>
                      <input
                        id="gen-frequency"
                        className="field-input"
                        type="text"
                        inputMode="decimal"
                        value={editGeneratorFields["frequency_hz"] ?? editingGenerator.frequency_hz}
                        onChange={(e) =>
                          setEditGeneratorFields((prev) => ({
                            ...prev,
                            frequency_hz: e.target.value
                          }))
                        }
                        onBlur={(e) =>
                          applyGeneratorNumericField("frequency_hz", e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-period">
                        Период обновления, мс
                      </label>
                      <input
                        id="gen-period"
                        className="field-input"
                        type="text"
                        inputMode="numeric"
                        value={editGeneratorFields["update_period_ms"] ?? editingGenerator.update_period_ms}
                        onChange={(e) =>
                          setEditGeneratorFields((prev) => ({
                            ...prev,
                            update_period_ms: e.target.value
                          }))
                        }
                        onBlur={(e) =>
                          applyGeneratorNumericField("update_period_ms", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="input-row">
                    <div className="field">
                      <label className="field-label" htmlFor="gen-neon-color">
                        Цвет подсветки
                      </label>
                      <div className="input-row generator-color-row">
                        <input
                          id="gen-neon-color"
                          type="color"
                          className="generator-color-input"
                          value={editingGenerator.neon_color ?? DEFAULT_NEON_COLOR}
                          onChange={(e) =>
                            setEditingGenerator({
                              ...editingGenerator,
                              neon_color: e.target.value
                            })
                          }
                        />
                        <span className="panel-subtitle generator-color-hex">
                          {editingGenerator.neon_color ?? DEFAULT_NEON_COLOR}
                        </span>
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gen-enabled">
                        Включен
                      </label>
                      <div>
                        <input
                          id="gen-enabled"
                          type="checkbox"
                          checked={editingGenerator.enabled}
                          onChange={(e) =>
                            setEditingGenerator({
                              ...editingGenerator,
                              enabled: e.target.checked
                            })
                          }
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={handleSaveGenerator}
                      >
                        <span data-dot="" />
                        Сохранить генератор
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        data-variant="ghost"
                        onClick={handleCancelEditGenerator}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {signalGenerators.length > 0 && (
                <div className="signal-generator-list">
                  <table className="registers-table">
                    <thead>
                      <tr className="registers-header-row">
                        <th>Имя</th>
                        <th>Тип</th>
                        <th>Формат</th>
                        <th>Адрес</th>
                        <th>График</th>
                        <th>Значение</th>
                        <th>Период, мс</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signalGenerators.map((g) => (
                        <tr key={g.id} className="registers-row">
                          <td>{g.name || g.id}</td>
                          <td>{g.wave_type}</td>
                          <td>{g.data_type}</td>
                          <td>{g.start_address}</td>
                          <td>
                            <svg
                              className="generator-wave-chart"
                              viewBox="0 0 120 32"
                              preserveAspectRatio="none"
                              aria-hidden
                            >
                              <path
                                d={getSignalWavePathLive(generatorChartSamples[g.id] ?? [], g)}
                                fill="none"
                                stroke={g.neon_color ?? DEFAULT_NEON_COLOR}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </td>
                          <td>
                            <input
                              readOnly
                              className="field-input registers-cell-input generator-value-display"
                              value={formatGeneratorValue(g, generatorValues[g.id] ?? [])}
                              aria-label={`Значение генератора ${g.name || g.id}`}
                              style={g.enabled ? neonGlowStyle(g.neon_color) : undefined}
                            />
                          </td>
                          <td>{g.update_period_ms}</td>
                          <td>{g.enabled ? "Вкл" : "Выкл"}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                type="button"
                                className="btn-chip"
                                onClick={() => handleEditGenerator(g.id)}
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                className="btn-chip"
                                onClick={() => void handleToggleGenerator(g.id)}
                              >
                                {g.enabled ? "Выключить" : "Включить"}
                              </button>
                              <button
                                type="button"
                                className="btn-chip"
                                data-variant="danger"
                                onClick={() => void handleDeleteGenerator(g.id)}
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Правая колонка: лог */}
        <LogView
          entries={eventLog}
          logColors={logColors}
          onClear={() => setEventLog([])}
        />
      </main>
    </div>
  );
};

