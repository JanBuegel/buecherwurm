import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL ?? "./data/buecherwurm.db";

// Reuse a single connection across hot reloads in dev to avoid leaking handles.
const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

function createConnection() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

const sqlite = globalForDb.sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
