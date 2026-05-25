# Allo Inventory Reservation System

## Live Demo

[https://allo-inventory-beta.vercel.app?_vercel_share=5Yl4GveiHXzVpAkUzSv7F1JZ0vJI8q1u](https://allo-inventory-beta.vercel.app?_vercel_share=5Yl4GveiHXzVpAkUzSv7F1JZ0vJI8q1u)

## GitHub Repository

[https://github.com/praveenkumaran2022-dotcom/allo-inventory](https://github.com/praveenkumaran2022-dotcom/allo-inventory)

---

# Overview

This project is an inventory reservation system built for multi-warehouse retail and D2C brands.

The system prevents overselling during checkout by introducing temporary inventory reservations.

When a customer reserves a product:

* Stock is temporarily held.
* Other users cannot reserve the same quantity.
* If payment succeeds, reservation is confirmed.
* If payment fails or expires, stock is released automatically.

---

# Features

* Product listing with stock availability
* Multi-warehouse inventory management
* Temporary reservation system
* Reservation confirmation flow
* Reservation cancellation flow
* Reservation expiry handling
* Concurrency-safe reservation logic
* Prisma + PostgreSQL database integration
* Next.js App Router API routes
* Hosted deployment on Vercel

---

# Tech Stack

* Next.js 16
* TypeScript
* Prisma ORM
* PostgreSQL (Supabase)
* Redis (Upstash)
* Tailwind CSS
* Vercel Deployment

---

# Project Structure

```bash
app/
 ├── api/
 │    ├── products/
 │    ├── warehouses/
 │    ├── reservations/
 │
 ├── page.tsx
 │
lib/
 ├── prisma.ts
 │
prisma/
 ├── schema.prisma
 ├── seed.ts
```

---

# API Endpoints

## Products

### GET /api/products

Returns all available products.

---

## Warehouses

### GET /api/warehouses

Returns warehouse list.

---

## Reservations

### POST /api/reservations

Creates temporary reservation.

Returns:

* 200 → success
* 409 → insufficient stock

---

### POST /api/reservations/:id/confirm

Confirms reservation after payment.

Returns:

* 200 → confirmed
* 410 → reservation expired

---

### POST /api/reservations/:id/release

Releases reservation.

Used when:

* payment failed
* user cancelled

---

# Concurrency Handling

The reservation system is protected against race conditions using Prisma transactions.

Workflow:

1. Start transaction
2. Check available stock
3. Lock inventory row
4. Reserve stock if available
5. Return 409 if stock unavailable

This ensures only one user can reserve the last available unit.

---

# Reservation Expiry

Expired reservations are automatically released.

Implementation:

* Lazy cleanup strategy
* Expired reservations are checked during API requests
* Reserved stock is released automatically

This approach avoids the need for paid Vercel cron jobs.

---

# Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres.soswuxkeptejqpwaqxux:Pk@9791878745@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
REDIS_URL="rediss://default:gQAAAAAAAAhDLAAIgcDFlY2NlODY1OGE4ZjE0Yzc5OGM4ZWRhMzhlNWFhMDkwZA@enormous-cicada-135397.upstash.io:6379"
```

---

# Prisma Setup

## Install Dependencies

```bash
npm install
```

---

## Generate Prisma Client

```bash
npx prisma generate
```

---

## Run Migrations

```bash
npx prisma migrate deploy
```

---

## Seed Database

```bash
npx prisma db seed
```

---

# Run Locally

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

# Deployment

The application is deployed using:

* Vercel → frontend + API
* Supabase → PostgreSQL database
* Upstash → Redis

---

# Build Command

```bash
prisma generate && next build
```

---

# Tradeoffs

* Lazy cleanup used instead of cron jobs to support Vercel Hobby plan.
* Simpler reservation management for easier maintainability.
* Focused more on correctness and concurrency safety.

---

# Future Improvements

* Add authentication
* Add admin dashboard
* Add analytics
* Add real-time stock updates
* Add payment g
