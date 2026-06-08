import type { ServerResponse } from "node:http";
import handler from "../backend/api/customers";
import type { ReqWithQuery } from "../backend/customers/types";

export default async function vercelCustomersApi(
  req: ReqWithQuery,
  res: ServerResponse
): Promise<void> {
  await handler(req, res);
}
