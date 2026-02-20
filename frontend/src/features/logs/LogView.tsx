import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { ArrowDownIcon } from "@heroicons/react/20/solid";
import { AppLogEntry, LogFilterKey } from "../../shared/types";
import { useCollapse } from "../../shared/hooks";
import { useLogsContext } from "./LogsContext";
import LogFilters from "./LogFilters";
import LogEntry from "./LogEntry";

const LogView: React.FC = () => {
  const { eventLog, clearLog } = useLogsContext();
  const [activeFilters, setActiveFilters] = useState<LogFilterKey[]>([]);
  const [ipFilter, setIpFilter] = useState("");
  const [search, setSearch] = useState("");
  const [collapsed, toggleCollapsed] = useCollapse(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const toggleFilter = (key: LogFilterKey) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  const hasFilter = (key: LogFilterKey): boolean => activeFilters.includes(key);

  const isVisible = (entry: AppLogEntry): boolean => {
    if (ipFilter.trim()) {
      if (!entry.ip || !entry.ip.startsWith(ipFilter.trim())) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const text = `${entry.type} ${entry.message}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    if (activeFilters.length === 0) return true;

    let match = false;

    if (hasFilter("modbus")) {
      if (
        entry.type === "modbus_request" ||
        entry.type === "modbus_response" ||
        entry.type === "modbus_req_hex" ||
        entry.type === "modbus_rsp_hex"
      ) {
        match = true;
      }
    }

    if (hasFilter("server")) {
      if (
        entry.type === "server_start" ||
        entry.type === "server_stop" ||
        entry.type === "client_connect" ||
        entry.type === "client_disconnect"
      ) {
        match = true;
      }
    }

    if (hasFilter("generators")) {
      if (
        entry.type === "generator_create" ||
        entry.type === "generator_edit" ||
        entry.type === "generator_enable" ||
        entry.type === "generator_disable" ||
        entry.type === "generator_delete" ||
        entry.type === "generator_load"
      ) {
        match = true;
      }
    }

    if (hasFilter("profiles")) {
      if (
        entry.type === "profile_save" ||
        entry.type === "profile_load" ||
        entry.type === "profile_update"
      ) {
        match = true;
      }
    }

    if (hasFilter("errors")) {
      if (entry.type === "error") {
        match = true;
      }
    }

    return match;
  };

  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => eventLog.filter(isVisible), [eventLog, ipFilter, search, activeFilters]);
  const reversed = useMemo(() => [...filtered].reverse(), [filtered]);
  const visibleEntries = useMemo(() => reversed.slice(0, visibleCount), [reversed, visibleCount]);
  const hasMore = visibleCount < reversed.length;

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilters, ipFilter, search]);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!logRef.current) return;
    const el = logRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(isAtBottom);

    // Load more entries when scrolled near top
    if (el.scrollTop < 50 && hasMore) {
      const prevScrollHeight = el.scrollHeight;
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, reversed.length));
      requestAnimationFrame(() => {
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight - prevScrollHeight;
        }
      });
    }
  }, [hasMore, reversed.length]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const payload = {
      exported_at: new Date().toISOString(),
      filters: activeFilters,
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
  };

  return (
    <section className="panel panel-log">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <div className="panel-title">Журнал событий</div>
            {!collapsed && (
              <div className="panel-subtitle">
                Modbus‑операции, ошибки и HEX‑трейсы — последние сверху
              </div>
            )}
          </div>
          <div className="panel-toolbar">
            {!collapsed && (
              <>
                <LogFilters
                  activeFilters={activeFilters}
                  ipFilter={ipFilter}
                  searchText={search}
                  onFilterToggle={toggleFilter}
                  onClearFilters={clearFilters}
                  onIpFilterChange={setIpFilter}
                  onSearchChange={setSearch}
                  onClear={clearLog}
                  onExport={handleExport}
                />
                <button
                  type="button"
                  className={`btn-chip btn-chip-icon log-pin-btn ${autoScroll ? "log-pin-btn--active" : ""}`}
                  onClick={() => {
                    setAutoScroll(true);
                    if (logRef.current) {
                      logRef.current.scrollTop = logRef.current.scrollHeight;
                    }
                  }}
                  title={autoScroll ? "Авто-прокрутка включена" : "Прокрутить к последним"}
                >
                  <ArrowDownIcon />
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-sm btn-icon panel-toggle"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Развернуть журнал" : "Свернуть журнал"}
            >
              {collapsed
                ? <ChevronRightIcon style={{ width: 18, height: 18 }} />
                : <ChevronDownIcon style={{ width: 18, height: 18 }} />}
            </button>
          </div>
        </div>
        {!collapsed && (
          <div className="log-container" ref={logRef} onScroll={handleScroll}>
            {filtered.length === 0 ? (
              <div className="log-empty">Нет записей журнала</div>
            ) : (
              <>
                {hasMore && (
                  <div className="log-load-more" style={{ textAlign: "center", padding: "0.3rem", fontSize: "0.72rem", color: "var(--text-soft)" }}>
                    Показано {visibleCount} из {reversed.length} • прокрутите вверх для загрузки ещё
                  </div>
                )}
                {visibleEntries.map((entry, i) => (
                  <LogEntry key={i} entry={entry} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(LogView);
