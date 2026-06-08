import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const wasmPath = process.env.VERCEL
      ? "https://sql.js.org/dist/sql-wasm.wasm"
      : path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");

    sqlPromise = initSqlJs({
      locateFile: () => wasmPath
    });
  }

  return sqlPromise as Promise<SqlJsStatic>;
}

function resolveDbPath(): string {
  const moduleDir = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.join(process.cwd(), "data", "customers.db"),
    path.join(process.cwd(), ".vercel", "output", "functions", "api", "customers.func", "data", "customers.db"),
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
