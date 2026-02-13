import React from "react";
import { AppLogEntry } from "../../shared/types";
import { LOG_COLORS } from "../../shared/constants";

export interface LogEntryProps {
  entry: AppLogEntry;
}

/**
 * Одна запись в журнале событий
 */
const LogEntry: React.FC<LogEntryProps> = ({ entry }) => {
  const d = new Date(entry.time);
  const base = d.toLocaleTimeString("ru-RU", { hour12: false });
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  const timeText = `${base}.${ms}`;

  return (
    <div
      className="log-line"
      style={{ color: LOG_COLORS[entry.type] ?? "#e5e7eb" }}
    >
      <div className="log-time">{timeText}</div>
      <div className="log-message">
        <span className="badge-log-type">{entry.type}</span>
        {entry.message}
      </div>
    </div>
  );
};

export default React.memo(LogEntry);
