import fs from "node:fs";
import path from "node:path";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import customersHandler from "../backend/api/customers";

const PORT = Number(process.env.PORT ?? 3000);
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "frontend");

function sendText(res: ServerResponse, code: number, text: string): void {
  res.statusCode = code;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".jsx")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function servePublic(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(pathname).replace(/^\.+/, "");
  const target = path.join(PUBLIC_DIR, safePath);

  if (!target.startsWith(PUBLIC_DIR)) {
    sendText(res, 400, "Bad request");
    return;
  }

  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType(target));
  res.end(fs.readFileSync(target));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  console.log(`[${req.method}] ${url.pathname}`);

  // Route all /api/customers requests regardless of method
  if (url.pathname === "/api/customers") {
    const originalEnd = res.end.bind(res);
    (res as any).end = (...args: unknown[]) => {
      console.log(`  → ${res.statusCode}`);
      return (originalEnd as (...a: unknown[]) => unknown)(...args);
    };
    await customersHandler(req, res);
    return;
  }

  // Static file serving: GET only
  if (req.method !== "GET") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  servePublic(req, res);
});

server.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
