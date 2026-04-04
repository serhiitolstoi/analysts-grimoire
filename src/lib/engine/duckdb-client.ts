/**
 * DuckDB-Wasm singleton client.
 * DuckDB-Wasm manages its own internal worker — we do NOT wrap it in another Web Worker.
 * Must be used client-side only.
 */

import type { Dataset } from "../data/schemas";

// Dynamic import to prevent SSR issues
let dbPromise: Promise<import("@duckdb/duckdb-wasm").AsyncDuckDB> | null = null;
let dbInstance: import("@duckdb/duckdb-wasm").AsyncDuckDB | null = null;

export async function getDuckDB(): Promise<import("@duckdb/duckdb-wasm").AsyncDuckDB> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const duckdb = await import("@duckdb/duckdb-wasm");

    const BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(BUNDLES);

    const worker_url = URL.createObjectURL(
      new Blob(
        [`importScripts("${bundle.mainWorker}");`],
        { type: "text/javascript" }
      )
    );

    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);

    dbInstance = db;
    return db;
  })();

  return dbPromise;
}

export type QueryRow = Record<string, unknown>;

export async function runSQL(query: string): Promise<QueryRow[]> {
  const db = await getDuckDB();
  const conn = await db.connect();
  try {
    const result = await conn.query(query);
    return result.toArray().map((row) => row.toJSON());
  } finally {
    await conn.close();
  }
}

/**
 * Load dataset tables into DuckDB.
 * Drops and recreates all four tables on each call (called when simulation params change).
 */
export async function loadDataset(dataset: Dataset): Promise<void> {
  const db = await getDuckDB();
  const conn = await db.connect();

  try {
    // Register JSON data as in-memory tables
    // We use DuckDB's JSON reading capability via VALUES clauses for small-medium datasets
    await conn.query("DROP TABLE IF EXISTS users");
    await conn.query("DROP TABLE IF EXISTS events");
    await conn.query("DROP TABLE IF EXISTS conversations");
    await conn.query("DROP TABLE IF EXISTS subscriptions");

    // Create tables from JSON strings registered as views
    const registerJSON = async (name: string, data: unknown[]) => {
      const json = JSON.stringify(data);
      // Register as a DuckDB file
      await db.registerFileText(`${name}.json`, json);
      await conn.query(
        `CREATE TABLE ${name} AS SELECT * FROM read_json_auto('${name}.json')`
      );
    };

    await registerJSON("users",         dataset.users);
    await registerJSON("events",        dataset.events);
    await registerJSON("conversations", dataset.conversations);
    await registerJSON("subscriptions", dataset.subscriptions);

  } finally {
    await conn.close();
  }
}

export async function getTableStats(): Promise<{
  users: number; events: number; conversations: number; subscriptions: number;
}> {
  const db = await getDuckDB();
  const conn = await db.connect();
  try {
    const q = async (table: string) => {
      const r = await conn.query(`SELECT COUNT(*) AS n FROM ${table}`);
      return Number(r.toArray()[0].toJSON().n);
    };
    return {
      users:         await q("users"),
      events:        await q("events"),
      conversations: await q("conversations"),
      subscriptions: await q("subscriptions"),
    };
  } finally {
    await conn.close();
  }
}
