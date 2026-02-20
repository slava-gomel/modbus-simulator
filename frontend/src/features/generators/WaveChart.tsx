import React from "react";
import { SignalGeneratorConfig } from "../../api";
import { DEFAULT_NEON_COLOR } from "../../shared/constants";
import { getSignalWavePathLive } from "./utils";

interface WaveChartProps {
  generator: SignalGeneratorConfig;
  samples: number[];
  size?: "sm" | "lg";
}

const SIZES = {
  sm: { w: 120, h: 32, className: "generator-wave-chart" },
  lg: { w: 240, h: 80, className: "generator-wave-chart-lg" },
};

const WaveChart: React.FC<WaveChartProps> = ({ generator, samples, size = "sm" }) => {
  const { w, h, className } = SIZES[size];
  const path = getSignalWavePathLive(samples, generator, w, h);
  const color = generator.neon_color ?? DEFAULT_NEON_COLOR;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default React.memo(WaveChart);
