import React from "react";
import { LogFilterKey } from "../../shared/types";

export interface LogFiltersProps {
  activeFilters: LogFilterKey[];
  ipFilter: string;
  searchText: string;
  onFilterToggle: (key: LogFilterKey) => void;
  onClearFilters: () => void;
  onIpFilterChange: (ip: string) => void;
  onSearchChange: (text: string) => void;
  onClear: () => void;
  onExport: () => void;
}

/**
 * Панель фильтрации и управления логами
 */
const LogFilters: React.FC<LogFiltersProps> = ({
  activeFilters,
  ipFilter,
  searchText,
  onFilterToggle,
  onClearFilters,
  onIpFilterChange,
  onSearchChange,
  onClear,
  onExport
}) => {
  const hasFilter = (key: LogFilterKey): boolean => activeFilters.includes(key);

  return (
    <>
      <div className="btn-group" style={{ marginRight: "0.5rem" }}>
        <button
          type="button"
          className="btn-chip"
          data-variant={activeFilters.length === 0 ? "primary" : "ghost"}
          onClick={onClearFilters}
        >
          Все
        </button>
        <button
          type="button"
          className="btn-chip"
          data-variant={hasFilter("modbus") ? "primary" : "ghost"}
          onClick={() => onFilterToggle("modbus")}
        >
          Modbus
        </button>
        <button
          type="button"
          className="btn-chip"
          data-variant={hasFilter("server") ? "primary" : "ghost"}
          onClick={() => onFilterToggle("server")}
        >
          Сервер
        </button>
        <button
          type="button"
          className="btn-chip"
          data-variant={hasFilter("generators") ? "primary" : "ghost"}
          onClick={() => onFilterToggle("generators")}
        >
          Генераторы
        </button>
        <button
          type="button"
          className="btn-chip"
          data-variant={hasFilter("profiles") ? "primary" : "ghost"}
          onClick={() => onFilterToggle("profiles")}
        >
          Профили
        </button>
        <button
          type="button"
          className="btn-chip"
          data-variant={hasFilter("errors") ? "primary" : "ghost"}
          onClick={() => onFilterToggle("errors")}
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
            onChange={(e) => onIpFilterChange(e.target.value)}
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
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-icon"
        onClick={onExport}
      >
        Экспорт JSON
      </button>
      <button
        type="button"
        className="btn btn-sm btn-icon"
        onClick={onClear}
      >
        Очистить
      </button>
    </>
  );
};

export default React.memo(LogFilters);
