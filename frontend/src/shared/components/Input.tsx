import React, { ReactNode } from "react";

export interface InputProps {
  label?: string;
  type?: "text" | "number";
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  className?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

/**
 * Переиспользуемый компонент поля ввода
 */
export const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  id,
  className = "",
  readOnly = false,
  style
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e.target.value);
  };

  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className="field-input"
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        readOnly={readOnly}
        style={style}
      />
      {error && (
        <div className="error-text">
          <span className="error-dot" />
          {error}
        </div>
      )}
    </div>
  );
};

export default React.memo(Input);
