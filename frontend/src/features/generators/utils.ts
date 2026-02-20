import { SignalGeneratorConfig, SignalWaveType } from "../../api";
import { DEFAULT_NEON_COLOR } from "../../shared/constants";

/**
 * Стиль неоновой подсветки для генераторов
 */
export const neonGlowStyle = (hex: string | null | undefined): React.CSSProperties => {
  const color = hex && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : DEFAULT_NEON_COLOR;
  return {
    borderColor: color,
    boxShadow: `0 0 6px ${color}, 0 0 12px ${color}, 0 0 20px ${color}`,
  };
};

/**
 * Форматирование значения генератора по его data_type.
 * Принимает уже вычисленное числовое значение (из WebSocket).
 */
export const formatGeneratorValue = (g: SignalGeneratorConfig, value: number | undefined): string => {
  if (value === undefined) return "—";
  if (g.data_type === "int16") return String(Math.round(value));
  return Number.isFinite(value) ? String(value) : "—";
};

/**
 * Числовое значение генератора из сырых регистров (для графика и расчётов)
 */
export const getGeneratorNumericValue = (g: SignalGeneratorConfig, rawValues: number[]): number => {
  if (!rawValues.length) return 0;
  const regs = rawValues.map((v) => v & 0xffff);
  
  if (g.data_type === "int16") {
    const v = regs[0];
    return v > 0x7fff ? v - 0x10000 : v;
  }
  
  if (g.data_type === "float32" && regs.length >= 2) {
    const word = (regs[0] << 16) | regs[1];
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, word >>> 0);
    return view.getFloat32(0);
  }
  
  if (g.data_type === "float64" && regs.length >= 4) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint16(0, regs[0]);
    view.setUint16(2, regs[1]);
    view.setUint16(4, regs[2]);
    view.setUint16(6, regs[3]);
    return view.getFloat64(0);
  }
  
  return 0;
};

/**
 * Путь одного периода сигнала для мини-графика (запасной вариант при отсутствии выборок)
 */
export const getSignalWavePathStatic = (waveType: SignalWaveType): string => {
  const w = 120;
  const h = 32;
  const pad = 2;
  const cy = h / 2;
  const amp = (h - 2 * pad) / 2;
  const pts: string[] = [];
  const n = 48;
  
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let val: number;
    if (waveType === "sine") {
      val = Math.sin(2 * Math.PI * t);
    } else if (waveType === "saw") {
      val = 2 * t - 1;
    } else if (waveType === "square") {
      val = t < 0.5 ? 1 : -1;
    } else {
      val = 0;
    }
    const x = pad + t * (w - 2 * pad);
    const y = cy - amp * val;
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  
  return "M " + pts.join(" L ");
};

/**
 * Путь графика по живым выборкам (нормализация по offset/amplitude генератора)
 */
export const getSignalWavePathLive = (samples: number[], g: SignalGeneratorConfig, w = 120, h = 32): string => {
  const pad = 2;
  const cy = h / 2;
  const amp = (h - 2 * pad) / 2;
  
  if (samples.length < 2) return getSignalWavePathStatic(g.wave_type);
  
  const a = g.amplitude !== 0 ? g.amplitude : 1;
  const pts: string[] = [];
  
  for (let i = 0; i < samples.length; i++) {
    const normalized = (samples[i] - g.offset) / a;
    const clamped = Math.max(-1, Math.min(1, normalized));
    const x = pad + (i / (samples.length - 1)) * (w - 2 * pad);
    const y = cy - amp * clamped;
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  
  return "M " + pts.join(" L ");
};

/**
 * Форматирование всех параметров генератора для журнала
 */
export const formatGeneratorLogParams = (g: SignalGeneratorConfig): string => {
  return [
    `id=${g.id}`,
    `имя=${g.name ?? "-"}`,
    `включен=${g.enabled ? "да" : "нет"}`,
    `register_kind=${g.register_kind}`,
    `start_address=${g.start_address}`,
    `register_count=${g.register_count}`,
    `data_type=${g.data_type}`,
    `wave_type=${g.wave_type}`,
    `amplitude=${g.amplitude}`,
    `offset=${g.offset}`,
    `frequency_hz=${g.frequency_hz}`,
    `update_period_ms=${g.update_period_ms}`,
    `neon_color=${g.neon_color ?? "-"}`
  ].join("; ");
};
