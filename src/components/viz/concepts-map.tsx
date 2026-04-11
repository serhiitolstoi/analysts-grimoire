"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useContainerWidth } from "@/lib/hooks/use-container-width";
import { COLORS } from "@/lib/utils/colors";

/* ── Node and Edge Definitions ──────────────────────────────────────── */

interface MapNode {
  id: string;
  label: string;
  badge: string;
  path: string;
  x: number;    // 0-1
  y: number;    // 0-1
  level: 1 | 2 | 3 | 4;
}

interface MapEdge {
  from: string;
  to: string;
  label?: string;
}

const LEVEL_COLORS: Record<number, string> = {
  1: COLORS.tan,
  2: COLORS.purple,
  3: COLORS.blue,
  4: COLORS.red,
};

const NODES: MapNode[] = [
  // Level 1 — Foundation
  { id: "engagement",  label: "Engagement",    badge: "WAU",    path: "/modules/engagement-trends",   x: 0.10, y: 0.10, level: 1 },
  { id: "funnels",     label: "Funnels",       badge: "LAT",    path: "/modules/conversion-funnels",  x: 0.35, y: 0.10, level: 1 },
  { id: "retention",   label: "Retention",     badge: "N-DAY",  path: "/modules/retention-heatmaps",  x: 0.60, y: 0.10, level: 1 },
  { id: "metric-tree", label: "Metric Trees",  badge: "NSM",    path: "/modules/metric-trees",        x: 0.35, y: 0.35, level: 1 },
  { id: "revenue",     label: "Revenue & LTV", badge: "LTV",    path: "/modules/revenue-ltv",         x: 0.60, y: 0.35, level: 1 },

  // Level 2 — Habit & Momentum
  { id: "iat",         label: "IAT Distribution", badge: "EXP",     path: "/modules/iat-distribution",   x: 0.10, y: 0.58, level: 2 },
  { id: "session",     label: "Session Intensity", badge: "2D",     path: "/modules/session-intensity",   x: 0.35, y: 0.58, level: 2 },
  { id: "adoption",    label: "Feature Adoption",  badge: "S-CURVE", path: "/modules/feature-adoption",  x: 0.60, y: 0.58, level: 2 },

  // Level 3 — Causal & Predictive
  { id: "transitions", label: "Transitions",   badge: "MARKOV", path: "/modules/transition-matrices",  x: 0.10, y: 0.82, level: 3 },
  { id: "survival",    label: "Survival",      badge: "KM",     path: "/modules/survival-analysis",    x: 0.35, y: 0.82, level: 3 },
  { id: "clusters",    label: "Clusters",      badge: "K-M",    path: "/modules/activity-clusters",    x: 0.60, y: 0.82, level: 3 },

  // Level 4 — Experimentation
  { id: "ab",          label: "A/B Testing",       badge: "A/B",  path: "/modules/ab-testing",          x: 0.82, y: 0.35, level: 4 },
  { id: "pitfalls",    label: "Pitfalls",          badge: "TRAP", path: "/modules/analytics-pitfalls",  x: 0.82, y: 0.58, level: 4 },
];

const EDGES: MapEdge[] = [
  { from: "engagement", to: "metric-tree",  label: "WAU drivers" },
  { from: "funnels",    to: "metric-tree",  label: "conversion" },
  { from: "retention",  to: "metric-tree",  label: "retention %" },
  { from: "retention",  to: "revenue",      label: "tenure" },
  { from: "metric-tree",to: "revenue",      label: "MRR" },
  { from: "engagement", to: "retention",    label: "cohorts" },
  { from: "retention",  to: "survival",     label: "continuous" },
  { from: "iat",        to: "retention",    label: "habit signal" },
  { from: "session",    to: "iat",          label: "session detail" },
  { from: "adoption",   to: "revenue",      label: "depth→LTV" },
  { from: "adoption",   to: "clusters",     label: "segments" },
  { from: "transitions",to: "survival",     label: "state→churn" },
  { from: "metric-tree",to: "ab",           label: "test hypotheses" },
  { from: "ab",         to: "pitfalls",     label: "beware traps" },
  { from: "clusters",   to: "adoption",     label: "personas" },
];

/* ── Learning Paths ──────────────────────────────────────────────────── */

const LEARNING_PATHS = [
  {
    name: "PM Foundation",
    time: "~3 hours",
    color: COLORS.tan,
    steps: ["engagement", "funnels", "retention", "revenue", "metric-tree", "ab"],
  },
  {
    name: "Data Science",
    time: "~4 hours",
    color: COLORS.purple,
    steps: ["iat", "session", "transitions", "survival", "clusters", "pitfalls"],
  },
  {
    name: "Full Journey",
    time: "~6 hours",
    color: COLORS.green,
    steps: ["engagement", "funnels", "retention", "metric-tree", "revenue", "iat", "session", "adoption", "transitions", "survival", "clusters", "ab", "pitfalls"],
  },
];

/* ── Component ──────────────────────────────────────────────────────── */

export function ConceptsMap() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 700);
  const [hovered, setHovered] = useState<string | null>(null);

  const w = containerWidth || 700;
  const h = Math.round(Math.max(340, w * 0.52));
  const nodeW = Math.min(95, w * 0.13);
  const nodeH = Math.min(40, h * 0.085);
  const fontSize = Math.max(7, Math.min(10, w * 0.014));

  const nodeMap = new Map(NODES.map((n) => [n.id, n]));

  // Which edges connect to hovered node?
  const connectedEdges = new Set<string>();
  const connectedNodes = new Set<string>();
  if (hovered) {
    connectedNodes.add(hovered);
    for (const e of EDGES) {
      if (e.from === hovered || e.to === hovered) {
        connectedEdges.add(`${e.from}-${e.to}`);
        connectedNodes.add(e.from);
        connectedNodes.add(e.to);
      }
    }
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={w} height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="select-none"
        style={{ cursor: "default" }}
      >
        {/* Edges */}
        {EDGES.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          const x1 = from.x * w + nodeW / 2;
          const y1 = from.y * h + nodeH;
          const x2 = to.x * w + nodeW / 2;
          const y2 = to.y * h;

          const edgeId = `${edge.from}-${edge.to}`;
          const isActive = !hovered || connectedEdges.has(edgeId);
          const midY = (y1 + y2) / 2;

          return (
            <g key={edgeId}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={isActive ? COLORS.muted : COLORS.border}
                strokeWidth={isActive && hovered ? 1.8 : 1}
                strokeOpacity={isActive ? 0.6 : 0.2}
                markerEnd="url(#arrowhead)"
              />
              {edge.label && isActive && hovered && (
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 4}
                  fill={COLORS.dim}
                  fontSize={fontSize - 1}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill={COLORS.muted} fillOpacity={0.5} />
          </marker>
        </defs>

        {/* Nodes */}
        {NODES.map((node) => {
          const nx = node.x * w;
          const ny = node.y * h;
          const isActive = !hovered || connectedNodes.has(node.id);
          const isHovered = hovered === node.id;
          const color = LEVEL_COLORS[node.level];

          return (
            <g
              key={node.id}
              style={{ cursor: "pointer" }}
              onClick={() => router.push(node.path)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              opacity={isActive ? 1 : 0.3}
            >
              <rect
                x={nx} y={ny}
                width={nodeW} height={nodeH}
                rx={5} ry={5}
                fill={isHovered ? COLORS.elevated : COLORS.surface}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1.2}
              />
              <text
                x={nx + nodeW / 2}
                y={ny + nodeH * 0.42}
                fill={COLORS.muted}
                fontSize={fontSize - 1}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {node.badge}
              </text>
              <text
                x={nx + nodeW / 2}
                y={ny + nodeH * 0.78}
                fill={isHovered ? color : COLORS.text}
                fontSize={fontSize}
                fontWeight={isHovered ? "bold" : "normal"}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* Level labels */}
        {[
          { label: "L1: Foundation", y: 0.05, color: COLORS.tan },
          { label: "L2: Habit", y: 0.52, color: COLORS.purple },
          { label: "L3: Causal", y: 0.76, color: COLORS.blue },
          { label: "L4: Experiment", y: 0.30, color: COLORS.red },
        ].map((lbl) => (
          <text
            key={lbl.label}
            x={w - 10} y={lbl.y * h + 10}
            fill={lbl.color}
            fontSize={fontSize - 1}
            textAnchor="end"
            fontFamily="var(--font-mono)"
            opacity={0.5}
          >
            {lbl.label}
          </text>
        ))}
      </svg>

      {/* Learning Paths */}
      <div className="mt-3 space-y-2">
        <p className="text-[10px] text-g-dim uppercase tracking-widest">Suggested Learning Paths</p>
        {LEARNING_PATHS.map((path) => (
          <div key={path.name} className="flex items-start gap-2 text-[11px]">
            <span className="font-bold shrink-0" style={{ color: path.color }}>
              {path.name}
            </span>
            <span className="text-g-dim shrink-0">({path.time})</span>
            <div className="flex flex-wrap gap-1">
              {path.steps.map((stepId, i) => {
                const node = nodeMap.get(stepId);
                if (!node) return null;
                return (
                  <span key={stepId} className="flex items-center gap-0.5">
                    <button
                      onClick={() => router.push(node.path)}
                      className="text-g-muted hover:text-g-text transition-colors underline underline-offset-2"
                    >
                      {node.label}
                    </button>
                    {i < path.steps.length - 1 && <span className="text-g-dim">→</span>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
