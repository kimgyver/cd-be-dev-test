# Backend Developer Test Solution

This repository contains a TypeScript solution for the test requirements:

1. Import CSV data into a database.
2. Expose a paginated API with input validation.
3. Provide a basic web app that asynchronously loads JSON into a list view.

## Tech Stack

- TypeScript (Node.js)
- SQLite database (generated as `data/customers.db`)
- `sql.js` (SQLite runtime)
- Vercel Serverless API (`backend/api/customers.ts`)
- React (CDN + Babel) frontend (`frontend/index.html`)
- Node test runner (`node:test`) via `tsx`

## Project Structure

```
backend/
  api/
    customers.ts          # Entry point that delegates to customers controller
  db/
    index.ts              # SQLite DB loader
  customers/
    controller.ts         # HTTP/controller layer (method routing + status mapping)
    service.ts            # Business logic/use-cases
    repository.ts         # Data access layer (SQL)
    http.ts               # HTTP utilities
    types.ts              # TypeScript types
  pagination.ts           # Pagination logic

frontend/
  index.html              # HTML shell
  styles.css              # UI styles
  api.js                  # API client functions
  useCustomers.js         # React hook for data fetching
  CustomerEditor.jsx      # Form component
  CustomerItem.jsx        # List item component
  app.jsx                 # Root App component

scripts/
  import-customers.ts     # CSV → SQLite import script
  local-server.ts         # Local dev server

tests/
  api-customers.test.ts   # API integration tests (18 tests)
  pagination.test.ts      # Pagination unit tests (5 tests)
  helpers/
    http-mocks.ts         # Mock request/response utilities

data/
  customers.csv           # Source data (980 rows)
  customers.db            # Generated SQLite database
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Generate SQLite DB from CSV

```bash
npm run import
```

Outputs to `data/customers.db`.

### 3. Run tests

```bash
npm test
```

23 tests covering:

- API GET/PUT/DELETE operations
- Input validation
- Pagination logic
- Error handling
- CORS preflight

### 4. Run locally

```bash
npm run dev
```

Opens at `http://localhost:3001` (default, or set `PORT=xxxx`).

- Web app: `http://localhost:3001/`
- API: `http://localhost:3001/api/customers?page=1&limit=10`

## API

### GET `/api/customers`

Query params:

- `page`: Positive integer, default `1`
- `limit`: Positive integer, default `20`, max `100`
- `q`: Optional search text (searches name/email/company/city)
- `sortBy`: Optional column name (default `id`) — allowed: `id`, `first_name`, `last_name`, `email`, `company`, `city`
- `sortOrder`: Optional `asc | desc` (default `asc`)

Example:

```bash
curl "http://localhost:3001/api/customers?page=2&limit=10&q=laura&sortBy=first_name&sortOrder=asc"
```

Response shape:

```json
{
  "page": 1,
  "limit": 10,
  "sortBy": "first_name",
  "sortOrder": "asc",
  "total": 980,
  "totalPages": 98,
  "items": [
    {
      "id": 1,
      "first_name": "Laura",
      "last_name": "Richards",
      "email": "lrichards0@reverbnation.com",
      "gender": "Female",
      "ip_address": "81.192.7.99",
      "company": "Meezzy",
      "city": "Kallithea",
      "title": "Biostatistician III",
      "website": "https://..."
    }
  ]
}
```

### PUT `/api/customers`

Update one customer by id.

Request body example:

```json
{
  "id": 1,
  "first_name": "Laura",
  "last_name": "Richards",
  "email": "laura@example.com",
  "company": "Meezzy",
  "city": "Auckland",
  "title": "Engineer"
}
```

### DELETE `/api/customers?id=1`

Delete one customer by id.

## Notes on SQLite + Vercel

SQLite is fine for this coding test on Vercel when used as a read-only deployed artifact.

- Import data before deployment (`npm run import`).
- Commit `data/customers.db` to the repository.
- At runtime, the API reads from this file.

For production systems with live writes, use managed DB options (for example Vercel Postgres, Neon, Supabase, or Turso).

Note: `PUT` and `DELETE` in this demo update the in-memory DB instance of the running process. The source file `data/customers.db` is not rewritten by API calls.

## Scripts

- `npm run import`: Build `data/customers.db` from CSV
- `npm run typecheck`: TypeScript checks
- `npm test`: Run 23 unit + integration tests
- `npm run dev`: Run local API + static web server
- `npm run dev:vercel`: Run with Vercel CLI

## Assessment Notes

- Security: user inputs are validated for pagination and sorting parameters.
- Performance: indexed `email`, pagination with `LIMIT/OFFSET`, and read-only SQLite for low ops overhead.
- Accessibility: semantic HTML, responsive layout, keyboard search (`Enter`) support.
