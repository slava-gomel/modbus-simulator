import React from "react";
import { useRegisters } from "./RegistersContext";
import { useGenerators } from "../generators";
import { REGISTER_KINDS } from "../../shared/types";
import { useCollapse } from "../../shared/hooks";
import RegistersTable from "./RegistersTable";
import CoilsTable from "./CoilsTable";

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
              {collapsed ? "▸" : "▾"}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
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
                    setSelectedKind(e.target.value as any);
                    void reloadRegisters();
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
                    setStart(Number(e.target.value) || 0);
                    void reloadRegisters();
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
                    setCount(Number(e.target.value) || 1);
                    void reloadRegisters();
                  }}
                />
              </div>
              <div className="btn-group">
                {(selectedKind === "coils" || selectedKind === "holding") && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void handleBatchSave()}
                    >
                      Сохранить диапазон (batch)
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      data-variant="outline"
                      onClick={() => {
                        const zeros = values.map(() => 0);
                        void handlePresetApply(zeros);
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
                        void handlePresetApply(rand);
                      }}
                    >
                      Случайные значения
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-icon"
                  onClick={() => void reloadRegisters()}
                >
                  Обновить
                </button>
              </div>
            </div>

            {stateLoading && <div className="panel-subtitle">Загрузка…</div>}
            {stateError && (
              <div className="error-text">
                <span className="error-dot" />
                {stateError}
              </div>
            )}

            {selectedKind === "holding" && (
              <div className="registers-format-toolbar">
                <div className="field">
                  <label className="field-label" htmlFor="fmt-kind">
                    Формат
                  </label>
                  <select
                    id="fmt-kind"
                    className="field-select"
                    value={registerFormatKind}
                    onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                  >
                    <option value="int16">INT16</option>
                    <option value="int32">INT32</option>
                    <option value="int64">INT64</option>
                    <option value="float32">FLOAT32</option>
                    <option value="float64">FLOAT64</option>
                    <option value="bitmap">BITMAP</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="fmt-sign">
                    Знак
                  </label>
                  <select
                    id="fmt-sign"
                    className="field-select"
                    value={registerSign}
                    onChange={(e) => setRegisterSign(e.target.value as any)}
                  >
                    <option value="unsigned">Unsigned</option>
                    <option value="signed">Signed</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="fmt-order">
                    Порядок байт
                  </label>
                  <select
                    id="fmt-order"
                    className="field-select"
                    value={registerOrder}
                    onChange={(e) => setRegisterOrder(e.target.value as any)}
                  >
                    <option value="ABCD">ABCD</option>
                    <option value="CDAB">CDAB</option>
                  </select>
                </div>
              </div>
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
