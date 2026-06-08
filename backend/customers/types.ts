import type { IncomingMessage } from "node:http";

export type QueryValue = string | string[] | undefined;

export type SortBy =
  | "id"
  | "first_name"
  | "last_name"
  | "email"
  | "company"
  | "city";

export type SortOrder = "asc" | "desc";

export type EditableField =
  | "first_name"
  | "last_name"
  | "email"
  | "gender"
  | "ip_address"
  | "company"
  | "city"
  | "title"
  | "website";

export type ReqWithQuery = IncomingMessage & {
  query?: Record<string, QueryValue>;
  method?: string;
};

export type CustomerRow = Record<string, unknown>;
