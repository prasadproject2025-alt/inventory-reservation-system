# Inventory Reservation System

A small Next.js inventory reservation app built with Prisma and Postgres.

## What is implemented

- Product listing with available stock per warehouse.
- Reservation creation with atomic stock reservation and 409 handling.
- Reservation detail page with live countdown, confirm, and cancel.
- Reservation confirmation with expiry detection and 410 handling.
- Lazy expiry cleanup on product reads and reservation lookups.

## Run locally

1. Install dependencies

```bash
npm install
```

2. Set the database URL

Copy `.env` from the template and set `DATABASE_URL` to your Postgres database.

3. Push the Prisma schema and seed sample data

```bash
npx prisma db push
npm run seed
```

4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Expiry mechanism

This app uses lazy cleanup on web requests:

- `GET /api/products` runs expired reservation cleanup before returning inventory.
- `GET /api/reservations/:id` also checks and releases expired reservations.

That keeps stock accurate without requiring a separate worker or scheduler.

## Concurrency and correctness

Reservation creation uses an atomic SQL update inside a transaction:

- it increments `Inventory.reserved` only when `(total - reserved) >= quantity`
- if two requests race for the last unit, only one succeeds and the other returns `409`

Confirmation also updates inventory atomically and validates the reservation state.

## Notes and trade-offs

- The app currently reserves a fixed quantity of `1` per click for simplicity.
- Expired reservations are cleaned lazily on read; a production version could also add a cron worker for more timely cleanup.
- Idempotency is not implemented in this version.
