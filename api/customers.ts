import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import initSqlJs from "sql.js/dist/sql-asm.js";
import type { Database, SqlJsStatic } from "sql.js";

type QueryValue = string | string[] | undefined;
type SortBy = "id" | "first_name" | "last_name" | "email" | "company" | "city";
type SortOrder = "asc" | "desc";
type EditableField =
  | "first_name"
  | "last_name"
  | "email"
  | "gender"
  | "ip_address"
  | "company"
  | "city"
  | "title"
  | "website";

type ReqWithQuery = IncomingMessage & {
  query?: Record<string, QueryValue>;
  method?: string;
};

const ALLOWED_SORT_BY: SortBy[] = [
  "id",
  "first_name",
  "last_name",
  "email",
  "company",
  "city"
];

const EDITABLE_FIELDS: EditableField[] = [
  "first_name",
  "last_name",
  "email",
  "gender",
  "ip_address",
  "company",
  "city",
  "title",
  "website"
];

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs() as Promise<SqlJsStatic>;
  }

  return sqlPromise;
}

function resolveDbPath(): string {
  const candidates = [
    path.join(process.cwd(), "data", "customers.db"),
    "/var/task/data/customers.db"
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Database file not found. Ensure data/customers.db is deployed."
  );
}

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSqlJs();
      const fileBuffer = fs.readFileSync(resolveDbPath());
      return new SQL.Database(fileBuffer);
    })();
  }

  return dbPromise;
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getQuery(req: ReqWithQuery): Record<string, QueryValue> {
  if (req.query) {
    return req.query;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  const query: Record<string, QueryValue> = {};
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

function singleQueryValue(value: QueryValue): string {
  return (Array.isArray(value) ? value[0] : (value ?? "")).trim();
}

function parsePositiveInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return parsePositiveInteger(value[0]);
  }

  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return NaN;
  }

  return num;
}

function parsePagination(input: { page?: unknown; limit?: unknown }): {
  page: number;
  limit: number;
  offset: number;
} {
  const pageParsed = parsePositiveInteger(input.page);
  const limitParsed = parsePositiveInteger(input.limit);

  if (Number.isNaN(pageParsed)) {
    throw new Error("Invalid page. page must be a positive integer.");
  }
  if (Number.isNaN(limitParsed)) {
    throw new Error("Invalid limit. limit must be a positive integer.");
  }

  const page = pageParsed ?? 1;
  const limit = Math.min(limitParsed ?? 20, 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseSort(query: Record<string, QueryValue>): {
  sortBy: SortBy;
  sortOrder: SortOrder;
} {
  const sortByRaw = singleQueryValue(query.sortBy) || "id";
  const sortOrderRaw = (
    singleQueryValue(query.sortOrder) || "asc"
  ).toLowerCase();

  if (!ALLOWED_SORT_BY.includes(sortByRaw as SortBy)) {
    throw new Error(
      `Invalid sortBy. Allowed values: ${ALLOWED_SORT_BY.join(", ")}`
    );
  }
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new Error("Invalid sortOrder. Allowed values: asc, desc");
  }

  return {
    sortBy: sortByRaw as SortBy,
    sortOrder: sortOrderRaw as SortOrder
  };
}

function parsePositiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label}. ${label} must be a positive integer.`);
  }

  return id;
}

function normalizeTextInput(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(
      "Invalid request body. Editable fields must be strings or null."
    );
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readJsonBody(
  req: IncomingMessage
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error();
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Invalid request body. Expected valid JSON object.");
  }
}

function getCustomersFromDb(params: {
  db: Database;
  page: number;
  limit: number;
  offset: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  q: string;
}) {
  const { db, page, limit, offset, sortBy, sortOrder, q } = params;
  const whereClause = q
    ? "WHERE first_name LIKE :q OR last_name LIKE :q OR email LIKE :q OR company LIKE :q OR city LIKE :q"
    : "";

  const searchParams: Record<string, string | number> = {};
  if (q) {
    searchParams[":q"] = `%${q}%`;
  }

  const countStmt = db.prepare(
    `SELECT COUNT(*) AS total FROM customers ${whereClause}`
  );
  countStmt.bind(searchParams);
  const total = countStmt.step()
    ? Number(countStmt.getAsObject().total ?? 0)
    : 0;
  countStmt.free();

  const dataStmt = db.prepare(`
    SELECT id, first_name, last_name, email, gender, ip_address, company, city, title, website
    FROM customers
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
    LIMIT :limit OFFSET :offset
  `);

  dataStmt.bind({
    ...searchParams,
    ":limit": limit,
    ":offset": offset
  });

  const items: Array<Record<string, unknown>> = [];
  while (dataStmt.step()) {
    items.push(dataStmt.getAsObject() as Record<string, unknown>);
  }
  dataStmt.free();

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items
  };
}

function customerExists(db: Database, id: number): boolean {
  const stmt = db.prepare("SELECT id FROM customers WHERE id = :id");
  stmt.bind({ ":id": id });
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function updateCustomerInDb(params: {
  db: Database;
  id: number;
  updatePayload: Partial<Record<EditableField, string | null>>;
}) {
  const { db, id, updatePayload } = params;
  const keys = Object.keys(updatePayload) as EditableField[];
  const setClause = keys.map(field => `${field} = :${field}`).join(", ");
  const queryParams: Record<string, string | number | null> = { ":id": id };

  for (const field of keys) {
    queryParams[`:${field}`] = updatePayload[field] ?? null;
  }

  db.run(`UPDATE customers SET ${setClause} WHERE id = :id`, queryParams);

  const resultStmt = db.prepare(`
    SELECT id, first_name, last_name, email, gender, ip_address, company, city, title, website
    FROM customers
    WHERE id = :id
  `);
  resultStmt.bind({ ":id": id });
  const updated = resultStmt.step()
    ? (resultStmt.getAsObject() as Record<string, unknown>)
    : null;
  resultStmt.free();
  return updated;
}

function deleteCustomerInDb(db: Database, id: number): void {
  db.run("DELETE FROM customers WHERE id = :id", { ":id": id });
}

function buildUpdatePayload(
  body: Record<string, unknown>
): Partial<Record<EditableField, string | null>> {
  const updatePayload: Partial<Record<EditableField, string | null>> = {};

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      updatePayload[field] = normalizeTextInput(body[field]);
    }
  }

  const keys = Object.keys(updatePayload) as EditableField[];
  if (keys.length === 0) {
    throw new Error(
      "Invalid request body. Provide at least one editable field."
    );
  }
  if (keys.includes("first_name") && !updatePayload.first_name) {
    throw new Error("Invalid first_name. first_name cannot be empty.");
  }
  if (keys.includes("last_name") && !updatePayload.last_name) {
    throw new Error("Invalid last_name. last_name cannot be empty.");
  }
  if (keys.includes("email") && !updatePayload.email) {
    throw new Error("Invalid email. email cannot be empty.");
  }

  return updatePayload;
}

export default async function vercelCustomersApi(
  req: ReqWithQuery,
  res: ServerResponse
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === "GET") {
      const query = getQuery(req);
      const { page, limit, offset } = parsePagination({
        page: query.page,
        limit: query.limit
      });
      const { sortBy, sortOrder } = parseSort(query);
      const q = singleQueryValue(query.q);
      const db = await getDb();
      const payload = getCustomersFromDb({
        db,
        page,
        limit,
        offset,
        sortBy,
        sortOrder,
        q
      });
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const id = parsePositiveId(body.id, "id");
      const updatePayload = buildUpdatePayload(body);
      const db = await getDb();

      if (!customerExists(db, id)) {
        sendJson(res, 404, { error: "Customer not found" });
        return;
      }

      const updated = updateCustomerInDb({ db, id, updatePayload });
      sendJson(res, 200, { message: "Customer updated", item: updated });
      return;
    }

    if (req.method === "DELETE") {
      const query = getQuery(req);
      const id = parsePositiveId(singleQueryValue(query.id), "id");
      const db = await getDb();

      if (!customerExists(db, id)) {
        sendJson(res, 404, { error: "Customer not found" });
        return;
      }

      deleteCustomerInDb(db, id);
      sendJson(res, 200, { message: "Customer deleted", id });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode = message.startsWith("Invalid ") ? 400 : 500;
    sendJson(res, statusCode, { error: message });
  }
}
