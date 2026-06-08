import type { Database } from "sql.js";
import type { CustomerRow, EditableField, SortBy, SortOrder } from "./types";

export function getCustomersFromDb(params: {
  db: Database;
  page: number;
  limit: number;
  offset: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  q: string;
}): {
  page: number;
  limit: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  total: number;
  totalPages: number;
  items: CustomerRow[];
} {
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

  const items: CustomerRow[] = [];
  while (dataStmt.step()) {
    items.push(dataStmt.getAsObject() as CustomerRow);
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

export function customerExists(db: Database, id: number): boolean {
  const existsStmt = db.prepare("SELECT id FROM customers WHERE id = :id");
  existsStmt.bind({ ":id": id });
  const exists = existsStmt.step();
  existsStmt.free();
  return exists;
}

export function updateCustomerInDb(params: {
  db: Database;
  id: number;
  updatePayload: Partial<Record<EditableField, string | null>>;
}): CustomerRow | null {
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
    ? (resultStmt.getAsObject() as CustomerRow)
    : null;
  resultStmt.free();

  return updated;
}

export function deleteCustomerInDb(db: Database, id: number): void {
  db.run("DELETE FROM customers WHERE id = :id", { ":id": id });
}
