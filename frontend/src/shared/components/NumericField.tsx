import React, { useState } from "react";

export interface NumericFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: (value: number) => void;
  min?: number;
  max?: number;
  defaultValue: number;
  id?: string;
  className?: string;
  step?: number;
}

/**
 * Компонент числового поля с валидацией на blur
 */
export const NumericField: React.FC<NumericFieldProps> = ({
  label,
  value,
  onChange,
  onBlur,
  min,
  max,
  defaultValue,
  id,
  className = "",
  step
}) => {
  const [editText, setEditText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = () => {
    setIsEditing(true);
    setEditText(String(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditText(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(false);
    const trimmed = e.target.value.replace(",", ".").trim();
    
    if (!trimmed || trimmed === "-" || trimmed === "+" || trimmed === ".") {
      onChange(defaultValue);
      onBlur?.(defaultValue);
      return;
    }

    const num = Number(trimmed);
    
    if (!Number.isFinite(num)) {
      onChange(defaultValue);
      onBlur?.(defaultValue);
      return;
    }

    let finalValue = num;
    
    if (min !== undefined && num < min) finalValue = min;
    if (max !== undefined && num > max) finalValue = max;

    onChange(finalValue);
    onBlur?.(finalValue);
  };

  const displayValue = isEditing ? editText : String(value);
  const inputId = id || `numeric-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="field-input"
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default React.memo(NumericField);
