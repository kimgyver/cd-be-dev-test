## Deploy To Vercel (GitHub)

This repo is configured so Vercel can run it directly after connecting the GitHub repository.

### 1. Before pushing

```bash
npm install
npm run import
```

Make sure `data/customers.db` is committed.

### 2. In Vercel

1. Import this GitHub repository.
2. Keep **Root Directory** as repository root (`.`), not `backend/`.
3. Deploy.

`vercel.json` already configures:

- API function at `/api/customers`
- frontend rewrites from `/` to `frontend/index.html`
- required SQLite assets (`data/customers.db`, `sql-wasm.wasm`) in the serverless bundle

### 3. Verify after deploy

- `https://<your-domain>/`
- `https://<your-domain>/api/customers?page=1&limit=10`

### Local command note

- Recommended: run from repo root: `npm run dev`
- If you are inside `backend/`, use: `npm --prefix .. run dev`
