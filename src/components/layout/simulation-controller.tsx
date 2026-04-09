"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "@/providers/simulation-provider";
import { PARAM_RANGES } from "@/lib/simulation/parameters";
import { useGhost } from "@/providers/ghost-provider";
import { cn } from "@/lib/utils/cn";

const PRESETS = [
  { label: "Baseline",        latencyFactor: 1.0, modelQuality: 0.7,  onboardingFriction: 0.3  },
  { label: "Ideal State",     latencyFactor: 0.5, modelQuality: 1.0,  onboardingFriction: 0.05 },
  { label: "Latency Crisis",  latencyFactor: 2.8, modelQuality: 0.7,  onboardingFriction: 0.3  },
  { label: "Quality Drop",    latencyFactor: 1.0, modelQuality: 0.15, onboardingFriction: 0.3  },
  { label: "Friction Wall",   latencyFactor: 1.0, modelQuality: 0.7,  onboardingFriction: 0.9  },
] as const;

export function SimulationController() {
  const { params, setParams, isGenerating, dataVersion } = useSimulation();
  const { ghosts, pinSnapshot, unpinSnapshot } = useGhost();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const handlePin = () => {
    const label = `v${dataVersion} · L=${params.latencyFactor.toFixed(1)}x`;
    pinSnapshot(label, params, {});
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setParams({ latencyFactor: p.latencyFactor, modelQuality: p.modelQuality, onboardingFriction: p.onboardingFriction });
  };

  const isActivePreset = (p: typeof PRESETS[number]) =>
    Math.abs(params.latencyFactor - p.latencyFactor) < 0.05 &&
    Math.abs(params.modelQuality - p.modelQuality) < 0.05 &&
    Math.abs(params.onboardingFriction - p.onboardingFriction) < 0.05;

  const statusText = isGenerating
    ? <span className="animate-pulse">↻ Regenerating…</span>
    : <span>v{dataVersion} · Ready</span>;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-g-border bg-g-surface"
    >
      {/* ── Desktop bar (md+) ────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex items-center h-full px-4 gap-6"
        style={{ height: "var(--spacing-controller)" }}
      >
        {/* Label */}
        <div className="shrink-0">
          <div className="text-[9px] text-g-muted uppercase tracking-widest">Simulator</div>
          <div className="text-[11px] text-g-tan font-bold">{statusText}</div>
        </div>

        <div className="w-px h-8 bg-g-border shrink-0" />

        {/* Scenario presets */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-g-dim uppercase tracking-widest mr-1">Presets</span>
          {PRESETS.map((p) => {
            const active = isActivePreset(p);
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] border transition-colors whitespace-nowrap",
                  active
                    ? "border-g-tan text-g-tan bg-g-tan/10"
                    : "border-g-border text-g-dim hover:border-g-muted hover:text-g-muted"
                )}
                title={`L=${p.latencyFactor}x · Q=${(p.modelQuality * 100).toFixed(0)}% · F=${(p.onboardingFriction * 100).toFixed(0)}%`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-8 bg-g-border shrink-0" />

        {/* Sliders */}
        <div className="flex items-center gap-6 flex-1">
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

      {/* ── Mobile bar (< md) ────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ height: mobileExpanded ? "auto" : "var(--spacing-controller)" }}>
        {/* Collapsed strip */}
        <div className="flex items-center justify-between px-3 h-11">
          <div>
            <div className="text-[9px] text-g-muted uppercase tracking-widest leading-none">Simulator</div>
            <div className="text-[11px] text-g-tan font-bold leading-tight">{statusText}</div>
          </div>
          <button
            onClick={() => setMobileExpanded((v) => !v)}
            className="text-[11px] text-g-muted hover:text-g-tan border border-g-border hover:border-g-tan rounded px-2 py-0.5 transition-colors"
          >
            SIM {mobileExpanded ? "▼" : "▲"}
          </button>
        </div>

        {/* Expanded panel */}
        <AnimatePresence>
          {mobileExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-g-border-dim"
            >
              <div className="px-3 py-3 space-y-3">
                {/* Presets */}
                <div>
                  <div className="text-[9px] text-g-dim uppercase tracking-widest mb-1.5">Presets</div>
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => {
                      const active = isActivePreset(p);
                      return (
                        <button
                          key={p.label}
                          onClick={() => applyPreset(p)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] border transition-colors",
                            active
                              ? "border-g-tan text-g-tan bg-g-tan/10"
                              : "border-g-border text-g-dim hover:border-g-muted hover:text-g-muted"
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sliders stacked */}
                <div className="space-y-2">
                  <SliderControl
                    label={PARAM_RANGES.latencyFactor.label}
                    value={params.latencyFactor}
                    min={PARAM_RANGES.latencyFactor.min}
                    max={PARAM_RANGES.latencyFactor.max}
                    step={PARAM_RANGES.latencyFactor.step}
                    display={`${params.latencyFactor.toFixed(2)}×`}
                    colorClass="tan"
                    onChange={(v) => setParams({ latencyFactor: v })}
                    fullWidth
                  />
                  <SliderControl
                    label={PARAM_RANGES.modelQuality.label}
                    value={params.modelQuality}
                    min={PARAM_RANGES.modelQuality.min}
                    max={PARAM_RANGES.modelQuality.max}
                    step={PARAM_RANGES.modelQuality.step}
                    display={`${(params.modelQuality * 100).toFixed(0)}%`}
                    colorClass="purple"
                    onChange={(v) => setParams({ modelQuality: v })}
                    fullWidth
                  />
                  <SliderControl
                    label={PARAM_RANGES.onboardingFriction.label}
                    value={params.onboardingFriction}
                    min={PARAM_RANGES.onboardingFriction.min}
                    max={PARAM_RANGES.onboardingFriction.max}
                    step={PARAM_RANGES.onboardingFriction.step}
                    display={`${(params.onboardingFriction * 100).toFixed(0)}%`}
                    colorClass="red"
                    onChange={(v) => setParams({ onboardingFriction: v })}
                    fullWidth
                  />
                </div>

                {/* Ghost controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {ghosts.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => unpinSnapshot(g.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors hover:border-g-red"
                      style={{ borderColor: g.color, color: g.color }}
                      title={`Unpin: ${g.label}`}
                    >
                      <span>{g.label}</span>
                      <span className="opacity-60">×</span>
                    </button>
                  ))}
                  {ghosts.length < 3 && (
                    <button
                      onClick={handlePin}
                      className="px-2 py-0.5 rounded text-[10px] border border-g-border text-g-muted hover:border-g-tan hover:text-g-tan transition-colors"
                    >
                      + Pin Scenario
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
  fullWidth,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  colorClass: "tan" | "purple" | "red";
  onChange: (v: number) => void;
  fullWidth?: boolean;
}) {
  const displayColor = {
    tan:    "text-g-tan",
    purple: "text-g-purple",
    red:    "text-g-red",
  }[colorClass];

  return (
    <div className={cn("flex flex-col gap-0.5", fullWidth ? "w-full" : "min-w-[140px]")}>
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
