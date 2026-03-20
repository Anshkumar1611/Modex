import type pg from "pg";
import type { BookingStatus, SeatAvailability, SlotDetail } from "../types/index.js";
import { PENDING_SQL_INTERVAL, PENDING_TTL_MS } from "../constants/booking.js";
import { pendingStillActive } from "../utils/pending.js";

export type SlotSummaryRow = {
  id: number;
  doctorId: number;
  doctorName: string;
  startTime: string;
  totalSeats: number;
  bookedCount: number;
  availableCount: number;
};

export class SlotService {
  constructor(private readonly pool: pg.Pool) {}

  async listSlots(): Promise<SlotSummaryRow[]> {
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
              OR (b.status = 'PENDING' AND b.created_at >= NOW() - INTERVAL ${PENDING_SQL_INTERVAL})
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
           OR (status = 'PENDING' AND created_at >= NOW() - INTERVAL ${PENDING_SQL_INTERVAL})
         )`,
      [slotId]
    );

    const bySeat = new Map<
      number,
      { status: BookingStatus; id: number; created_at: Date }
    >();
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
          expiresAt: new Date(
            b.created_at.getTime() + PENDING_TTL_MS
          ).toISOString(),
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

  async createSlot(
    doctorId: number,
    startTime: Date,
    totalSeats: number
  ): Promise<
    | { ok: true; slotId: number }
    | { ok: false; reason: "DOCTOR_NOT_FOUND" | "DUPLICATE_SLOT" }
  > {
    const client = await this.pool.connect();
    try {
      const doc = await client.query("SELECT id FROM doctors WHERE id = $1", [
        doctorId,
      ]);
      if (doc.rowCount === 0) return { ok: false, reason: "DOCTOR_NOT_FOUND" };
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
