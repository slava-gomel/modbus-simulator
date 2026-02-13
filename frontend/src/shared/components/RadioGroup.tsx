import React from "react";

export interface RadioOption {
  id: string;
  label: string;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

/**
 * Переиспользуемый компонент группы радиокнопок
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  className = ""
}) => {
  return (
    <div className={`reg-format-subrow ${className}`}>
      {label && <div className="reg-format-subrow-label">{label}</div>}
      {options.map((option) => (
        <div key={option.id} className="reg-format-option">
          <input
            type="radio"
            id={`${name}-${option.id}`}
            name={name}
            value={option.id}
            checked={value === option.id}
            onChange={(e) => onChange(e.target.value)}
          />
          <label htmlFor={`${name}-${option.id}`}>{option.label}</label>
        </div>
      ))}
    </div>
  );
};

export default React.memo(RadioGroup);
