import React, { useEffect, useRef, useState } from "react";
import {
  authRequired,
  deleteProfile,
  fetchConfig,
  fetchModbusLog,
  fetchRegisters,
  fetchServerStatus,
  listProfiles,
  loadProfile,
  ModbusConfigDto,
  ProfileItem,
  RegisterKind,
  saveProfile,
  setAuth,
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

type AppLogEntry = { type: string; message: string; time: string; ip?: string };

type LogFilter = "all" | "modbus" | "server" | "errors";

type RegisterFormat =
  | "decimal"
  | "integer"
  | "hex"
  | "binary"
  | "float32"
  | "float32sw"
  | "float64"
  | "float64sw";

const LogView: React.FC<{
  entries: AppLogEntry[];
  logColors: Record<string, string>;
  onClear: () => void;
}> = ({ entries, logColors, onClear }) => {
  const [filter, setFilter] = useState<LogFilter>("all");
  const [ipFilter, setIpFilter] = useState("");
  const [search, setSearch] = useState("");

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

    if (filter === "all") return true;
    if (filter === "modbus") {
      return (
        entry.type === "modbus_request" ||
        entry.type === "modbus_response" ||
        entry.type === "modbus_req_hex" ||
        entry.type === "modbus_rsp_hex"
      );
    }
    if (filter === "server") {
      return (
        entry.type === "server_start" ||
        entry.type === "server_stop" ||
        entry.type === "client_connect" ||
        entry.type === "client_disconnect"
      );
    }
    if (filter === "errors") {
      return entry.type === "error";
    }
    return true;
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
                data-variant={filter === "all" ? "primary" : "ghost"}
                onClick={() => setFilter("all")}
              >
                Все
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={filter === "modbus" ? "primary" : "ghost"}
                onClick={() => setFilter("modbus")}
              >
                Modbus
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={filter === "server" ? "primary" : "ghost"}
                onClick={() => setFilter("server")}
              >
                Сервер
              </button>
              <button
                type="button"
                className="btn-chip"
                data-variant={filter === "errors" ? "primary" : "ghost"}
                onClick={() => setFilter("errors")}
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

  const [selectedKind, setSelectedKind] = useState<RegisterKind>("holding");
  const [start, setStart] = useState(0);
  const [count, setCount] = useState(16);
  const [values, setValues] = useState<number[]>([]);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [registerFormat, setRegisterFormat] = useState<RegisterFormat>("decimal");

  const [eventLog, setEventLog] = useState<AppLogEntry[]>([]);
  const MAX_LOG_ENTRIES = 300;

  const pushLog = (type: string, message: string) => {
    window.dispatchEvent(
      new CustomEvent("app:log", { detail: { type, message } })
    );
  };

  const loadData = async () => {
    try {
      setConfigLoading(true);
      setConfigError(null);
      const [cfg, status, profileList] = await Promise.all([
        fetchConfig(),
        fetchServerStatus().catch(() => null),
        listProfiles().catch(() => [])
      ]);
      setConfig(cfg);
      if (status) {
        prevServerRunningRef.current = status.running;
        setServerStatus(status);
      }
      if (Array.isArray(profileList)) setProfiles(profileList);
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

  const reloadRegisters = async () => {
    try {
      setStateLoading(true);
      setStateError(null);
      const data = await fetchRegisters(selectedKind, start, count);
      setValues(data.values);
    } catch (e) {
      setStateError("Не удалось загрузить значения регистров");
      pushLog("error", "Загрузка регистров: ошибка");
    } finally {
      setStateLoading(false);
    }
  };

  useEffect(() => {
    void reloadRegisters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind]);

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
      await saveProfile(profileName.trim(), profileComment.trim());
      setProfileName("");
      setProfileComment("");
      await refreshProfiles();
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
      const [cfg, list] = await Promise.all([fetchConfig(), listProfiles()]);
      setConfig(cfg);
      setProfiles(list);
      await reloadRegisters();
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
    } catch (e) {
      setProfilesError("Не удалось удалить профиль");
      pushLog("error", "Удаление профиля: ошибка");
    }
  };

  const logColors: Record<string, string> = {
    error: "#fca5a5",
    server_start: "#4ade80",
    server_stop: "#fdba74",
    client_connect: "#6ee7b7",
    client_disconnect: "#f97316",
    modbus_request: "#93c5fd",
    modbus_response: "#9ca3af",
    modbus_req_hex: "#7dd3fc",
    modbus_rsp_hex: "#a5b4fc",
    request: "#93c5fd",
    response: "#9ca3af",
    info: "#e5e7eb"
  };

  const columnsPerRow = 10;
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
    switch (registerFormat) {
      case "decimal":
        return String(v);
      case "integer": {
        const signed = v & 0x8000 ? v - 0x10000 : v;
        return String(signed);
      }
      case "hex":
        return `0x${(v & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
      case "binary":
        return (v & 0xffff).toString(2).padStart(16, "0");
      case "float32":
      case "float32sw": {
        const evenIndex = globalIndex % 2 === 0 ? globalIndex : globalIndex - 1;
        const i0 = evenIndex;
        const i1 = evenIndex + 1;
        if (i1 >= values.length) return String(v);
        const r0 = values[i0] & 0xffff;
        const r1 = values[i1] & 0xffff;
        let hi = r0;
        let lo = r1;
        if (registerFormat === "float32sw") {
          hi = r1;
          lo = r0;
        }
        const word = (hi << 16) | lo;
        const buf = new ArrayBuffer(4);
        const view = new DataView(buf);
        view.setUint32(0, word);
        const f = view.getFloat32(0);
        return Number.isFinite(f) ? f.toString() : "NaN";
      }
      case "float64":
      case "float64sw": {
        const groupBase = globalIndex - (globalIndex % 4);
        const idx = [groupBase, groupBase + 1, groupBase + 2, groupBase + 3];
        if (idx[3] >= values.length) return String(v);
        const regs = idx.map((i) => values[i] & 0xffff);
        let words = [...regs];
        if (registerFormat === "float64sw") {
          words = [regs[2], regs[3], regs[0], regs[1]];
        }
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);
        // big-endian 16-битных регистров
        view.setUint16(0, words[0]);
        view.setUint16(2, words[1]);
        view.setUint16(4, words[2]);
        view.setUint16(6, words[3]);
        const f = view.getFloat64(0);
        return Number.isFinite(f) ? f.toString() : "NaN";
      }
      default:
        return String(v);
    }
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
                <div className="panel-subtitle">
                  Старт / стоп и текущее состояние TCP‑сервера
                </div>
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
                  className="btn btn-sm btn-icon"
                  onClick={() => void refreshServerStatus()}
                  disabled={serverLoading}
                >
                  Обновить статус
                </button>
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
                  <li key={p.slug} className="profiles-item">
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
                        data-variant="danger"
                        onClick={() => void handleDeleteProfile(p.slug)}
                      >
                        Удалить
                      </button>
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
                <button
                  type="button"
                  className="btn btn-sm btn-icon"
                  onClick={() => void reloadRegisters()}
                >
                  Обновить
                </button>
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
                      checked={registerFormat === "decimal"}
                      onChange={() => setRegisterFormat("decimal")}
                    />
                    <span>Decimal</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "integer"}
                      onChange={() => setRegisterFormat("integer")}
                    />
                    <span>Integer</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "hex"}
                      onChange={() => setRegisterFormat("hex")}
                    />
                    <span>Hexadecimal</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "binary"}
                      onChange={() => setRegisterFormat("binary")}
                    />
                    <span>Binary</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "float32"}
                      onChange={() => setRegisterFormat("float32")}
                    />
                    <span>32‑bit float</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "float32sw"}
                      onChange={() => setRegisterFormat("float32sw")}
                    />
                    <span>32‑bit sw. float</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "float64"}
                      onChange={() => setRegisterFormat("float64")}
                    />
                    <span>64‑bit float</span>
                  </label>
                  <label className="reg-format-option">
                    <input
                      type="radio"
                      name="reg-format"
                      checked={registerFormat === "float64sw"}
                      onChange={() => setRegisterFormat("float64sw")}
                    />
                    <span>64‑bit sw. float</span>
                  </label>
                </div>
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

            {selectedKind === "coils" && values.length > 0 && (
              <div className="bits-section">
                <div className="panel-subtitle">
                  Битовый вид для текущего диапазона Coils. Клик по квадрату переключает 0/1.
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
                            return (
                              <button
                                key={addr}
                                type="button"
                                className={`bit-cell ${
                                  on ? "bit-cell--on" : "bit-cell--off"
                                }`}
                                onClick={() => void handleCellChange(globalIndex, on ? 0 : 1)}
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
                    return (
                      <tr key={baseAddr} className="registers-row">
                        <td>{rangeLabel}</td>
                        {Array.from({ length: columnsPerRow }, (_, colIndex) => {
                          const globalIndex = rowIndex * columnsPerRow + colIndex;
                          const addr = baseAddr + colIndex;
                          const value = row[colIndex];
                          const editable =
                            selectedKind === "coils" || selectedKind === "holding";

                          if (colIndex >= row.length) {
                            return <td key={addr} />;
                          }

                          return (
                            <td key={addr}>
                              {editable ? (
                                <input
                                  className="field-input registers-cell-input"
                                  type="number"
                                  value={value}
                                  onChange={(e) =>
                                    void handleCellChange(
                                      globalIndex,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                />
                              ) : (
                                formatRegisterValue(globalIndex, value)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

