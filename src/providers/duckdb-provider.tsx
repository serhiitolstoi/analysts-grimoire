"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { QueryRow } from "@/lib/engine/duckdb-client";

interface DuckDBContextValue {
  ready: boolean;
  error: string | null;
  runSQL: (query: string) => Promise<QueryRow[]>;
}

const DuckDBContext = createContext<DuckDBContextValue | null>(null);

export function DuckDBProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getDuckDB } = await import("@/lib/engine/duckdb-client");
        await getDuckDB();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runSQL = useCallback(async (query: string): Promise<QueryRow[]> => {
    const { runSQL: _run } = await import("@/lib/engine/duckdb-client");
    return _run(query);
  }, []);

  return (
    <DuckDBContext.Provider value={{ ready, error, runSQL }}>
      {children}
    </DuckDBContext.Provider>
  );
}

export function useDuckDB(): DuckDBContextValue {
  const ctx = useContext(DuckDBContext);
  if (!ctx) throw new Error("useDuckDB must be used within DuckDBProvider");
  return ctx;
}
