"use client";

import { DuckDBProvider } from "./duckdb-provider";
import { PyodideProvider } from "./pyodide-provider";
import { SimulationProvider } from "./simulation-provider";
import { GhostProvider } from "./ghost-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DuckDBProvider>
      <SimulationProvider>
        <PyodideProvider>
          <GhostProvider>
            {children}
          </GhostProvider>
        </PyodideProvider>
      </SimulationProvider>
    </DuckDBProvider>
  );
}
