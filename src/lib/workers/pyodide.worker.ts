/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference lib="webworker" />
/**
 * Pyodide Web Worker
 * Loads the Python runtime and handles analytics execution requests.
 * Must be loaded as a Web Worker — never on main thread.
 */

declare function loadPyodide(opts: { indexURL: string }): Promise<any>;

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/";

let pyodide: any = null;

interface RunRequest {
  type: "run";
  id: string;
  code: string;
  data?: unknown;
}

interface InitRequest {
  type: "init";
}

self.onmessage = async (e: MessageEvent<RunRequest | InitRequest>) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      // Load Pyodide from CDN
      importScripts(`${PYODIDE_CDN}pyodide.js`);
      pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });

      // Install scientific packages
      await pyodide.loadPackage(["numpy", "scipy", "scikit-learn", "pandas"]);

      self.postMessage({ type: "ready" });
    } catch (err: any) {
      self.postMessage({ type: "error", error: String(err) });
    }
    return;
  }

  if (msg.type === "run") {
    const { id, code, data } = msg;
    try {
      if (!pyodide) throw new Error("Pyodide not initialized");

      // Inject input data as JSON string accessible from Python as `input_json`
      pyodide.globals.set("input_json", data ? JSON.stringify(data) : "null");

      const result = await pyodide.runPythonAsync(code);

      // Convert Pyodide proxy to plain JS value if needed
      let output = result;
      if (result && typeof result.toJs === "function") {
        output = result.toJs({ dict_converter: Object.fromEntries });
      }

      self.postMessage({ type: "result", id, data: output });
    } catch (err: any) {
      self.postMessage({ type: "error", id, error: String(err) });
    }
  }
};

export {};
