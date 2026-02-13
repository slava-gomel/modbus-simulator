import React from "react";
import { useServer } from "./ServerContext";

interface ServerPanelProps {
  currentProfileName?: string;
}

const ServerPanel: React.FC<ServerPanelProps> = ({ currentProfileName }) => {
  const { serverStatus, serverLoading, handleServerStart, handleServerStop } = useServer();

  return (
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

        {currentProfileName && (
          <div className="panel-footer">
            <div className="panel-subtitle">
              Текущий профиль: {currentProfileName}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(ServerPanel);
