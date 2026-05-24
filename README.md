# Inventory Reservation System

Allo Engineering take-home: a Next.js app that holds inventory during checkout, with concurrency-safe reservations and automatic expiry.

All application code lives in [`app/`](app/). See **[app/README.md](app/README.md)** for local setup, API details, concurrency design, expiry, idempotency, and deployment.

## Quick start

```bash
cd app
cp .env.example .env
# Edit .env — set DATABASE_URL (hosted Postgres) and CRON_SECRET
npm install
npx prisma db push
npm run seed
npm run dev
```

## What’s included

- Product listing with per-warehouse available stock and **Reserve**
- Checkout page with live countdown, **Confirm purchase**, and **Cancel**
- REST API matching the exercise spec (`409` / `410` surfaced in the UI)
- Atomic reservation logic under concurrent requests
- Expiry via Vercel Cron + lazy cleanup on reads
- Optional **Idempotency-Key** on reserve and confirm (Postgres-backed)
