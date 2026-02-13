import React, { useEffect } from "react";
import { AppProviders } from "./AppProviders";
import { useAuth, LoginForm } from "./features/auth";
import { ServerPanel } from "./features/server";
import { ConfigPanel } from "./features/config";
import { ProfilesPanel, useProfiles } from "./features/profiles";
import { RegistersPanel } from "./features/registers";
import { GeneratorsPanel } from "./features/generators";
import { LogView } from "./features/logs";
import { useConfig } from "./features/config";
import { useGenerators } from "./features/generators";
import { useCollapse } from "./shared/hooks";
import { ConnectionStatus } from "./shared/components";

/**
 * Основной компонент приложения
 * ~150 строк вместо 2714 - чистая композиция UI
 */
export const App: React.FC = () => {
  return (
    <AppProviders>
      <ConnectionStatus />
      <AppContent />
    </AppProviders>
  );
};

const AppContent: React.FC = () => {
  const { authRequiredState, authenticated } = useAuth();
  const { loadConfig } = useConfig();
  const { refreshProfiles, profiles, currentProfileSlug } = useProfiles();
  const { loadGenerators } = useGenerators();

  // Однократная загрузка начальных данных при успешной авторизации.
  // Не добавляем loadConfig/refreshProfiles/loadGenerators в deps — иначе при обновлении
  // состояния в этих вызовах (например setCurrentProfileSlug) колбэки пересоздаются
  // и эффект уходит в бесконечный цикл (сотни запросов к /config, /generators, /profiles).
  useEffect(() => {
    if (!authenticated) return;
    void loadConfig();
    void refreshProfiles();
    void loadGenerators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  // Показать форму логина, если требуется авторизация
  if (authRequiredState === true && !authenticated) {
    return <LoginForm />;
  }

  // Основной интерфейс
  return (
    <div className="app-root">
      <AppHeader />
      <main className="layout-grid">
        <SettingsSection currentProfileName={getCurrentProfileName(profiles, currentProfileSlug)} />
        <RegistersPanel />
        <GeneratorsPanel />
        <LogView />
      </main>
    </div>
  );
};

const AppHeader: React.FC = () => {
  return (
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
  );
};

interface SettingsSectionProps {
  currentProfileName?: string;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ currentProfileName }) => {
  const [collapsed, toggleCollapsed] = useCollapse(false);

  return (
    <section className="panel panel-settings">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <div className="panel-title">Настройки</div>
            {!collapsed && (
              <div className="panel-subtitle">
                Запуск сервера, конфигурация и сохранённые профили
              </div>
            )}
          </div>
          <div className="panel-toolbar">
            <button
              type="button"
              className="btn btn-sm btn-icon panel-toggle"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Развернуть настройки" : "Свернуть настройки"}
            >
              {collapsed ? "▸" : "▾"}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="settings-grid">
            <ServerPanel currentProfileName={currentProfileName} />
            <ConfigPanel />
            <ProfilesPanel />
          </div>
        )}
      </div>
    </section>
  );
};

// Вспомогательная функция для получения имени текущего профиля
function getCurrentProfileName(profiles: any[], currentProfileSlug: string): string {
  const current = profiles.find((p) => p.slug === currentProfileSlug);
  return current?.name || currentProfileSlug || "default";
}

export default App;
