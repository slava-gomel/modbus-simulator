import React, { ReactNode, useCallback } from "react";
import { LogsProvider } from "./features/logs";
import { AuthProvider } from "./features/auth";
import { ServerProvider } from "./features/server";
import { ConfigProvider, useConfig } from "./features/config";
import { ProfilesProvider } from "./features/profiles";
import { GeneratorsProvider, useGenerators } from "./features/generators";
import { RegistersProvider, useRegisters } from "./features/registers";

/**
 * Композиция всех провайдеров контекста приложения.
 * Порядок важен: внутренние провайдеры могут использовать хуки внешних.
 */
export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LogsProvider>
      <AuthProviderWrapper>
        <ConfigProvider>
          <GeneratorsProvider>
            <RegistersProvider>
              <ServerProviderWrapper>
                <ProfilesProviderWrapper>
                  {children}
                </ProfilesProviderWrapper>
              </ServerProviderWrapper>
            </RegistersProvider>
          </GeneratorsProvider>
        </ConfigProvider>
      </AuthProviderWrapper>
    </LogsProvider>
  );
};

// Обёртки для передачи callback'ов между провайдерами

const AuthProviderWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleAuthSuccess = useCallback(async () => {
    // При успешной авторизации загружаем начальные данные
    // Это будет реализовано в финальном App.tsx
  }, []);

  return (
    <AuthProvider onAuthSuccess={handleAuthSuccess}>
      {children}
    </AuthProvider>
  );
};

const ServerProviderWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Получаем функцию markRegistersChanged из RegistersContext
  const { markRegistersChanged } = useRegisters();
  
  const handleModbusWrite = useCallback((kind: "coils" | "holding", start: number, count: number) => {
    markRegistersChanged(kind, start, count);
  }, [markRegistersChanged]);
  
  return (
    <ServerProvider onModbusWrite={handleModbusWrite}>
      {children}
    </ServerProvider>
  );
};

const ProfilesProviderWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleProfileLoad = useCallback(async () => {
    // При загрузке профиля нужно обновить конфигурацию и генераторы
    // Эта логика требует доступа к ConfigContext и GeneratorsContext
    // которые уже доступны на этом уровне
  }, []);

  return (
    <ProfilesProvider onProfileLoad={handleProfileLoad}>
      {children}
    </ProfilesProvider>
  );
};
