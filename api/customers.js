const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js/dist/sql-asm.js");

let sqlPromise = null;
let dbPromise = null;

function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

function resolveDbPath() {
  const candidates = [
    path.join(process.cwd(), "data", "customers.db"),
    path.join(__dirname, "..", "data", "customers.db"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        console.log(`[DB] Found at: ${candidate}`);
        return candidate;
      }
    } catch (e) {
      console.log(`[DB] Checking ${candidate}: ${e.message}`);
    }
  }

  throw new Error(`Database file not found. Checked: ${candidates.join(", ")}`);
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSqlJs();
      const dbPath = resolveDbPath();
      const fileBuffer = fs.readFileSync(dbPath);
      return new SQL.Database(fileBuffer);
    })();
  }
  return dbPromise;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

module.exports = async function handler(req, res) {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
      const q = (url.searchParams.get("q") || "").trim();

      const db = await getDb();

      // Count total
      const countStmt = db.prepare("SELECT COUNT(*) as cnt FROM customers");
      countStmt.step();
      const { cnt: total } = countStmt.getAsObject();
      countStmt.free();

      // Get paginated results
      const offset = (page - 1) * limit;
      const listStmt = db.prepare(
        q
          ? `SELECT id, first_name, last_name, email, company, city, title, gender, ip_address, website
             FROM customers 
             WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ? OR city LIKE ?
             LIMIT ? OFFSET ?`
          : `SELECT id, first_name, last_name, email, company, city, title, gender, ip_address, website
             FROM customers 
             ORDER BY id ASC 
             LIMIT ? OFFSET ?`
      );

      const searchPattern = `%${q}%`;
      if (q) {
        listStmt.bind([searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit, offset]);
      } else {
        listStmt.bind([limit, offset]);
      }

      const items = [];
      while (listStmt.step()) {
        items.push(listStmt.getAsObject());
      }
      listStmt.free();

      const totalPages = Math.ceil(total / limit);
      sendJson(res, 200, {
        page,
        limit,
        total,
        totalPages,
        items
      });
      return;
    }

    sendError(res, 405, `Method ${req.method} not allowed`);
  } catch (error) {
    console.error("[API Error]", error);
    sendError(res, 500, error.message);
  }
};
