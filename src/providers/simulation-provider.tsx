"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from "react";
import { DEFAULT_PARAMS, type SimulationParams } from "@/lib/simulation/parameters";
import { useDuckDB } from "./duckdb-provider";

interface SimulationContextValue {
  params: SimulationParams;
  setParams: (patch: Partial<SimulationParams>) => void;
  dataVersion: number;
  isGenerating: boolean;
  rowCounts: { users: number; events: number; conversations: number; subscriptions: number } | null;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { ready } = useDuckDB();
  const [params, setParamsState] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [dataVersion, setDataVersion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rowCounts, setRowCounts] = useState<SimulationContextValue["rowCounts"]>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const regenerate = useCallback(async (p: SimulationParams) => {
    setIsGenerating(true);
    try {
      const [{ generateDataset }, { loadDataset }, { getTableStats }] = await Promise.all([
        import("@/lib/data/generator"),
        import("@/lib/engine/duckdb-client"),
        import("@/lib/engine/duckdb-client"),
      ]);
      const dataset = generateDataset(p);
      await loadDataset(dataset);
      const counts = await getTableStats();
      setRowCounts(counts);
      setDataVersion((v) => v + 1);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Initial load once DuckDB is ready
  useEffect(() => {
    if (!ready) return;
    regenerate(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const setParams = useCallback((patch: Partial<SimulationParams>) => {
    setParamsState((prev) => {
      const next = { ...prev, ...patch };
      // Debounce regeneration 350ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => regenerate(next), 350);
      return next;
    });
  }, [regenerate]);

  return (
    <SimulationContext.Provider value={{ params, setParams, dataVersion, isGenerating, rowCounts }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
