import React from "react";
import { SignalGeneratorConfig } from "../../api";
import { useGenerators } from "./GeneratorsContext";
import WaveChart from "./WaveChart";
import { neonGlowStyle, formatGeneratorValue } from "./utils";

interface GeneratorsListProps {
  generators: SignalGeneratorConfig[];
  // Текущее числовое значение генератора (последнее известное)
  generatorValues: Record<string, number>;
  generatorChartSamples: Record<string, number[]>;
}

/**
 * Таблица со списком генераторов
 */
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

  if (generators.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", opacity: 0.7 }}>
        Нет созданных генераторов. Создайте первый генератор.
      </div>
    );
  }

  return (
    <div className="signal-generator-list">
      <table className="registers-table">
        <thead>
          <tr className="registers-header-row">
            <th>Имя</th>
            <th>Тип сигнала</th>
            <th>Формат</th>
            <th>Область</th>
            <th>Адрес</th>
            <th>График</th>
            <th>Значение</th>
            <th>Период, мс</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {generators.map((g) => (
            <tr key={g.id} className="registers-row">
              <td>{g.name || g.id}</td>
              <td>{g.wave_type}</td>
              <td>{g.data_type}</td>
              <td>{g.register_kind === "holding" ? "Holding (03/06)" : "Input (04)"}</td>
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
              <td>{g.update_period_ms}</td>
              <td>{g.enabled ? "Вкл" : "Выкл"}</td>
              <td>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => handleEditGenerator(g.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => void handleToggleGenerator(g.id)}
                  >
                    {g.enabled ? "Выключить" : "Включить"}
                  </button>
                  <button
                    type="button"
                    className="btn-chip"
                    data-variant="danger"
                    onClick={() => void handleDeleteGenerator(g.id)}
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(GeneratorsList);
