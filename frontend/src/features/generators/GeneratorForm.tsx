import React, { useState } from "react";
import { SignalGeneratorConfig } from "../../api";
import { DEFAULT_NEON_COLOR } from "../../shared/constants";
import { useGenerators } from "./GeneratorsContext";
import WaveChart from "./WaveChart";

interface GeneratorFormProps {
  generator: SignalGeneratorConfig;
  chartSamples: number[];
}

/**
 * Форма создания/редактирования генератора сигналов
 */
const GeneratorForm: React.FC<GeneratorFormProps> = ({ generator, chartSamples }) => {
  const { handleSaveGenerator, handleCancelEditGenerator, setEditingGenerator } = useGenerators();
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  const handleFieldChange = (field: keyof SignalGeneratorConfig, value: any) => {
    setEditingGenerator((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleNumericFieldChange = (field: string, value: string) => {
    setEditFields((prev) => ({ ...prev, [field]: value }));
  };

  const applyNumericField = (
    field: "start_address" | "amplitude" | "offset" | "frequency_hz" | "update_period_ms",
    raw: string
  ) => {
    const trimmed = raw.replace(",", ".").trim();
    const defaults: Record<string, number> = {
      start_address: 0,
      amplitude: 1,
      offset: 0,
      frequency_hz: 1,
      update_period_ms: 100,
    };

    setEditFields((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "+") {
      handleFieldChange(field, defaults[field]);
      return;
    }

    const num = field === "start_address" || field === "update_period_ms"
      ? Math.floor(Number(trimmed))
      : Number(trimmed);

    if (!Number.isFinite(num)) {
      handleFieldChange(field, defaults[field]);
      return;
    }

    if (field === "start_address" && num < 0) {
      handleFieldChange(field, 0);
      return;
    }

    if (field === "frequency_hz" && num <= 0) {
      handleFieldChange(field, 1);
      return;
    }

    if (field === "update_period_ms" && num < 10) {
      handleFieldChange(field, 10);
      return;
    }

    handleFieldChange(field, num);
  };

  const getFieldValue = (field: string): string => {
    if (editFields[field] !== undefined) return editFields[field];
    const val = (generator as any)[field];
    return val !== undefined ? String(val) : "";
  };

  return (
    <div className="signal-generator-form">
      <div className="panel-section">
        <div className="input-row">
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="gen-name">
              Имя генератора
            </label>
            <input
              id="gen-name"
              className="field-input"
              type="text"
              placeholder="Например: sin1"
              value={generator.name ?? ""}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="field">
            <label className="field-label" htmlFor="gen-wave-type">
              Тип сигнала
            </label>
            <select
              id="gen-wave-type"
              className="field-select"
              value={generator.wave_type}
              onChange={(e) => handleFieldChange("wave_type", e.target.value)}
            >
              <option value="sine">Синус</option>
              <option value="saw">Пила</option>
              <option value="square">Меандр</option>
              <option value="constant">Константа</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="gen-data-type">
              Формат данных
            </label>
            <select
              id="gen-data-type"
              className="field-select"
              value={generator.data_type}
              onChange={(e) => {
                const dataType = e.target.value as any;
                handleFieldChange("data_type", dataType);
                // Автоматически обновить register_count
                let count = 1;
                if (dataType === "float32") count = 2;
                if (dataType === "float64") count = 4;
                handleFieldChange("register_count", count);
              }}
            >
              <option value="int16">INT16 (1 регистр)</option>
              <option value="float32">FLOAT32 (2 регистра)</option>
              <option value="float64">FLOAT64 (4 регистра)</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="gen-start-addr">
              Стартовый адрес
            </label>
            <input
              id="gen-start-addr"
              className="field-input"
              type="text"
              value={getFieldValue("start_address")}
              onChange={(e) => handleNumericFieldChange("start_address", e.target.value)}
              onBlur={(e) => applyNumericField("start_address", e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="field">
            <label className="field-label" htmlFor="gen-amplitude">
              Амплитуда
            </label>
            <input
              id="gen-amplitude"
              className="field-input"
              type="text"
              value={getFieldValue("amplitude")}
              onChange={(e) => handleNumericFieldChange("amplitude", e.target.value)}
              onBlur={(e) => applyNumericField("amplitude", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="gen-offset">
              Смещение
            </label>
            <input
              id="gen-offset"
              className="field-input"
              type="text"
              value={getFieldValue("offset")}
              onChange={(e) => handleNumericFieldChange("offset", e.target.value)}
              onBlur={(e) => applyNumericField("offset", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="gen-frequency">
              Частота, Гц
            </label>
            <input
              id="gen-frequency"
              className="field-input"
              type="text"
              value={getFieldValue("frequency_hz")}
              onChange={(e) => handleNumericFieldChange("frequency_hz", e.target.value)}
              onBlur={(e) => applyNumericField("frequency_hz", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="gen-period">
              Период обновления, мс
            </label>
            <input
              id="gen-period"
              className="field-input"
              type="text"
              value={getFieldValue("update_period_ms")}
              onChange={(e) => handleNumericFieldChange("update_period_ms", e.target.value)}
              onBlur={(e) => applyNumericField("update_period_ms", e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="field">
            <label className="field-label" htmlFor="gen-neon-color">
              Цвет подсветки
            </label>
            <input
              id="gen-neon-color"
              className="field-input"
              type="color"
              value={generator.neon_color ?? DEFAULT_NEON_COLOR}
              onChange={(e) => handleFieldChange("neon_color", e.target.value)}
              style={{ height: "2.5rem", cursor: "pointer" }}
            />
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label className="field-label">Предпросмотр графика</label>
            <div style={{ marginTop: "0.5rem" }}>
              <WaveChart generator={generator} samples={chartSamples} />
            </div>
          </div>
        </div>

        <div className="btn-group">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void handleSaveGenerator()}
          >
            Сохранить
          </button>
          <button
            type="button"
            className="btn btn-sm"
            data-variant="ghost"
            onClick={handleCancelEditGenerator}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GeneratorForm);
