import React, { useState } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/20/solid";
import { SignalGeneratorConfig } from "../../api";
import { useGenerators } from "./GeneratorsContext";
import { ToggleSwitch, ConfirmDialog } from "../../shared/components";
import WaveChart from "./WaveChart";
import { neonGlowStyle, formatGeneratorValue } from "./utils";

interface GeneratorsListProps {
  generators: SignalGeneratorConfig[];
  generatorValues: Record<string, number>;
  generatorChartSamples: Record<string, number[]>;
}

const GeneratorsList: React.FC<GeneratorsListProps> = ({
  generators,
  generatorValues,
  generatorChartSamples
}) => {
  const {
    handleEditGenerator,
    handleToggleGenerator,
    handleDeleteGenerator
  } = useGenerators();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (generators.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", opacity: 0.7 }}>
        Нет созданных генераторов. Создайте первый генератор.
      </div>
    );
  }

  const genToDelete = confirmDeleteId
    ? generators.find((g) => g.id === confirmDeleteId)
    : null;

  return (
    <div className="signal-generator-list">
      <table className="registers-table">
        <thead>
          <tr className="registers-header-row">
            <th>Имя</th>
            <th>Тип</th>
            <th>Адрес</th>
            <th>График</th>
            <th>Значение</th>
            <th>Период</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {generators.map((g) => (
            <tr key={g.id} className="registers-row">
              <td title={`${g.data_type} · ${g.register_kind === "holding" ? "Holding" : "Input"} · ${g.register_count} рег.`}>
                {g.name || g.id}
              </td>
              <td>{g.wave_type}</td>
              <td>{g.start_address}</td>
              <td>
                <WaveChart
                  generator={g}
                  samples={generatorChartSamples[g.id] ?? []}
                />
              </td>
              <td>
                <input
                  readOnly
                  className="field-input registers-cell-input generator-value-display"
                  value={formatGeneratorValue(g, generatorValues[g.id])}
                  aria-label={`Значение генератора ${g.name || g.id}`}
                  style={g.enabled ? neonGlowStyle(g.neon_color) : undefined}
                />
              </td>
              <td>{g.update_period_ms}ms</td>
              <td>
                <ToggleSwitch
                  checked={g.enabled}
                  onChange={() => void handleToggleGenerator(g.id)}
                  label={g.enabled ? "Выключить генератор" : "Включить генератор"}
                />
              </td>
              <td>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn-chip btn-chip-icon"
                    onClick={() => handleEditGenerator(g.id)}
                    title="Редактировать"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    className="btn-chip btn-chip-icon"
                    data-variant="danger"
                    onClick={() => setConfirmDeleteId(g.id)}
                    title="Удалить"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Удалить генератор?"
        message={`Генератор «${genToDelete?.name || genToDelete?.id || ""}» будет удалён.`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) void handleDeleteGenerator(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default React.memo(GeneratorsList);
