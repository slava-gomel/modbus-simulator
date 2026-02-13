import React from "react";
import { SignalGeneratorConfig } from "../../api";
import { DEFAULT_NEON_COLOR } from "../../shared/constants";
import { getSignalWavePathLive } from "./utils";

interface WaveChartProps {
  generator: SignalGeneratorConfig;
  samples: number[];
}

/**
 * SVG-график сигнала генератора в реальном времени
 */
const WaveChart: React.FC<WaveChartProps> = ({ generator, samples }) => {
  const path = getSignalWavePathLive(samples, generator);
  const color = generator.neon_color ?? DEFAULT_NEON_COLOR;

  return (
    <svg
      className="generator-wave-chart"
      viewBox="0 0 120 32"
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
