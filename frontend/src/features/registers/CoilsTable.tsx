import React, { useMemo } from "react";
import { RegisterKind } from "../../shared/types";

interface CoilsTableProps {
  kind: RegisterKind;
  start: number;
  values: number[];
  isRecentlyChanged: (kind: "coils" | "holding", addr: number) => boolean;
  onCellChange: (index: number, newValue: number) => Promise<void>;
}

/**
 * Битовая таблица для coils и discrete_inputs
 */
const CoilsTable: React.FC<CoilsTableProps> = ({
  kind,
  start,
  values,
  isRecentlyChanged,
  onCellChange
}) => {
  const bitsPerRow = 32;
  const isReadOnly = kind === "discrete_inputs";
  
  const bitRows: number[][] = useMemo(() => {
    const rows: number[][] = [];
    for (let i = 0; i < values.length; i += bitsPerRow) {
      rows.push(values.slice(i, i + bitsPerRow));
    }
    return rows;
  }, [values, bitsPerRow]);

  const handleBitToggle = (index: number) => {
    if (isReadOnly) return;
    const currentValue = values[index] ?? 0;
    const newValue = currentValue === 0 ? 1 : 0;
    void onCellChange(index, newValue);
  };

  return (
    <div className="registers-bits-container">
      <table className="registers-table registers-table-bits">
        <thead>
          <tr className="registers-header-row">
            <th>ADDRESS RANGE</th>
            {Array.from({ length: bitsPerRow }, (_, i) => (
              <th key={i}>+{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bitRows.map((row, rowIndex) => {
            const rowStart = start + rowIndex * bitsPerRow;
            const rowEnd = rowStart + row.length - 1;
            return (
              <tr key={rowIndex} className="registers-row">
                <td className="registers-addr-cell">
                  {rowStart}–{rowEnd}
                </td>
                {row.map((bit, colIndex) => {
                  const addr = rowStart + colIndex;
                  const isChanged = isRecentlyChanged(kind === "coils" ? "coils" : "coils", addr);
                  const bitClass = `registers-bit-btn${isChanged ? " modbusFlash" : ""}`;
                  
                  return (
                    <td key={colIndex} className="registers-cell registers-cell-bit">
                      <button
                        type="button"
                        className={bitClass}
                        data-state={bit === 1 ? "on" : "off"}
                        onClick={() => handleBitToggle(rowIndex * bitsPerRow + colIndex)}
                        disabled={isReadOnly}
                        aria-label={`Бит ${addr}: ${bit === 1 ? "включён" : "выключен"}`}
                      >
                        {bit === 1 ? "1" : "0"}
                      </button>
                    </td>
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

export default React.memo(CoilsTable);
