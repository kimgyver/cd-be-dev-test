import type { ServerResponse } from "node:http";
import { getQuery, readJsonBody, sendJson } from "./http";
import {
  deleteCustomer,
  listCustomers,
  NotFoundError,
  updateCustomer
} from "./service";
import type { ReqWithQuery } from "./types";

export async function handleCustomersRequest(
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
      const payload = await listCustomers(getQuery(req));
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "PUT") {
      const updated = await updateCustomer(await readJsonBody(req));
      sendJson(res, 200, { message: "Customer updated", item: updated });
      return;
    }

    if (req.method === "DELETE") {
      const { id } = await deleteCustomer(getQuery(req));
      sendJson(res, 200, { message: "Customer deleted", id });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    if (error instanceof NotFoundError) {
      sendJson(res, 404, { error: error.message });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode = message.startsWith("Invalid ") ? 400 : 500;
    sendJson(res, statusCode, { error: message });
  }
}
