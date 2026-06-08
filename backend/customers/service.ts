import { getDb } from "../db/index";
import { parsePagination } from "../pagination";
import { singleQueryValue } from "./http";
import {
  customerExists,
  deleteCustomerInDb,
  getCustomersFromDb,
  updateCustomerInDb
} from "./repository";
import type {
  CustomerRow,
  EditableField,
  QueryValue,
  SortBy,
  SortOrder
} from "./types";

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

export class NotFoundError extends Error {}

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

export async function listCustomers(
  query: Record<string, QueryValue>
): Promise<{
  page: number;
  limit: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  total: number;
  totalPages: number;
  items: CustomerRow[];
}> {
  const { page, limit, offset } = parsePagination({
    page: query.page,
    limit: query.limit
  });
  const { sortBy, sortOrder } = parseSort(query);
  const q = singleQueryValue(query.q);

  const db = await getDb();
  return getCustomersFromDb({
    db,
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
    q
  });
}

export async function updateCustomer(
  body: Record<string, unknown>
): Promise<CustomerRow | null> {
  const id = parsePositiveId(body.id, "id");
  const updatePayload = buildUpdatePayload(body);

  const db = await getDb();
  if (!customerExists(db, id)) {
    throw new NotFoundError("Customer not found");
  }

  return updateCustomerInDb({ db, id, updatePayload });
}

export async function deleteCustomer(
  query: Record<string, QueryValue>
): Promise<{
  id: number;
}> {
  const id = parsePositiveId(singleQueryValue(query.id), "id");

  const db = await getDb();
  if (!customerExists(db, id)) {
    throw new NotFoundError("Customer not found");
  }

  deleteCustomerInDb(db, id);
  return { id };
}
