import type pg from "pg";
import type { Booking, BookingStatus, SeatAvailability, SlotDetail } from "../types/index.js";

const PENDING_TTL_MS = 2 * 60 * 1000;

export function pendingExpiresBefore(): Date {
  return new Date(Date.now() - PENDING_TTL_MS);
}

/** Active PENDING = not yet expired */
function pendingStillActive(createdAt: Date): boolean {
  return createdAt.getTime() > pendingExpiresBefore().getTime();
}

export class BookingService {
  constructor(private pool: pg.Pool) {}

  async runMigrateOnBoot(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slots (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0 AND total_seats <= 200),
  UNIQUE (doctor_id, start_time)
);
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot_seat_confirmed
  ON bookings (slot_id, seat_number) WHERE status = 'CONFIRMED';
CREATE INDEX IF NOT EXISTS idx_bookings_slot_seat_pending
  ON bookings (slot_id, seat_number) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_bookings_pending_expiry
  ON bookings (created_at) WHERE status = 'PENDING';
`);
      const { rows } = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM doctors"
      );
      if (Number(rows[0].count) === 0) {
        await client.query(
          `INSERT INTO doctors (name) VALUES 
           ('Dr. Sarah Chen'), ('Dr. James Wilson'), ('Dr. Priya Patel')`
        );
      }
    } finally {
      client.release();
    }
  }

  /**
   * Marks stale PENDING bookings as FAILED (batch).
   */
  async expirePendingBookings(): Promise<number> {
    const r = await this.pool.query(
      `UPDATE bookings
       SET status = 'FAILED'
       WHERE status = 'PENDING'
         AND created_at < NOW() - INTERVAL '2 minutes'`
    );
    return r.rowCount ?? 0;
  }

  async listSlots(): Promise<
    Array<{
      id: number;
      doctorId: number;
      doctorName: string;
      startTime: string;
      totalSeats: number;
      bookedCount: number;
      availableCount: number;
    }>
  > {
    const { rows } = await this.pool.query<{
      id: number;
      doctor_id: number;
      doctor_name: string;
      start_time: Date;
      total_seats: number;
      blocked_seats: string | null;
    }>(
      `SELECT s.id, s.doctor_id, d.name AS doctor_name, s.start_time, s.total_seats,
        (
          SELECT COUNT(DISTINCT b.seat_number)::text
          FROM bookings b
          WHERE b.slot_id = s.id
            AND (
              b.status = 'CONFIRMED'
              OR (b.status = 'PENDING' AND b.created_at >= NOW() - INTERVAL '2 minutes')
            )
        ) AS blocked_seats
       FROM slots s
       JOIN doctors d ON d.id = s.doctor_id
       ORDER BY s.start_time ASC`
    );
    return rows.map((r) => {
      const blocked = Number(r.blocked_seats ?? 0);
      return {
        id: r.id,
        doctorId: r.doctor_id,
        doctorName: r.doctor_name,
        startTime: r.start_time.toISOString(),
        totalSeats: r.total_seats,
        bookedCount: blocked,
        availableCount: Math.max(0, r.total_seats - blocked),
      };
    });
  }

  async getSlotDetail(slotId: number): Promise<SlotDetail | null> {
    const slotRes = await this.pool.query<{
      id: number;
      doctor_id: number;
      doctor_name: string;
      start_time: Date;
      total_seats: number;
    }>(
      `SELECT s.id, s.doctor_id, d.name AS doctor_name, s.start_time, s.total_seats
       FROM slots s JOIN doctors d ON d.id = s.doctor_id WHERE s.id = $1`,
      [slotId]
    );
    if (slotRes.rowCount === 0) return null;

    const s = slotRes.rows[0];
    const bookingsRes = await this.pool.query<{
      seat_number: number;
      status: BookingStatus;
      id: number;
      created_at: Date;
    }>(
      `SELECT seat_number, status, id, created_at FROM bookings
       WHERE slot_id = $1
         AND (
           status = 'CONFIRMED'
           OR (status = 'PENDING' AND created_at >= NOW() - INTERVAL '2 minutes')
         )`,
      [slotId]
    );

    const bySeat = new Map<number, { status: BookingStatus; id: number; created_at: Date }>();
    for (const b of bookingsRes.rows) {
      const existing = bySeat.get(b.seat_number);
      if (b.status === "CONFIRMED") {
        bySeat.set(b.seat_number, b);
      } else if (b.status === "PENDING" && pendingStillActive(b.created_at)) {
        if (!existing || existing.status !== "CONFIRMED") bySeat.set(b.seat_number, b);
      }
    }

    const seats: SeatAvailability[] = [];
    for (let n = 1; n <= s.total_seats; n++) {
      const b = bySeat.get(n);
      if (!b) seats.push({ seatNumber: n, status: "available" });
      else if (b.status === "CONFIRMED")
        seats.push({
          seatNumber: n,
          status: "confirmed",
          bookingId: b.id,
        });
      else
        seats.push({
          seatNumber: n,
          status: "pending",
          bookingId: b.id,
          expiresAt: new Date(b.created_at.getTime() + PENDING_TTL_MS).toISOString(),
        });
    }

    const blocked = seats.filter((x) => x.status !== "available").length;
    return {
      id: s.id,
      doctorId: s.doctor_id,
      doctorName: s.doctor_name,
      startTime: s.start_time.toISOString(),
      totalSeats: s.total_seats,
      bookedCount: blocked,
      availableCount: s.total_seats - blocked,
      seats,
    };
  }

  /**
   * Reserve seat: transaction + SELECT slot FOR UPDATE + check seat + INSERT PENDING.
   */
  async reserveSeat(slotId: number, seatNumber: number): Promise<
    | { ok: true; booking: Booking }
    | { ok: false; reason: "SLOT_NOT_FOUND" | "SEAT_INVALID" | "SEAT_TAKEN" }
  > {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM slots WHERE id = $1 FOR UPDATE",
        [slotId]
      );
      const slotRow = await client.query<{ total_seats: number }>(
        "SELECT total_seats FROM slots WHERE id = $1",
        [slotId]
      );
      if (slotRow.rowCount === 0) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "SLOT_NOT_FOUND" };
      }
      const total = slotRow.rows[0].total_seats;
      if (seatNumber < 1 || seatNumber > total) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "SEAT_INVALID" };
      }

      const conflict = await client.query<{ id: number }>(
        `SELECT id FROM bookings
         WHERE slot_id = $1 AND seat_number = $2
           AND (
             status = 'CONFIRMED'
             OR (status = 'PENDING' AND created_at >= NOW() - INTERVAL '2 minutes')
           )
         FOR UPDATE`,
        [slotId, seatNumber]
      );
      if (conflict.rowCount && conflict.rowCount > 0) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "SEAT_TAKEN" };
      }

      const ins = await client.query<{
        id: number;
        slot_id: number;
        seat_number: number;
        status: BookingStatus;
        created_at: Date;
      }>(
        `INSERT INTO bookings (slot_id, seat_number, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING id, slot_id, seat_number, status, created_at`,
        [slotId, seatNumber]
      );
      await client.query("COMMIT");
      const row = ins.rows[0];
      return {
        ok: true,
        booking: {
          id: row.id,
          slotId: row.slot_id,
          seatNumber: row.seat_number,
          status: row.status,
          createdAt: row.created_at.toISOString(),
          expiresAt: new Date(row.created_at.getTime() + PENDING_TTL_MS).toISOString(),
        },
      };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm a PENDING booking (same user flow — id known from reserve).
   */
  async confirmBooking(bookingId: number): Promise<
    | { ok: true; booking: Booking }
    | {
        ok: false;
        reason: "NOT_FOUND" | "NOT_PENDING" | "EXPIRED" | "CONFLICT";
      }
  > {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const b = await client.query<{
        id: number;
        slot_id: number;
        seat_number: number;
        status: BookingStatus;
        created_at: Date;
      }>(
        `SELECT id, slot_id, seat_number, status, created_at FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
      if (b.rowCount === 0) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "NOT_FOUND" };
      }
      const row = b.rows[0];
      if (row.status !== "PENDING") {
        await client.query("ROLLBACK");
        return { ok: false, reason: "NOT_PENDING" };
      }
      if (!pendingStillActive(row.created_at)) {
        await client.query(
          `UPDATE bookings SET status = 'FAILED' WHERE id = $1`,
          [bookingId]
        );
        await client.query("COMMIT");
        return { ok: false, reason: "EXPIRED" };
      }

      const other = await client.query(
        `SELECT id FROM bookings
         WHERE slot_id = $1 AND seat_number = $2 AND status = 'CONFIRMED' AND id <> $3`,
        [row.slot_id, row.seat_number, bookingId]
      );
      if (other.rowCount && other.rowCount > 0) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "CONFLICT" };
      }

      await client.query(
        `UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1`,
        [bookingId]
      );
      await client.query("COMMIT");
      return {
        ok: true,
        booking: {
          id: row.id,
          slotId: row.slot_id,
          seatNumber: row.seat_number,
          status: "CONFIRMED",
          createdAt: row.created_at.toISOString(),
        },
      };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async createSlot(
    doctorId: number,
    startTime: Date,
    totalSeats: number
  ): Promise<{ ok: true; slotId: number } | { ok: false; reason: "DOCTOR_NOT_FOUND" | "DUPLICATE_SLOT" }> {
    const client = await this.pool.connect();
    try {
      const doc = await client.query("SELECT id FROM doctors WHERE id = $1", [
        doctorId,
      ]);
      if (doc.rowCount === 0)
        return { ok: false, reason: "DOCTOR_NOT_FOUND" };
      const ins = await client.query<{ id: number }>(
        `INSERT INTO slots (doctor_id, start_time, total_seats)
         VALUES ($1, $2, $3)
         ON CONFLICT (doctor_id, start_time) DO NOTHING
         RETURNING id`,
        [doctorId, startTime.toISOString(), totalSeats]
      );
      if (ins.rowCount === 0) return { ok: false, reason: "DUPLICATE_SLOT" };
      return { ok: true, slotId: ins.rows[0].id };
    } finally {
      client.release();
    }
  }

  async listDoctors(): Promise<Array<{ id: number; name: string }>> {
    const { rows } = await this.pool.query<{ id: number; name: string }>(
      "SELECT id, name FROM doctors ORDER BY id"
    );
    return rows;
  }
}
