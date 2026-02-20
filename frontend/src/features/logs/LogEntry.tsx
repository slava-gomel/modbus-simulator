import React from "react";
import { AppLogEntry } from "../../shared/types";
import { LOG_TYPE_CATEGORIES } from "../../shared/constants";

const LogEntry: React.FC<{ entry: AppLogEntry }> = ({ entry }) => {
  const d = new Date(entry.time);
  const base = d.toLocaleTimeString("ru-RU", { hour12: false });
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  const timeText = `${base}.${ms}`;
  const category = LOG_TYPE_CATEGORIES[entry.type] ?? undefined;

  return (
    <div className="log-line">
      <div className="log-time">{timeText}</div>
      <div className="log-message">
        <span className="badge-log-type" data-category={category}>
          {entry.type}
        </span>
        {entry.message}
      </div>
    </div>
  );
};

export default React.memo(LogEntry);
