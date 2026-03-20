# Modex — Doctor Appointment Booking System

Production-oriented demo: **PostgreSQL transactions + `SELECT … FOR UPDATE`** prevent overbooking; **PENDING** holds expire after **2 minutes** (background job + confirm deadline).

---

## Modex Technology Lab — Assignment Submission

| Field | Your entry |
|--------|------------|
| **Your full name** | *Ansh Kumar Gupta* *(update if different)* |
| **Email** | ansh2018gupta@gmail.com |
| **GitHub repository** | `https://github.com/YOUR_USERNAME/modex` *(replace with your repo URL)* |
| **Deployment link(s)** | *API:* `https://YOUR-API.example.com` · *Web:* `https://YOUR-APP.example.com` *(or “Local only — see Setup”)* |
| **Anything else?** | *Optional: Neon used for hosted Postgres; see Environment variables below.* |

### Code & document submission (summary)

This README is the **primary submission document**. It describes:

- **Problem**: Concurrent seat booking for doctor visit slots without overbooking.
- **Solution**: Express + PostgreSQL with row-level locking and transactional reserve/confirm; Next.js UI with real-time polling and React Context.
- **How to run**: Backend (`backend/`), frontend (`frontend/`), env vars, and API overview.
- **Correctness**: Booking states `PENDING` → `CONFIRMED` / `FAILED`; unique partial index on confirmed seats; slot-level `FOR UPDATE` serializes conflicting requests.

Replace the placeholder **GitHub** and **Deployment** URLs in the table above before submitting the form.

---

## Stack

| Layer | Tech |
|--------|------|
| API | Node.js, Express, TypeScript, `pg` |
| DB | PostgreSQL (local or hosted, e.g. Neon) |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | React Context (`BookingProvider`) |

---

## Repository layout

```
modex/
├── backend/
│   └── src/
│       ├── app.ts                 # Express app factory
│       ├── index.ts               # Bootstrap (DB migrate, server)
│       ├── config.ts
│       ├── constants/             # e.g. PENDING hold duration
│       ├── controllers/           # *.controller.ts — HTTP + asyncHandler
│       ├── middleware/            # async-handler
│       ├── routes/
│       ├── services/              # migration, slot, booking (split)
│       ├── utils/
│       ├── db/                    # pool, ddl.ts, migrate script
│       └── types/
├── frontend/
│   ├── app/                       # App Router pages
│   ├── components/
│   │   ├── layout/                # shell (PageHeader, BackLink)
│   │   ├── booking/               # SeatButton
│   │   └── slots/                 # SlotCard
│   ├── contexts/                  # BookingProvider
│   └── lib/
│       ├── api.ts
│       ├── constants.ts
│       └── types/                 # booking.ts, slot.ts
└── README.md
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin/create-slot` | Create slot: `{ doctorId, startTime, totalSeats }` |
| `GET` | `/admin/doctors` | List doctors (admin UI) |
| `GET` | `/slots` | List all slots + availability counts |
| `GET` | `/slots/:id` | Slot detail + per-seat status (for grid / polling) |
| `POST` | `/book-seat` | Reserve: `{ slotId, seatNumber }` → **PENDING**; confirm: `{ confirm: true, bookingId }` → **CONFIRMED** |
| `GET` | `/health` | Liveness check |

---

## Booking logic (concurrency)

1. `BEGIN` → `SELECT id FROM slots WHERE id = $1 **FOR UPDATE**` — serializes bookers for that slot.
2. Ensure seat is not taken by **CONFIRMED** or **active PENDING** (created within last 2 minutes).
3. `INSERT` booking with status **PENDING** → `COMMIT`.
4. Client confirms → transaction promotes row to **CONFIRMED** (guarded by partial unique index on `(slot_id, seat_number)` where confirmed).
5. Background job (every 30s): stale **PENDING** → **FAILED** after 2 minutes.

Second concurrent request for the same seat waits on the lock, then sees the first booking and receives **409** / `SEAT_TAKEN`.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | `postgresql://…` | Postgres (local or Neon); `sslmode` normalized for `pg` |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allowlist |

### Frontend (`frontend/.env.local`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL for API calls |

---

## Setup (local)

### 1. Database

Create a database and set `DATABASE_URL`, **or** use a hosted Postgres (e.g. Neon) and paste the connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL (and PORT if needed)
npm install
npm run dev
# API: http://localhost:4000
```

Schema migrations and default doctors run on API startup.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your API URL
npm install
npm run dev
# App: http://localhost:3000
```

---

## Pages (UX)

| Route | Purpose |
|-------|---------|
| `/` | List slots, live availability, refresh |
| `/booking/[id]` | Seat grid, select/deselect, ~2.5s polling, 2-minute hold + confirm |
| `/admin` | Create slots |

---

## Production notes

- Use a managed Postgres in production; set `FRONTEND_ORIGIN` to your deployed web origin.
- Deploy API and web separately (e.g. Railway, Render, Vercel + API host); point `NEXT_PUBLIC_API_URL` at the public API URL.
- Rotate database credentials if `.env` was ever committed; keep secrets out of `README` and `.env.example`.

---

## License

Private / assignment use unless otherwise specified.
