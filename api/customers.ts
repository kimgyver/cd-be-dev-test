import type { ServerResponse } from "node:http";
import { handleCustomersRequest } from "../backend/customers/controller";
import type { ReqWithQuery } from "../backend/customers/types";

export default async function handler(
  req: ReqWithQuery,
  res: ServerResponse
): Promise<void> {
  await handleCustomersRequest(req, res);
}
