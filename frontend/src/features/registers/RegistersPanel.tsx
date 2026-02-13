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
              <div className="reg-format-wrapper">
                <div className="reg-format-label">Формат отображения</div>
                <div className="reg-format-group">
                  <div className="reg-format-subrow">
                    <div className="reg-format-subrow-label">FORMAT:</div>
                    <div className="reg-format-option">
                      <input
                        type="radio"
                        id="fmt-int16"
                        name="format"
                        value="int16"
                        checked={registerFormatKind === "int16"}
                        onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                      />
                      <label htmlFor="fmt-int16">INT16</label>
                    </div>
                    <div className="reg-format-option">
                      <input
                        type="radio"
                        id="fmt-int32"
                        name="format"
                        value="int32"
                        checked={registerFormatKind === "int32"}
                        onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                      />
                      <label htmlFor="fmt-int32">INT32</label>
                    </div>
                    <div className="reg-format-option">
                      <input
                        type="radio"
                        id="fmt-int64"
                        name="format"
                        value="int64"
                        checked={registerFormatKind === "int64"}
                        onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                      />
                      <label htmlFor="fmt-int64">INT64</label>
                    </div>
                    <div className="reg-format-option">
                      <input
                        type="radio"
                        id="fmt-float32"
                        name="format"
                        value="float32"
                        checked={registerFormatKind === "float32"}
                        onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                      />
                      <label htmlFor="fmt-float32">FLOAT32</label>
                    </div>
                    <div className="reg-format-option">
                      <input
                        type="radio"
                        id="fmt-float64"
                        name="format"
                        value="float64"
                        checked={registerFormatKind === "float64"}
                        onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                      />
                      <label htmlFor="fmt-float64">FLOAT64</label>
                    </div>
                    <div className="reg-format-option">
                      <input
                        type="radio"
                        id="fmt-bitmap"
                        name="format"
                        value="bitmap"
                        checked={registerFormatKind === "bitmap"}
                        onChange={(e) => setRegisterFormatKind(e.target.value as any)}
                      />
                      <label htmlFor="fmt-bitmap">BITMAP</label>
                    </div>
                  </div>

                  {registerFormatKind !== "bitmap" && (
                    <div className="reg-format-subrow">
                      <div className="reg-format-subrow-label">SIGNEDNESS:</div>
                      <div className="reg-format-option">
                        <input
                          type="radio"
                          id="sign-unsigned"
                          name="sign"
                          value="unsigned"
                          checked={registerSign === "unsigned"}
                          onChange={(e) => setRegisterSign(e.target.value as any)}
                        />
                        <label htmlFor="sign-unsigned">Unsigned</label>
                      </div>
                      <div className="reg-format-option">
                        <input
                          type="radio"
                          id="sign-signed"
                          name="sign"
                          value="signed"
                          checked={registerSign === "signed"}
                          onChange={(e) => setRegisterSign(e.target.value as any)}
                        />
                        <label htmlFor="sign-signed">Signed</label>
                      </div>
                    </div>
                  )}

                  {(registerFormatKind === "int32" || 
                    registerFormatKind === "int64" || 
                    registerFormatKind === "float32" || 
                    registerFormatKind === "float64") && (
                    <div className="reg-format-subrow">
                      <div className="reg-format-subrow-label">WORD ORDER:</div>
                      <div className="reg-format-option">
                        <input
                          type="radio"
                          id="order-abcd"
                          name="order"
                          value="ABCD"
                          checked={registerOrder === "ABCD"}
                          onChange={(e) => setRegisterOrder(e.target.value as any)}
                        />
                        <label htmlFor="order-abcd">ABCD</label>
                      </div>
                      <div className="reg-format-option">
                        <input
                          type="radio"
                          id="order-cdab"
                          name="order"
                          value="CDAB"
                          checked={registerOrder === "CDAB"}
                          onChange={(e) => setRegisterOrder(e.target.value as any)}
                        />
                        <label htmlFor="order-cdab">CDAB</label>
                      </div>
                    </div>
                  )}
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
