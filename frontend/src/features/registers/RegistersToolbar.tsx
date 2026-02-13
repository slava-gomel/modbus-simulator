import React from "react";
import { RegisterKind, REGISTER_KINDS } from "../../shared/types";

export interface RegistersToolbarProps {
  selectedKind: RegisterKind;
  start: number;
  count: number;
  values: number[];
  onKindChange: (kind: RegisterKind) => void;
  onStartChange: (start: number) => void;
  onCountChange: (count: number) => void;
  onReload: () => void;
  onBatchSave: () => void;
  onPresetApply: (values: number[]) => void;
  showWriteButtons: boolean;
}

/**
 * Панель инструментов для работы с регистрами (тип, диапазон, операции)
 */
const RegistersToolbar: React.FC<RegistersToolbarProps> = ({
  selectedKind,
  start,
  count,
  values,
  onKindChange,
  onStartChange,
  onCountChange,
  onReload,
  onBatchSave,
  onPresetApply,
  showWriteButtons
}) => {
  return (
    <div className="registers-toolbar">
      <div className="field">
        <label className="field-label" htmlFor="reg-kind">
          Тип
        </label>
        <select
          id="reg-kind"
          className="field-select"
          value={selectedKind}
          onChange={(e) => {
            onKindChange(e.target.value as RegisterKind);
            onReload();
          }}
        >
          {REGISTER_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="reg-start">
          Start
        </label>
        <input
          id="reg-start"
          className="field-input"
          type="number"
          value={start}
          onChange={(e) => {
            onStartChange(Number(e.target.value) || 0);
            onReload();
          }}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="reg-count">
          Count
        </label>
        <input
          id="reg-count"
          className="field-input"
          type="number"
          value={count}
          onChange={(e) => {
            onCountChange(Number(e.target.value) || 1);
            onReload();
          }}
        />
      </div>
      <div className="btn-group">
        {showWriteButtons && (
          <>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onBatchSave}
            >
              Сохранить диапазон (batch)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              data-variant="outline"
              onClick={() => {
                const zeros = values.map(() => 0);
                onPresetApply(zeros);
              }}
            >
              Заполнить нулями
            </button>
            <button
              type="button"
              className="btn btn-sm"
              data-variant="ghost"
              onClick={() => {
                const rand = values.map(() =>
                  Math.floor(Math.random() * (selectedKind === "coils" ? 2 : 65536))
                );
                onPresetApply(rand);
              }}
            >
              Случайные значения
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-sm btn-icon"
          onClick={onReload}
        >
          Обновить
        </button>
      </div>
    </div>
  );
};

export default React.memo(RegistersToolbar);
