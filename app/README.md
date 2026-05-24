# Allo Inventory Reservation System

A Next.js (App Router) take-home implementation of checkout inventory reservations: temporarily hold stock during payment, confirm on success, release on cancel or expiry — with race-safe reservation creation.

## Live demo

Deploy to Vercel with a hosted Postgres provider (Supabase, Neon, or Railway). Set `DATABASE_URL` and `CRON_SECRET` in the project environment, run `npx prisma db push` and `npm run seed` against that database, then share the Vercel URL in your submission.

## Run locally

1. **Install dependencies** (from this `app/` directory):

```bash
npm install
```

2. **Configure environment**

```bash
cp .env.example .env
```

Set `DATABASE_URL` to a hosted Postgres connection string (not SQLite). Set `CRON_SECRET` to any long random string (used by the expiry cron route).

3. **Apply schema and seed**

```bash
npx prisma db push
npm run seed
```

4. **Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | Products with available stock per warehouse |
| GET | `/api/warehouses` | All warehouses |
| POST | `/api/reservations` | Reserve units; `409` if insufficient stock |
| POST | `/api/reservations/:id/confirm` | Confirm reservation; `410` if expired |
| POST | `/api/reservations/:id/release` | Release hold early |

Request body for `POST /api/reservations` (validated with Zod):

```json
{ "productId": 1, "warehouseId": 1, "quantity": 1 }
```

Optional header on reserve and confirm: `Idempotency-Key: <client-generated-uuid>` — retries return the original response without duplicating side effects (stored in Postgres for 24 hours).

## Data model

- **Product** / **Warehouse** — catalog and locations
- **Inventory** — `total` (on-hand units) and `reserved` (held, not yet sold)
- **Reservation** — `PENDING` → `CONFIRMED` or `RELEASED`, with `expiresAt` (10 minutes from creation)
- **IdempotencyRecord** — cached API responses for idempotent retries

Available stock for a SKU at a warehouse is `total - reserved`.

## Concurrency (core requirement)

Reservation creation runs in a single database transaction:

1. Lazy-release any expired `PENDING` reservations (see below).
2. Atomically increment `Inventory.reserved` only when `(total - reserved) >= quantity`:

```sql
UPDATE "Inventory"
SET "reserved" = "reserved" + $qty
WHERE "id" = $id AND ("total" - "reserved") >= $qty;
```

If the update affects zero rows, the transaction aborts and the API returns **409**. Two simultaneous requests for the last unit therefore cannot both succeed — Postgres row-level locking on the `UPDATE` serializes writers.

Confirmation decrements both `reserved` and `total` in one conditional update; release decrements only `reserved`.

## Reservation expiry

**Production:** Vercel Cron calls `GET /api/cron/expire-reservations` every minute (`vercel.json`). The route checks `Authorization: Bearer <CRON_SECRET>` and bulk-releases expired `PENDING` reservations.

**Lazy cleanup:** `GET /api/products`, `POST /api/reservations`, and `GET /api/reservations/:id` also run expiry cleanup inside their transactions so stock stays accurate even if cron is delayed.

## Idempotency (bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` accept `Idempotency-Key`. The first request runs normally; the response (status + JSON body) is persisted in `IdempotencyRecord`. Retries with the same key return the stored response without re-running inventory updates. Implemented in Postgres (no Redis) to keep the deployment footprint small.

## Trade-offs and future work

- UI reserves **1 unit** per click; the API supports arbitrary positive quantities.
- Lazy expiry on reads plus cron — not a dedicated background worker queue.
- No automated concurrency integration test in CI (manual or `curl` parallel calls recommended).
- Auth, observability, and multi-tenant isolation are out of scope for the exercise.

## Deploy (Vercel + hosted Postgres)

1. Create a Postgres database (Supabase / Neon / Railway) and copy the connection string.
2. Import the repo in Vercel; set root directory to `app` if the monorepo layout is used.
3. Environment variables: `DATABASE_URL`, `CRON_SECRET`.
4. Build command: `npm run build` (runs `prisma generate`).
5. After first deploy, run `npx prisma db push` and `npm run seed` against production (or use a one-off script / local `DATABASE_URL` pointing at prod for seeding only).
