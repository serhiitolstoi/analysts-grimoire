/**
 * Pyodide client — promise-based wrapper around the Pyodide Web Worker.
 * Lazy initialization: worker only starts when `initPyodide()` is first called.
 */

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

class PyodideClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((e: unknown) => void) | null = null;
  private _ready = false;

  get ready() { return this._ready; }

  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    this.worker = new Worker(
      new URL("../workers/pyodide.worker.ts", import.meta.url)
    );

    this.worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "ready") {
        this._ready = true;
        this.readyResolve?.();
      } else if (msg.type === "error" && !msg.id) {
        this.readyReject?.(new Error(msg.error));
      } else if (msg.type === "result" && msg.id) {
        this.pending.get(msg.id)?.resolve(msg.data);
        this.pending.delete(msg.id);
      } else if (msg.type === "error" && msg.id) {
        this.pending.get(msg.id)?.reject(new Error(msg.error));
        this.pending.delete(msg.id);
      }
    };

    this.worker.postMessage({ type: "init" });

    return this.readyPromise;
  }

  async run(code: string, data?: unknown): Promise<unknown> {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: "run", id, code, data });
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    this._ready = false;
  }
}

// Singleton
let clientInstance: PyodideClient | null = null;

export function getPyodideClient(): PyodideClient {
  if (!clientInstance) clientInstance = new PyodideClient();
  return clientInstance;
}

export async function runPython(code: string, data?: unknown): Promise<unknown> {
  return getPyodideClient().run(code, data);
}
