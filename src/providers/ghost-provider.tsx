"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { SimulationParams } from "@/lib/simulation/parameters";
import { GHOST_STROKE_COLORS } from "@/lib/utils/colors";

export interface GhostSnapshot {
  id: string;
  label: string;
  color: string;
  params: SimulationParams;
  data: Map<string, unknown[]>;   // keyed by module id → query result rows
}

interface GhostContextValue {
  ghosts: GhostSnapshot[];
  pinSnapshot: (label: string, params: SimulationParams, moduleData: Record<string, unknown[]>) => void;
  unpinSnapshot: (id: string) => void;
  addModuleData: (ghostId: string, moduleId: string, data: unknown[]) => void;
}

const GhostContext = createContext<GhostContextValue | null>(null);

export function GhostProvider({ children }: { children: React.ReactNode }) {
  const [ghosts, setGhosts] = useState<GhostSnapshot[]>([]);

  const pinSnapshot = useCallback((
    label: string,
    params: SimulationParams,
    moduleData: Record<string, unknown[]>
  ) => {
    setGhosts((prev) => {
      if (prev.length >= 3) return prev; // max 3 ghosts
      const id = crypto.randomUUID();
      const color = GHOST_STROKE_COLORS[prev.length % GHOST_STROKE_COLORS.length];
      const dataMap = new Map<string, unknown[]>(Object.entries(moduleData));
      return [...prev, { id, label, color, params, data: dataMap }];
    });
  }, []);

  const unpinSnapshot = useCallback((id: string) => {
    setGhosts((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addModuleData = useCallback((ghostId: string, moduleId: string, data: unknown[]) => {
    setGhosts((prev) => prev.map((g) => {
      if (g.id !== ghostId) return g;
      const newData = new Map(g.data);
      newData.set(moduleId, data);
      return { ...g, data: newData };
    }));
  }, []);

  return (
    <GhostContext.Provider value={{ ghosts, pinSnapshot, unpinSnapshot, addModuleData }}>
      {children}
    </GhostContext.Provider>
  );
}

export function useGhost(): GhostContextValue {
  const ctx = useContext(GhostContext);
  if (!ctx) throw new Error("useGhost must be used within GhostProvider");
  return ctx;
}
