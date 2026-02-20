import { useEffect, useState, useCallback } from "react";

interface ShortcutActions {
  onSave?: () => void;
  onReloadRegisters?: () => void;
}

export const useKeyboardShortcuts = (actions: ShortcutActions = {}) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        actions.onSave?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        actions.onReloadRegisters?.();
        return;
      }
    },
    [actions, showHelp]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
};
