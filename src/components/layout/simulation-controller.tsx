"use client";

import { motion } from "framer-motion";
import { useSimulation } from "@/providers/simulation-provider";
import { PARAM_RANGES } from "@/lib/simulation/parameters";
import { useGhost } from "@/providers/ghost-provider";
import { cn } from "@/lib/utils/cn";

export function SimulationController() {
  const { params, setParams, isGenerating, dataVersion } = useSimulation();
  const { ghosts, pinSnapshot, unpinSnapshot } = useGhost();

  const handlePin = () => {
    const label = `v${dataVersion} · L=${params.latencyFactor.toFixed(1)}x`;
    pinSnapshot(label, params, {});
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-g-border bg-g-surface"
      style={{ height: "var(--spacing-controller)" }}
    >
      <div className="flex items-center h-full px-4 gap-6">
        {/* Label */}
        <div className="shrink-0">
          <div className="text-[9px] text-g-muted uppercase tracking-widest">Simulator</div>
          <div className="text-[11px] text-g-tan font-bold">
            {isGenerating ? (
              <span className="animate-pulse">↻ Regenerating…</span>
            ) : (
              <span>v{dataVersion} · Ready</span>
            )}
          </div>
        </div>

        <div className="w-px h-8 bg-g-border shrink-0" />

        {/* Sliders */}
        <div className="flex items-center gap-6 flex-1">
          {/* Latency */}
          <SliderControl
            label={PARAM_RANGES.latencyFactor.label}
            value={params.latencyFactor}
            min={PARAM_RANGES.latencyFactor.min}
            max={PARAM_RANGES.latencyFactor.max}
            step={PARAM_RANGES.latencyFactor.step}
            display={`${params.latencyFactor.toFixed(2)}×`}
            colorClass="tan"
            onChange={(v) => setParams({ latencyFactor: v })}
          />

          {/* Model Quality */}
          <SliderControl
            label={PARAM_RANGES.modelQuality.label}
            value={params.modelQuality}
            min={PARAM_RANGES.modelQuality.min}
            max={PARAM_RANGES.modelQuality.max}
            step={PARAM_RANGES.modelQuality.step}
            display={`${(params.modelQuality * 100).toFixed(0)}%`}
            colorClass="purple"
            onChange={(v) => setParams({ modelQuality: v })}
          />

          {/* Onboarding Friction */}
          <SliderControl
            label={PARAM_RANGES.onboardingFriction.label}
            value={params.onboardingFriction}
            min={PARAM_RANGES.onboardingFriction.min}
            max={PARAM_RANGES.onboardingFriction.max}
            step={PARAM_RANGES.onboardingFriction.step}
            display={`${(params.onboardingFriction * 100).toFixed(0)}%`}
            colorClass="red"
            onChange={(v) => setParams({ onboardingFriction: v })}
          />
        </div>

        <div className="w-px h-8 bg-g-border shrink-0" />

        {/* Ghost controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pinned ghosts */}
          {ghosts.map((g) => (
            <button
              key={g.id}
              onClick={() => unpinSnapshot(g.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors hover:border-g-red"
              style={{ borderColor: g.color, color: g.color }}
              title={`Unpin: ${g.label}`}
            >
              <span>{g.label}</span>
              <span className="opacity-60">×</span>
            </button>
          ))}

          {/* Pin button */}
          {ghosts.length < 3 && (
            <button
              onClick={handlePin}
              className={cn(
                "px-2 py-1 rounded text-[10px] border border-g-border text-g-muted",
                "hover:border-g-tan hover:text-g-tan transition-colors"
              )}
            >
              + Pin Scenario
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  display,
  colorClass,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  colorClass: "tan" | "purple" | "red";
  onChange: (v: number) => void;
}) {
  const displayColor = {
    tan:    "text-g-tan",
    purple: "text-g-purple",
    red:    "text-g-red",
  }[colorClass];

  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-g-muted uppercase tracking-wider">{label}</span>
        <span className={cn("text-[11px] font-bold tabular-nums", displayColor)}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={colorClass}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
