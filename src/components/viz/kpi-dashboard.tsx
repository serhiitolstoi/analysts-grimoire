"use client";

import { useEffect, useState, useCallback } from "react";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { KPI_DASHBOARD_SQL } from "@/lib/sql/kpi.sql";

interface KpiRow {
  activation_rate:   number;
  week4_retention:   number;
  artifact_adoption: number;
  overall_churn_pct: number;
  median_iat_days:   number;
}

interface Metric {
  key:       keyof KpiRow;
  label:     string;
  format:    (v: number) => string;
  benchmark: { good: number; warn: number; direction: "higher" | "lower" };
  desc:      string;
}

const METRICS: Metric[] = [
  {
    key: "activation_rate",
    label: "Activation Rate",
    format: (v) => `${v.toFixed(1)}%`,
    benchmark: { good: 75, warn: 50, direction: "higher" },
    desc: "% of onboarded users who sent their first message",
  },
  {
    key: "week4_retention",
    label: "Week-4 Retention",
    format: (v) => `${v.toFixed(1)}%`,
    benchmark: { good: 20, warn: 10, direction: "higher" },
    desc: "% of each cohort still active 4 weeks after signup",
  },
  {
    key: "artifact_adoption",
    label: "Artifact Adoption",
    format: (v) => `${v.toFixed(1)}%`,
    benchmark: { good: 35, warn: 15, direction: "higher" },
    desc: "% of users who created at least one artifact (habit signal)",
  },
  {
    key: "overall_churn_pct",
    label: "Overall Churn",
    format: (v) => `${v.toFixed(1)}%`,
    benchmark: { good: 30, warn: 50, direction: "lower" },
    desc: "% of all subscriptions that have ended",
  },
  {
    key: "median_iat_days",
    label: "Median IAT",
    format: (v) => `${v.toFixed(1)}d`,
    benchmark: { good: 3, warn: 7, direction: "lower" },
    desc: "Median inter-arrival time between sessions (habit strength)",
  },
];

function health(metric: Metric, value: number): "green" | "yellow" | "red" {
  const { good, warn, direction } = metric.benchmark;
  if (direction === "higher") {
    if (value >= good) return "green";
    if (value >= warn) return "yellow";
    return "red";
  } else {
    if (value <= good) return "green";
    if (value <= warn) return "yellow";
    return "red";
  }
}

const HEALTH_COLOR = {
  green:  "text-g-green",
  yellow: "text-g-tan",
  red:    "text-g-red",
} as const;

const HEALTH_BG = {
  green:  "border-g-green/20 bg-g-green/5",
  yellow: "border-g-tan/20 bg-g-tan/5",
  red:    "border-g-red/20 bg-g-red/5",
} as const;

export function KpiDashboard() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const [kpis, setKpis] = useState<KpiRow | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!ready || isGenerating) return;
    setLoading(true);
    try {
      const rows = await runSQL(KPI_DASHBOARD_SQL.trim());
      if (rows[0]) setKpis(rows[0] as unknown as KpiRow);
    } catch { /* silently fail – dashboard is non-blocking */ }
    finally { setLoading(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => { fetch(); }, [dataVersion, ready, isGenerating, fetch]);

  return (
    <div className="grid grid-cols-5 gap-2">
      {METRICS.map((m) => {
        const raw = kpis?.[m.key] ?? null;
        const h = raw !== null ? health(m, Number(raw)) : null;
        return (
          <div
            key={m.key}
            className={`rounded border p-3 transition-colors ${h ? HEALTH_BG[h] : "border-g-border bg-g-elevated"}`}
            title={m.desc}
          >
            <div className="text-[10px] text-g-muted uppercase tracking-wider mb-1 leading-tight">
              {m.label}
            </div>
            <div className={`text-xl font-bold tabular-nums ${h ? HEALTH_COLOR[h] : "text-g-dim"}`}>
              {loading || raw === null ? (
                <span className="text-g-dim text-sm">—</span>
              ) : (
                m.format(Number(raw))
              )}
            </div>
            {h && (
              <div className={`text-[9px] mt-1 ${HEALTH_COLOR[h]}`}>
                {h === "green" ? "● healthy" : h === "yellow" ? "◐ watch" : "○ critical"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
