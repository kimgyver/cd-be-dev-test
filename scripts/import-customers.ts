import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import initSqlJs from "sql.js";

type CsvCustomer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  ip_address: string;
  company: string;
  city: string;
  title: string;
  website: string;
};

function normalize(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const csvPath = path.join(root, "data", "customers.csv");
  const dbDir = path.join(root, "data");
  const dbPath = path.join(dbDir, "customers.db");

  const csvRaw = fs.readFileSync(csvPath, "utf8");
  const rows = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvCustomer[];

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(root, "node_modules", "sql.js", "dist", file)
  });

  const db = new SQL.Database();

  db.run(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      gender TEXT,
      ip_address TEXT,
      company TEXT,
      city TEXT,
      title TEXT,
      website TEXT
    );
  `);

  db.run("CREATE INDEX idx_customers_email ON customers(email);");

  const insert = db.prepare(`
    INSERT INTO customers (
      id, first_name, last_name, email, gender, ip_address, company, city, title, website
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.run("BEGIN TRANSACTION;");

  let inserted = 0;
  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isInteger(id) || id <= 0) {
      continue;
    }

    const firstName = normalize(row.first_name);
    const lastName = normalize(row.last_name);
    const email = normalize(row.email);

    if (!firstName || !lastName || !email) {
      continue;
    }

    insert.run([
      id,
      firstName,
      lastName,
      email,
      normalize(row.gender),
      normalize(row.ip_address),
      normalize(row.company),
      normalize(row.city),
      normalize(row.title),
      normalize(row.website)
    ]);

    inserted += 1;
  }

  db.run("COMMIT;");

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbBinary = db.export();
  fs.writeFileSync(dbPath, Buffer.from(dbBinary));

  console.log(`Imported ${inserted} rows to ${dbPath}`);
}

main().catch(error => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
