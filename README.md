# Modex — Doctor appointment booking

Production-oriented demo: **PostgreSQL row locks + transactions** prevent overbooking; **PENDING** holds expire after **2 minutes** (background job + confirm deadline).

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| API      | Node.js, Express, TypeScript, `pg`        |
| DB       | PostgreSQL                                |
| Web      | Next.js 14 (App Router), TS, Tailwind     |
| State    | React Context (`BookingProvider`)         |

## Architecture (backend)

```
backend/src/
  config.ts
  db/pool.ts
  index.ts
  routes/index.ts
  controllers/     # HTTP only
  services/        # transactions, FOR UPDATE, business rules
  types/
```

- **`POST /admin/create-slot`** — create slot (doctor, start time, seat count).
- **`GET /slots`** — list slots with live occupied count.
- **`GET /slots/:id`** — slot + per-seat availability (for grid + polling).
- **`POST /book-seat`** — `{ slotId, seatNumber }` → **PENDING** hold; `{ confirm: true, bookingId }` → **CONFIRMED**.
- **`GET /admin/doctors`** — list doctors (admin UI).

Booking flow:

1. `BEGIN` → `SELECT … FROM slots WHERE id = $1 **FOR UPDATE**` (serializes concurrent bookers for that slot).
2. Check seat not blocked by **CONFIRMED** or **active PENDING** (< 2 min).
3. `INSERT` **PENDING** → `COMMIT`.
4. Confirm updates to **CONFIRMED** (unique partial index on confirmed seat).
5. Cron every 30s: `UPDATE … SET FAILED` where **PENDING** and `created_at < now() - 2 min`.

## Setup

### PostgreSQL

```bash
createdb modex_booking
# or use your own DB and set DATABASE_URL
```

### Backend

```bash
cd backend
cp .env.example .env
# edit DATABASE_URL if needed
npm install
npm run dev
# API: http://localhost:4000
```

Migrations run automatically on API startup.

### Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
# http://localhost:3000
```

## UX

- **`/`** — slot list, availability, loading/empty/error.
- **`/booking/[id]`** — seat grid, select/deselect, poll every ~2.5s, hold timer, confirm → **CONFIRMED**.
- **`/admin`** — create slots.

## Race conditions

All seat claims for a given slot go through the **same slot row lock**, so two users cannot both insert a hold for the same seat; the second transaction sees the first **PENDING**/**CONFIRMED** and gets **409 SEAT_TAKEN**.
# Modex
