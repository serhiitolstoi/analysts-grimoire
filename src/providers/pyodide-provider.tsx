"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface PyodideContextValue {
  ready: boolean;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  runPython: (code: string, data?: unknown) => Promise<unknown>;
}

const PyodideContext = createContext<PyodideContextValue | null>(null);

export function PyodideProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef<Promise<void> | null>(null);

  const init = useCallback(async () => {
    if (ready || loading) return initRef.current ?? Promise.resolve();

    setLoading(true);
    setError(null);

    initRef.current = (async () => {
      try {
        const { getPyodideClient } = await import("@/lib/engine/pyodide-client");
        await getPyodideClient().init();
        setReady(true);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    })();

    return initRef.current;
  }, [ready, loading]);

  const runPython = useCallback(async (code: string, data?: unknown): Promise<unknown> => {
    if (!ready) await init();
    const { runPython: _run } = await import("@/lib/engine/pyodide-client");
    return _run(code, data);
  }, [ready, init]);

  return (
    <PyodideContext.Provider value={{ ready, loading, error, init, runPython }}>
      {children}
    </PyodideContext.Provider>
  );
}

export function usePyodide(): PyodideContextValue {
  const ctx = useContext(PyodideContext);
  if (!ctx) throw new Error("usePyodide must be used within PyodideProvider");
  return ctx;
}
