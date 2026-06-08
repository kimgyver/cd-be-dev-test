import type { IncomingMessage, ServerResponse } from "node:http";
import type { QueryValue, ReqWithQuery } from "./types";

export function getQuery(req: ReqWithQuery): Record<string, QueryValue> {
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

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function singleQueryValue(value: QueryValue): string {
  return (Array.isArray(value) ? value[0] : (value ?? "")).trim();
}

export async function readJsonBody(
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
