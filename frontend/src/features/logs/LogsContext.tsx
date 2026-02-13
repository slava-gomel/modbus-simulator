import React, { createContext, useState, useEffect, ReactNode } from "react";
import { AppLogEntry } from "../../shared/types";
import { MAX_LOG_ENTRIES } from "../../shared/constants";

interface LogsContextValue {
  eventLog: AppLogEntry[];
  pushLog: (type: string, message: string) => void;
  clearLog: () => void;
}

const LogsContext = createContext<LogsContextValue | undefined>(undefined);

export const LogsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [eventLog, setEventLog] = useState<AppLogEntry[]>([]);

  const pushLog = (type: string, message: string) => {
    window.dispatchEvent(
      new CustomEvent("app:log", { detail: { type, message } })
    );
  };

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

  const clearLog = () => setEventLog([]);

  return (
    <LogsContext.Provider value={{ eventLog, pushLog, clearLog }}>
      {children}
    </LogsContext.Provider>
  );
};

export const useLogsContext = (): LogsContextValue => {
  const context = React.useContext(LogsContext);
  if (!context) {
    throw new Error("useLogsContext must be used within LogsProvider");
  }
  return context;
};
