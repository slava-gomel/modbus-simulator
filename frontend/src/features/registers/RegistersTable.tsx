import React, { useMemo } from "react";
import { RegisterKind, RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";
import RegisterCell from "./RegisterCell";
import { SignalGeneratorConfig } from "../../api";
import { DEFAULT_NEON_COLOR } from "../../shared/constants";

interface RegistersTableProps {
  kind: RegisterKind;
  start: number;
  values: number[];
  registerFormatKind: RegisterFormatKind;
  registerSign: RegisterSign;
  registerOrder: RegisterOrder;
  editHolding: Record<number, string>;
  isRecentlyChanged: (kind: "coils" | "holding", addr: number) => boolean;
  signalGenerators: SignalGeneratorConfig[];
  onHoldingEdit: (globalIndex: number, text: string) => void;
  onHoldingBlur: (globalIndex: number, text: string) => void;
}

/**
 * Таблица для holding и input регистров
 */
const RegistersTable: React.FC<RegistersTableProps> = ({
  kind,
  start,
  values,
  registerFormatKind,
  registerSign,
  registerOrder,
  editHolding,
  isRecentlyChanged,
  signalGenerators,
  onHoldingEdit,
  onHoldingBlur
}) => {
  const columnsPerRow = 8;
  const isEditable = kind === "holding";

  const registerRows: number[][] = useMemo(() => {
    const rows: number[][] = [];
    for (let i = 0; i < values.length; i += columnsPerRow) {
      rows.push(values.slice(i, i + columnsPerRow));
    }
    return rows;
  }, [values, columnsPerRow]);

  const getGeneratorHighlightForAddress = (addr: number): string | null => {
    if (kind !== "holding") return null;
    for (const g of signalGenerators) {
      if (!g.enabled || g.register_kind !== "holding") continue;
      const genEnd = g.start_address + g.register_count;
      if (addr >= g.start_address && addr < genEnd) {
        return g.neon_color ?? DEFAULT_NEON_COLOR;
      }
    }
    return null;
  };

  return (
    <div className="registers-container">
      <table className="registers-table">
        <thead>
          <tr className="registers-header-row">
            <th>ADDRESS RANGE</th>
            {Array.from({ length: columnsPerRow }, (_, i) => (
              <th key={i}>+{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registerRows.map((row, rowIndex) => {
            const rowStart = start + rowIndex * columnsPerRow;
            const rowEnd = rowStart + row.length - 1;
            return (
              <tr key={rowIndex} className="registers-row">
                <td className="registers-addr-cell">
                  {rowStart}–{rowEnd}
                </td>
                {row.map((value, colIndex) => {
                  const globalIndex = rowIndex * columnsPerRow + colIndex;
                  const addr = start + globalIndex;
                  const isChanged = isRecentlyChanged(kind === "holding" ? "holding" : "coils", addr);
                  const generatorHighlight = getGeneratorHighlightForAddress(addr);
                  
                  return (
                    <RegisterCell
                      key={colIndex}
                      globalIndex={globalIndex}
                      rawValue={value}
                      values={values}
                      registerFormatKind={registerFormatKind}
                      registerSign={registerSign}
                      registerOrder={registerOrder}
                      editable={isEditable}
                      editText={editHolding[globalIndex]}
                      isRecentlyChanged={isChanged}
                      generatorHighlight={generatorHighlight}
                      onEdit={(text) => onHoldingEdit(globalIndex, text)}
                      onBlur={(text) => onHoldingBlur(globalIndex, text)}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(RegistersTable);
