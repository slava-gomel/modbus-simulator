import React from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { useConfig } from "./ConfigContext";
import { Skeleton } from "../../shared/components";

const ConfigPanel: React.FC = () => {
  const { config, configLoading, configError, saveConfig, setConfig } = useConfig();

  const handleSave = () => {
    if (config) {
      void saveConfig(config);
    }
  };

  return (
    <section className="panel panel-config">
      <div className="panel-inner">
        <div className="panel-header">
          <div className="panel-title">Конфигурация сервера</div>
        </div>

        {configError && (
          <div className="error-text">
            <span className="error-dot" />
            {configError}
          </div>
        )}

        {configLoading && !config && (
          <Skeleton variant="rect" rows={3} height="2rem" />
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
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSave}
              >
                <CheckIcon />
                Сохранить конфигурацию
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(ConfigPanel);
