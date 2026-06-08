import type { IncomingMessage, ServerResponse } from "node:http";

export type MockReq = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
};

export type MockResState = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export function createRes(): { res: ServerResponse; state: MockResState } {
  const state: MockResState = {
    statusCode: 200,
    headers: {},
    body: ""
  };

  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
    end(chunk?: string) {
      state.body = chunk ?? "";
    }
  } as unknown as ServerResponse;

  return { res, state };
}

export function createReq(method: string, url: string): MockReq {
  return { method, url } as MockReq;
}

export function createJsonReq(
  method: string,
  url: string,
  body: Record<string, unknown>
): MockReq {
  const payload = Buffer.from(JSON.stringify(body));

  const req = {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      yield payload;
    }
  } as unknown as MockReq;

  return req;
}
