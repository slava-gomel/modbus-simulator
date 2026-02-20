import React from "react";
import { PlayIcon, StopIcon } from "@heroicons/react/20/solid";
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
          <div className="panel-title">Modbus сервер</div>
          <div className="panel-toolbar">
            <div className="status-pill">
              <span
                className="status-dot"
                data-state={serverStatus?.running ? "running" : "stopped"}
              />
              <span className="status-label">
                {serverStatus?.running ? "запущен" : "остановлен"}
              </span>
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
              <PlayIcon />
              Запустить
            </button>
            <button
              type="button"
              className="btn btn-sm"
              data-variant="danger"
              onClick={() => void handleServerStop()}
              disabled={serverLoading || !serverStatus?.running}
            >
              <StopIcon />
              Остановить
            </button>
          </div>
        </div>

        {currentProfileName && (
          <div className="panel-subtitle">
            Профиль: {currentProfileName}
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(ServerPanel);
