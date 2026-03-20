import type pg from "pg";
import type { Booking, BookingStatus } from "../types/index.js";
import { PENDING_SQL_INTERVAL, PENDING_TTL_MS } from "../constants/booking.js";
import { pendingStillActive } from "../utils/pending.js";

export class BookingService {
  constructor(private readonly pool: pg.Pool) {}

  async expirePendingBookings(): Promise<number> {
    const r = await this.pool.query(
      `UPDATE bookings
       SET status = 'FAILED'
       WHERE status = 'PENDING'
         AND created_at < NOW() - INTERVAL ${PENDING_SQL_INTERVAL}`
    );
    return r.rowCount ?? 0;
  }

  async reserveSeat(
    slotId: number,
    seatNumber: number
  ): Promise<
    | { ok: true; booking: Booking }
    | { ok: false; reason: "SLOT_NOT_FOUND" | "SEAT_INVALID" | "SEAT_TAKEN" }
  > {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM slots WHERE id = $1 FOR UPDATE", [slotId]);
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
             OR (status = 'PENDING' AND created_at >= NOW() - INTERVAL ${PENDING_SQL_INTERVAL})
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
          expiresAt: new Date(
            row.created_at.getTime() + PENDING_TTL_MS
          ).toISOString(),
        },
      };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

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
        await client.query(`UPDATE bookings SET status = 'FAILED' WHERE id = $1`, [
          bookingId,
        ]);
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

      await client.query(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1`, [
        bookingId,
      ]);
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
}
