import React from "react";
import { createPortal } from "react-dom";

export interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "Ctrl + S", description: "Сохранить конфигурацию" },
  { keys: "Ctrl + Shift + R", description: "Перезагрузить регистры" },
  { keys: "?", description: "Показать/скрыть горячие клавиши" },
  { keys: "Escape", description: "Закрыть диалог" },
];

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ open, onClose }) => {
  if (!open) return null;

  return createPortal(
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="confirm-title">Горячие клавиши</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys}>
                <td style={{ padding: "0.3rem 0.5rem 0.3rem 0", whiteSpace: "nowrap" }}>
                  <kbd style={{
                    display: "inline-block",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                    border: "1px solid rgba(148, 163, 184, 0.5)",
                    background: "rgba(15, 23, 42, 0.8)",
                    fontSize: "0.75rem",
                    fontFamily: "inherit",
                    color: "var(--text-main)",
                  }}>
                    {s.keys}
                  </kbd>
                </td>
                <td style={{ padding: "0.3rem 0", color: "var(--text-soft)" }}>
                  {s.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="confirm-actions">
          <button type="button" className="btn btn-sm" data-variant="ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default React.memo(ShortcutsHelp);
