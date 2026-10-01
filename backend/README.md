# InciGraph backend — Phase 1

FastAPI + Postgres read API that replaces `data.js` as the source of truth for the
frontend. No auth or billing yet (Phase 2) — this phase just gets the data off a static
file and into a real database with a real API in front of it.

## Local setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

No `DATABASE_URL` set → defaults to a local SQLite file (`local.db`), good enough to
develop against without standing up Postgres first.

Seed the database from the current `data.js`:

```bash
python scripts/seed_from_data_js.py
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Then open `http://localhost:8000/api/stats` — should show the same chemical/brand/product
counts as the live app. Interactive API docs are at `http://localhost:8000/docs`.

## Moving to real Postgres (Neon / Vercel Postgres)

1. Create a Postgres database — easiest path is **Vercel Postgres** (Storage tab in your
   Vercel project, powered by Neon) since you're already deploying there, or a Neon
   project directly at neon.tech.
2. Copy the connection string it gives you into `DATABASE_URL` (copy `env.example` to
   `.env` and set it there for local runs — `.env` is already gitignored).
3. Re-run `python scripts/seed_from_data_js.py` against that `DATABASE_URL`.

## Deploying to Vercel

```bash
cd backend
vercel
```

Set `DATABASE_URL` as a Vercel environment variable (Project Settings → Environment
Variables) pointing at the same Postgres instance. `vercel.json` is already set up to run
`app/main.py` as a Python serverless function.

## Endpoints

All read-only for now:

- `GET /api/stats` — chemical/brand/product/supplier counts
- `GET /api/brands`, `/api/brands/{id}`, `/api/brands/{id}/products`, `/api/brands/{id}/chemicals`
- `GET /api/chemicals`, `/api/chemicals/{id}`, `/api/chemicals/{id}/products`,
  `/api/chemicals/{id}/brands`, `/api/chemicals/{id}/suppliers`
- `GET /api/products`, `/api/products/{id}`, `/api/products/{id}/chemicals`
- `GET /api/suppliers`, `/api/suppliers/{id}`, `/api/suppliers/{id}/chemicals`
- `GET /api/search?q=...&type=all|chemical|brand|product|supplier`

Every list endpoint returns `{"total": <real count>, "items": [...]}`. `total` is always
the true count — when Phase 2 adds plan-based limits (e.g. a chemical manufacturer's plan
caps how many of the brands-using-this-chemical they can actually see), only `items`
should ever get truncated, never `total`. That's the hook point for enforcing "how much
data a subscription tier can see."

## What's next (not in this phase)

- **Auth**: accounts + multi-seat orgs (a subscription = an org with N seats).
- **Billing**: Stripe subscriptions, one plan per org.
- **Usage limits**: per-seat API call limits, and the `items` truncation described above
  based on the org's plan.
- **Frontend**: point `queries.js`'s functions at these endpoints instead of the in-memory
  `data.js` arrays.
- **Pipeline**: have `scraper/build_app_data.py` write to Postgres directly instead of
  generating `data.js`, so this seed script becomes unnecessary.
