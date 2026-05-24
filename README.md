# Inventory Reservation System

A small Next.js inventory reservation app built with Prisma and Postgres.

## Run locally

1. Install dependencies

```bash
cd app
npm install
```

2. Set the database URL

Copy `.env` from the template and set `DATABASE_URL` to your hosted Postgres database.

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

## Overview

- `GET /api/products` lists products and available stock per warehouse.
- `POST /api/reservations` reserves stock atomically and returns `409` if unavailable.
- `POST /api/reservations/:id/confirm` confirms reservation or returns `410` if expired.
- `POST /api/reservations/:id/release` releases a reservation early.

The app also includes a simple reservation detail page with live countdown.
