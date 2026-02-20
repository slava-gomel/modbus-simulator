import React from "react";
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { useGenerators } from "./GeneratorsContext";
import { useCollapse } from "../../shared/hooks";
import GeneratorForm from "./GeneratorForm";
import GeneratorsList from "./GeneratorsList";

const GeneratorsPanel: React.FC = () => {
  const {
    signalGenerators,
    editingGenerator,
    generatorValues,
    generatorChartSamples,
    handleCreateGenerator
  } = useGenerators();

  const [collapsed, toggleCollapsed] = useCollapse(false);

  return (
    <section className="panel panel-generators">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <div className="panel-title">Генератор сигналов</div>
            {!collapsed && (
              <div className="panel-subtitle">
                Автоматическое обновление holding‑регистров по заданному сигналу
              </div>
            )}
          </div>
          <div className="panel-toolbar">
            {!collapsed && !editingGenerator && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleCreateGenerator}
              >
                <PlusIcon />
                Создать генератор
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-icon panel-toggle"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Развернуть генераторы" : "Свернуть генераторы"}
            >
              {collapsed
                ? <ChevronRightIcon style={{ width: 18, height: 18 }} />
                : <ChevronDownIcon style={{ width: 18, height: 18 }} />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {editingGenerator && (
              <GeneratorForm
                generator={editingGenerator}
                chartSamples={generatorChartSamples[editingGenerator.id] ?? []}
              />
            )}

            {!editingGenerator && (
              <GeneratorsList
                generators={signalGenerators}
                generatorValues={generatorValues}
                generatorChartSamples={generatorChartSamples}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default React.memo(GeneratorsPanel);
