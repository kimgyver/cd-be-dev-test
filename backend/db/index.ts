import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js/dist/sql-asm.js";
import type { Database, SqlJsStatic } from "sql.js";

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    // Use asm build to avoid wasm file resolution/network issues in serverless.
    sqlPromise = initSqlJs() as Promise<SqlJsStatic>;
  }

  return sqlPromise as Promise<SqlJsStatic>;
}

function resolveDbPath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "data", "customers.db"),
    path.join(
      process.cwd(),
      ".vercel",
      "output",
      "functions",
      "api",
      "customers.func",
      "data",
      "customers.db"
    ),
    path.resolve(moduleDir, "..", "..", "data", "customers.db"),
    path.resolve(moduleDir, "..", "..", "..", "data", "customers.db")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Database file not found. Run: npm run import");
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSqlJs();
      const dbPath = resolveDbPath();

      const fileBuffer = fs.readFileSync(dbPath);
      return new SQL.Database(fileBuffer);
    })();
  }

  return dbPromise;
}
