import React, { createContext, useState, useCallback, ReactNode } from "react";
import { ModbusConfigDto, fetchConfig, updateConfig } from "../../api";
import { useLogsContext } from "../logs";

interface ConfigContextValue {
  config: ModbusConfigDto | null;
  configLoading: boolean;
  configError: string | null;
  loadConfig: () => Promise<void>;
  saveConfig: (newConfig: ModbusConfigDto) => Promise<void>;
  setConfig: (config: ModbusConfigDto) => void;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pushLog } = useLogsContext();
  const [config, setConfig] = useState<ModbusConfigDto | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      setConfigError(null);
      const cfg = await fetchConfig();
      setConfig(cfg);
    } catch (e) {
      setConfigError("Не удалось загрузить конфигурацию");
      pushLog("error", "Загрузка конфигурации: ошибка");
    } finally {
      setConfigLoading(false);
    }
  }, [pushLog]);

  const saveConfig = useCallback(async (newConfig: ModbusConfigDto) => {
    try {
      setConfigLoading(true);
      setConfigError(null);
      const saved = await updateConfig(newConfig);
      setConfig(saved);
    } catch (e) {
      setConfigError("Не удалось сохранить конфигурацию");
      pushLog("error", "Сохранение конфигурации: ошибка");
    } finally {
      setConfigLoading(false);
    }
  }, [pushLog]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        configLoading,
        configError,
        loadConfig,
        saveConfig,
        setConfig
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextValue => {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
};
