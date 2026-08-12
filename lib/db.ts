/**
 * Database adapter.
 *
 * Two interchangeable backends, both real PostgreSQL:
 *   1. `pg` Pool  — when DATABASE_URL is set (Supabase pooler, Neon, self-hosted
 *      Postgres, etc.). Connection-string driven.
 *   2. `@electric-sql/pglite` — an embedded Postgres 16 engine (WASM) with
 *      filesystem persistence under ./data when no DATABASE_URL is configured.
 *      This makes local development zero-config while preserving real SQL
 *      semantics: transactions, CHECK constraints, partial unique indexes,
 *      advisory locks and PL/pgSQL triggers all work.
 *
 * Both backends expose the same adapter interface (`query` + `transaction`),
 * so the rest of the application talks to one API.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { migrations } from "./migrations";
import { config } from "./config";

export interface QueryResultRow {
  [key: string]: unknown;
}
export type QueryFn = <T = QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<{ rows: T[]; rowCount?: number }>;

export interface DbAdapter {
  query: QueryFn;
  transaction: <T>(fn: (q: QueryFn) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
  readonly kind: "pg" | "pglite";
}

let _adapterPromise: Promise<DbAdapter> | null = null;

async function createPgliteAdapter(): Promise<DbAdapter> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DATA_DIR || "./data/hackathon";
  if (dataDir && dataDir !== ":memory:") {
    mkdirSync(path.resolve(process.cwd(), dataDir), { recursive: true });
  }
  const db = new PGlite(dataDir);

  const query: QueryFn = async <T = QueryResultRow>(text: string, params?: unknown[]) => {
    const res = await db.query(text, params as unknown[]);
    return { rows: res.rows as unknown as T[], rowCount: (res as unknown as { affectedRows?: number }).affectedRows ?? undefined };
  };

  const transaction: DbAdapter["transaction"] = async <T>(fn: (q: QueryFn) => Promise<T>) => {
    return db.transaction(async (tx) => {
      const q: QueryFn = async <U = QueryResultRow>(text: string, params?: unknown[]) => {
        const res = await tx.query(text, params as unknown[]);
        return { rows: res.rows as unknown as U[], rowCount: (res as unknown as { affectedRows?: number }).affectedRows ?? undefined };
      };
      return fn(q);
    });
  };

  return {
    kind: "pglite",
    query,
    transaction,
    close: async () => {
      try {
        await db.close();
      } catch {
        /* ignore */
      }
    },
  };
}

async function createPgAdapter(): Promise<DbAdapter> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });

  const query: QueryFn = async <T = QueryResultRow>(text: string, params?: unknown[]) => {
    const res = await pool.query(text, params as unknown[]);
    return { rows: res.rows as unknown as T[], rowCount: res.rowCount ?? undefined };
  };

  const transaction: DbAdapter["transaction"] = async <T>(fn: (q: QueryFn) => Promise<T>) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let result: T;
      try {
        const q: QueryFn = async <U = QueryResultRow>(text: string, params?: unknown[]) => {
          const res = await client.query(text, params as unknown[]);
          return { rows: res.rows as unknown as U[], rowCount: res.rowCount ?? undefined };
        };
        result = await fn(q);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
      return result;
    } finally {
      client.release();
    }
  };

  return {
    kind: "pg",
    query,
    transaction,
    close: async () => {
      try {
        await pool.end();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Apply pending migrations. Each migration is split into individual statements
 * (respecting dollar-quoted function bodies and string literals) and executed
 * inside a single transaction, so a failure rolls the whole migration back.
 */
async function runMigrations(adapter: DbAdapter): Promise<void> {
  await adapter.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await adapter.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    const statements = splitStatements(migration.sql).filter((s) => {
      const t = s.trim().toUpperCase();
      return t.length > 0 && t !== "BEGIN" && t !== "COMMIT" && t !== "ROLLBACK" && !t.startsWith("END");
    });
    await adapter.transaction(async (q) => {
      for (const stmt of statements) {
        await q(stmt);
      }
      await q(
        "INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING",
        [migration.name],
      );
    });
  }
}

/**
 * Get the singleton adapter, initializing and migrating on first call.
 */
export async function getDb(): Promise<DbAdapter> {
  if (!_adapterPromise) {
    _adapterPromise = (async () => {
      const adapter = process.env.DATABASE_URL
        ? await createPgAdapter()
        : await createPgliteAdapter();
      await runMigrations(adapter);
      await syncSettings(adapter);
      return adapter;
    })();
  }
  return _adapterPromise;
}

/**
 * Sync capacity/registration settings from environment config into the
 * settings table (env overrides existing DB values on startup).
 */
export async function syncSettings(adapter: DbAdapter): Promise<void> {
  const updates: Array<[string, string]> = [
    ["online_capacity", String(config.onlineCapacity)],
    ["onsite_capacity", String(config.onsiteCapacity)],
    ["total_capacity", String(config.totalCapacity)],
    ["registration_open", String(config.registrationOpen)],
    ["reg_id_prefix", config.regIdPrefix],
  ];
  for (const [key, value] of updates) {
    await adapter.query(
      `INSERT INTO settings(key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
    );
  }
}

/**
 * Read a setting value from the DB.
 */
export async function getSetting(key: string): Promise<string | null> {
  const adapter = await getDb();
  const { rows } = await adapter.query<{ value: string }>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

/**
 * Test-only: create a fresh isolated adapter (does NOT register as the
 * singleton). Accepts an optional dataDir or "memory" for in-memory PGlite.
 */
export async function createTestAdapter(
  opts: { dataDir?: string; memory?: boolean } = {},
): Promise<DbAdapter> {
  if (opts.memory) {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite();
    const query: QueryFn = async <T = QueryResultRow>(text: string, params?: unknown[]) => {
      const res = await db.query(text, params as unknown[]);
      return { rows: res.rows as unknown as T[], rowCount: (res as unknown as { affectedRows?: number }).affectedRows ?? undefined };
    };
    const transaction: DbAdapter["transaction"] = async <T>(fn: (q: QueryFn) => Promise<T>) =>
      db.transaction(async (tx) => {
        const q: QueryFn = async <U = QueryResultRow>(text: string, params?: unknown[]) => {
          const res = await tx.query(text, params as unknown[]);
          return { rows: res.rows as unknown as U[], rowCount: (res as unknown as { affectedRows?: number }).affectedRows ?? undefined };
        };
        return fn(q);
      });
    const adapter: DbAdapter = {
      kind: "pglite",
      query,
      transaction,
      close: async () => {
        try {
          await db.close();
        } catch {
          /* ignore */
        }
      },
    };
    await runMigrations(adapter);
    return adapter;
  }
  return createPgliteAdapter();
}

/**
 * Split a SQL script into individual statements, respecting:
 *   - single-quoted string literals ('...')
 *   - dollar-quoted function bodies ($tag$ ... $tag$ or $$ ... $$)
 *   - line (`--`) and block (`/* *\/`) comments
 */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);

    if (two === "/*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (two === "--") {
      const end = sql.indexOf("\n", i + 2);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (ch === "'") {
      buf += ch;
      i++;
      while (i < n) {
        const c = sql[i];
        buf += c;
        if (c === "'" && sql[i + 1] === "'") {
          buf += sql[i + 1];
          i += 2;
          continue;
        }
        i++;
        if (c === "'") break;
      }
      continue;
    }
    if (ch === "$") {
      const tagMatch = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        if (closeIdx === -1) {
          buf += sql.slice(i);
          i = n;
        } else {
          buf += sql.slice(i, closeIdx + tag.length);
          i = closeIdx + tag.length;
        }
        continue;
      }
    }
    if (ch === ";") {
      const stmt = buf.trim();
      if (stmt) out.push(stmt + ";");
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  const tail = buf.trim();
  if (tail) out.push(tail.endsWith(";") ? tail : tail + ";");
  return out;
}

// Reference to silence unused-warning in some bundlers.
void config;