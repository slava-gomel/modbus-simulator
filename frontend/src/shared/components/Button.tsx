import React, { ReactNode } from "react";

export interface ButtonProps {
  variant?: "default" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  icon?: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  "aria-label"?: string;
}

/**
 * Переиспользуемый компонент кнопки с поддержкой вариантов стилей
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  size = "md",
  icon = false,
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  "aria-label": ariaLabel
}) => {
  const classes = ["btn"];
  
  if (size === "sm") classes.push("btn-sm");
  if (icon) classes.push("btn-icon");
  if (variant !== "default") classes.push(`data-variant-${variant}`);
  if (className) classes.push(className);

  return (
    <button
      type={type}
      className={classes.join(" ")}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...(variant !== "default" && { "data-variant": variant })}
    >
      {children}
    </button>
  );
};

export default React.memo(Button);
