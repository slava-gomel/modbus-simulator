import React from "react";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle-switch ${checked ? "toggle-switch--on" : ""} ${disabled ? "toggle-switch--disabled" : ""}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span className="toggle-switch-track">
        <span className="toggle-switch-thumb" />
      </span>
    </button>
  );
};

export default React.memo(ToggleSwitch);
