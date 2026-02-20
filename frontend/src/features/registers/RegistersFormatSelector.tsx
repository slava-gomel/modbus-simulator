import React from "react";
import { RegisterFormatKind, RegisterSign, RegisterOrder } from "../../shared/types";
import { RadioGroup } from "../../shared/components";

export interface RegistersFormatSelectorProps {
  format: RegisterFormatKind;
  sign: RegisterSign;
  order: RegisterOrder;
  onFormatChange: (format: RegisterFormatKind) => void;
  onSignChange: (sign: RegisterSign) => void;
  onOrderChange: (order: RegisterOrder) => void;
}

const formatOptions: { id: RegisterFormatKind; label: string }[] = [
  { id: "int16", label: "INT16" },
  { id: "int32", label: "INT32" },
  { id: "int64", label: "INT64" },
  { id: "float32", label: "FLOAT32" },
  { id: "float64", label: "FLOAT64" },
  { id: "bitmap", label: "BITMAP" }
];

const RegistersFormatSelector: React.FC<RegistersFormatSelectorProps> = ({
  format,
  sign,
  order,
  onFormatChange,
  onSignChange,
  onOrderChange
}) => {
  const signOptions = [
    { id: "unsigned", label: "Unsigned" },
    { id: "signed", label: "Signed" }
  ];

  const orderOptions = [
    { id: "ABCD", label: "ABCD" },
    { id: "CDAB", label: "CDAB" }
  ];

  const showSignedness = format !== "bitmap";
  const showWordOrder =
    format === "int32" ||
    format === "int64" ||
    format === "float32" ||
    format === "float64";

  return (
    <div className="reg-format-wrapper">
      <div className="reg-format-group">
        <div className="reg-format-subrow">
          <div className="reg-format-subrow-label">Формат:</div>
          <select
            className="field-select"
            value={format}
            onChange={(e) => onFormatChange(e.target.value as RegisterFormatKind)}
            style={{ minWidth: 110 }}
          >
            {formatOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        {showSignedness && (
          <RadioGroup
            name="sign"
            label="Знак:"
            options={signOptions}
            value={sign}
            onChange={(val) => onSignChange(val as RegisterSign)}
          />
        )}

        {showWordOrder && (
          <RadioGroup
            name="order"
            label="Порядок:"
            options={orderOptions}
            value={order}
            onChange={(val) => onOrderChange(val as RegisterOrder)}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(RegistersFormatSelector);
