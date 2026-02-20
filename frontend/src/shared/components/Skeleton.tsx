import React from "react";

export interface SkeletonProps {
  width?: string;
  height?: string;
  rows?: number;
  variant?: "text" | "rect" | "table";
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  rows = 1,
  variant = "text",
  className = ""
}) => {
  if (variant === "table") {
    const cols = 8;
    return (
      <div className={`skeleton-table ${className}`}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="skeleton-table-row">
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className="skeleton-cell" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`skeleton-group ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`skeleton-block skeleton-block--${variant}`}
          style={{ width, height }}
        />
      ))}
    </div>
  );
};

export default React.memo(Skeleton);
