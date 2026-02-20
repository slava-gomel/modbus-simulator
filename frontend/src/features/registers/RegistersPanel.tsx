import React from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { useRegisters } from "./RegistersContext";
import { useGenerators } from "../generators";
import { useCollapse } from "../../shared/hooks";
import { Skeleton } from "../../shared/components";
import RegistersTable from "./RegistersTable";
import CoilsTable from "./CoilsTable";
import RegistersToolbar from "./RegistersToolbar";
import RegistersFormatSelector from "./RegistersFormatSelector";

const RegistersPanel: React.FC = () => {
  const {
    selectedKind,
    start,
    count,
    values,
    stateLoading,
    stateError,
    registerFormatKind,
    registerSign,
    registerOrder,
    editHolding,
    setSelectedKind,
    setStart,
    setCount,
    setRegisterFormatKind,
    setRegisterSign,
    setRegisterOrder,
    setEditHolding,
    reloadRegisters,
    handleCellChange,
    handleHoldingValueChange,
    handleBatchSave,
    handlePresetApply,
    isRegisterRecentlyChanged
  } = useRegisters();

  const { signalGenerators } = useGenerators();

  const [collapsed, toggleCollapsed] = useCollapse(false);

  const handleHoldingEdit = (globalIndex: number, text: string) => {
    setEditHolding((prev) => ({ ...prev, [globalIndex]: text }));
  };

  const handleHoldingBlur = (globalIndex: number, text: string) => {
    void handleHoldingValueChange(globalIndex, text);
  };

  return (
    <section className="panel panel-registers">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <div className="panel-title">Регистры</div>
            {!collapsed && (
              <div className="panel-subtitle">
                Чтение и запись диапазонов регистров, пресеты и batch‑операции
              </div>
            )}
          </div>
          <div className="panel-toolbar">
            <button
              type="button"
              className="btn btn-sm btn-icon panel-toggle"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Развернуть регистры" : "Свернуть регистры"}
            >
              {collapsed
                ? <ChevronRightIcon style={{ width: 18, height: 18 }} />
                : <ChevronDownIcon style={{ width: 18, height: 18 }} />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            <RegistersToolbar
              selectedKind={selectedKind}
              start={start}
              count={count}
              values={values}
              onKindChange={setSelectedKind}
              onStartChange={setStart}
              onCountChange={setCount}
              onReload={reloadRegisters}
              onBatchSave={handleBatchSave}
              onPresetApply={handlePresetApply}
              showWriteButtons={
                selectedKind === "coils" ||
                selectedKind === "holding" ||
                selectedKind === "input"
              }
            />

            {stateLoading && values.length === 0 && (
              <Skeleton variant="table" rows={2} />
            )}
            {stateError && (
              <div className="error-text">
                <span className="error-dot" />
                {stateError}
              </div>
            )}

            {(selectedKind === "holding" || selectedKind === "input") && (
              <RegistersFormatSelector
                format={registerFormatKind}
                sign={registerSign}
                order={registerOrder}
                onFormatChange={setRegisterFormatKind}
                onSignChange={setRegisterSign}
                onOrderChange={setRegisterOrder}
              />
            )}

            {selectedKind === "coils" || selectedKind === "discrete_inputs" ? (
              <CoilsTable
                kind={selectedKind}
                start={start}
                values={values}
                isRecentlyChanged={isRegisterRecentlyChanged}
                onCellChange={handleCellChange}
              />
            ) : (
              <RegistersTable
                kind={selectedKind}
                start={start}
                values={values}
                registerFormatKind={registerFormatKind}
                registerSign={registerSign}
                registerOrder={registerOrder}
                editHolding={editHolding}
                isRecentlyChanged={isRegisterRecentlyChanged}
                signalGenerators={signalGenerators}
                onHoldingEdit={handleHoldingEdit}
                onHoldingBlur={handleHoldingBlur}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default React.memo(RegistersPanel);
