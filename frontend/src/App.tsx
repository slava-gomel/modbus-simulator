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

  const [eventLog, setEventLog] = useState<Array<{ type: string; message: string; time: string }>>([]);
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
      setEventLog((prev) =>
        [...prev, { type, message, time: new Date().toISOString() }].slice(-MAX_LOG_ENTRIES)
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
    error: "#c62828",
    server_start: "#2e7d32",
    server_stop: "#e65100",
    modbus_request: "#1565c0",
    modbus_response: "#455a64",
    modbus_req_hex: "#0d47a1",
    modbus_rsp_hex: "#37474f",
    request: "#1565c0",
    response: "#455a64",
    info: "#212121"
  };

  if (authRequiredState === true && !authenticated) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 400, margin: "2rem auto" }}>
        <h1>Modbus TCP Simulator</h1>
        <p style={{ color: "#666" }}>Требуется авторизация</p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label>
            Логин:
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              required
              autoComplete="username"
              style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            />
          </label>
          <label>
            Пароль:
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
              autoComplete="current-password"
              style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            />
          </label>
          {loginError && <p style={{ color: "red", margin: 0 }}>{loginError}</p>}
          <button type="submit">Войти</button>
        </form>
      </div>
    );
  }

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
          {serverStatus?.error && (
            <span style={{ color: "red", marginLeft: "0.5rem" }}>{serverStatus.error}</span>
          )}
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

      <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Профили</h2>
        {profilesError && <p style={{ color: "red" }}>{profilesError}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Имя профиля"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            style={{ width: 160 }}
          />
          <input
            type="text"
            placeholder="Комментарий"
            value={profileComment}
            onChange={(e) => setProfileComment(e.target.value)}
            style={{ width: 180 }}
          />
          <button type="button" onClick={() => void handleSaveProfile()} disabled={profilesLoading || !profileName.trim()}>
            Сохранить текущий
          </button>
          <button type="button" onClick={() => void refreshProfiles()}>Обновить список</button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {profiles.map((p) => (
            <li key={p.slug} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span>{p.name}</span>
              {p.comment && <span style={{ color: "#666", fontSize: 14 }}>({p.comment})</span>}
              <button type="button" onClick={() => void handleLoadProfile(p.slug)} disabled={profilesLoading}>
                Загрузить
              </button>
              <button type="button" onClick={() => void handleDeleteProfile(p.slug)}>Удалить</button>
            </li>
          ))}
        </ul>
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
            <>
              <button type="button" onClick={() => void handleBatchSave()}>
                Сохранить диапазон (batch)
              </button>
              <button
                type="button"
                onClick={() => {
                  setValues(values.map(() => 0));
                  void handlePresetApply(values.map(() => 0));
                }}
              >
                Заполнить нулями
              </button>
              <button
                type="button"
                onClick={() => {
                  const rand = values.map(() => Math.floor(Math.random() * (selectedKind === "coils" ? 2 : 65536)));
                  setValues(rand);
                  void handlePresetApply(rand);
                }}
              >
                Случайные значения
              </button>
            </>
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

      <section style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Журнал событий</h2>
        <div style={{ marginBottom: "0.5rem" }}>
          <button type="button" onClick={() => setEventLog([])}>
            Очистить
          </button>
        </div>
        <div
          style={{
            maxHeight: 280,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            border: "1px solid #eee",
            borderRadius: 4,
            padding: "0.5rem",
            background: "#fafafa"
          }}
        >
          {eventLog.length === 0 ? (
            <div style={{ color: "#888" }}>Нет записей</div>
          ) : (
            [...eventLog].reverse().map((entry, i) => {
              const d = new Date(entry.time);
              const base = d.toLocaleTimeString("ru-RU", { hour12: false });
              const ms = String(d.getMilliseconds()).padStart(3, "0");
              const timeText = `${base}.${ms}`;
              return (
                <div
                  key={i}
                  style={{
                    color: logColors[entry.type] ?? "#212121",
                    marginBottom: "0.25rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  <span style={{ color: "#666", marginRight: "0.5rem" }}>
                    {timeText}
                  </span>
                  {entry.message}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

