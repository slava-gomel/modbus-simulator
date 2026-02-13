import React, { useMemo } from "react";
import { formatRegisterValue } from "./formatters";
import { RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";

interface RegisterCellProps {
  globalIndex: number;
  rawValue: number;
  values: number[];
  registerFormatKind: RegisterFormatKind;
  registerSign: RegisterSign;
  registerOrder: RegisterOrder;
  editable: boolean;
  editText?: string;
  isRecentlyChanged: boolean;
  generatorHighlight: string | null;
  colspan?: number;
  onEdit?: (text: string) => void;
  onBlur?: (text: string) => void;
}

/**
 * Ячейка таблицы регистров с редактированием и подсветкой
 */
const RegisterCell: React.FC<RegisterCellProps> = ({
  globalIndex,
  rawValue,
  values,
  registerFormatKind,
  registerSign,
  registerOrder,
  editable,
  editText,
  isRecentlyChanged,
  generatorHighlight,
  colspan = 1,
  onEdit,
  onBlur
}) => {
  const formattedValue = useMemo(
    () => formatRegisterValue(globalIndex, rawValue, values, registerFormatKind, registerSign, registerOrder),
    [globalIndex, rawValue, values, registerFormatKind, registerSign, registerOrder]
  );

  const inputClasses = useMemo(() => {
    const classes = ["field-input", "registers-cell-input"];
    if (isRecentlyChanged && !generatorHighlight) {
      classes.push("modbusFlash");
    }
    return classes.join(" ");
  }, [isRecentlyChanged, generatorHighlight]);

  const inputStyle = useMemo((): React.CSSProperties | undefined => {
    if (generatorHighlight) {
      return {
        borderColor: generatorHighlight,
        boxShadow: `0 0 6px ${generatorHighlight}, 0 0 12px ${generatorHighlight}`,
      };
    }
    return undefined;
  }, [generatorHighlight]);

  if (!editable) {
    return (
      <td className="registers-cell" colSpan={colspan}>
        <span className="registers-cell-static">{formattedValue}</span>
      </td>
    );
  }

  const displayValue = editText !== undefined ? editText : formattedValue;

  return (
    <td className="registers-cell" colSpan={colspan}>
      <input
        className={inputClasses}
        type="text"
        value={displayValue}
        onChange={(e) => onEdit?.(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        style={inputStyle}
      />
    </td>
  );
};

export default React.memo(RegisterCell);
