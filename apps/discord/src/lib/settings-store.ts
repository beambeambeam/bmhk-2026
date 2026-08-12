import type { Database } from "bun:sqlite";
import { getDb } from "./db.js";

export interface SettingsStore {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  list: () => { key: string; value: string }[];
}

export function createSqliteSettingsStore(db: Database): SettingsStore {
  db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

  const getStatement = db.query<{ value: string }, [string]>(
    "SELECT value FROM settings WHERE key = ?1",
  );
  const setStatement = db.query<never, [string, string]>(
    "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const listStatement = db.query<{ key: string; value: string }, []>(
    "SELECT key, value FROM settings ORDER BY key",
  );

  return {
    get(key) {
      return getStatement.get(key)?.value ?? null;
    },
    list() {
      return listStatement.all();
    },
    set(key, value) {
      setStatement.run(key, value);
    },
  };
}

let settingsStore: SettingsStore | undefined;

export function getSettingsStore(): SettingsStore {
  settingsStore ??= createSqliteSettingsStore(getDb());
  return settingsStore;
}

// ponytail: no vitest coverage here, same reason as db.ts — bun:sqlite only
// resolves under the real Bun runtime. Self-check: `bun run src/lib/settings-store.ts`.
if (import.meta.main) {
  const { createDb } = await import("./db.js");

  const db = createDb(":memory:");
  const store = createSqliteSettingsStore(db);

  if (store.get("missing") !== null) {
    throw new Error("expected missing key to return null");
  }

  store.set("a", "1");
  store.set("a", "2");
  if (store.get("a") !== "2") {
    throw new Error(`expected set to upsert, got ${store.get("a")}`);
  }

  store.set("b", "3");
  const rows = store.list();
  if (rows.length !== 2 || rows[0]?.key !== "a" || rows[1]?.key !== "b") {
    throw new Error(`expected ordered list of 2 rows, got ${JSON.stringify(rows)}`);
  }

  db.close();
  console.log("settings-store self-check passed");
}
