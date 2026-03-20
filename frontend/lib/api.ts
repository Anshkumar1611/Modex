import type { Booking, SlotDetail, SlotSummary } from "./types";

const base = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || res.statusText);
  }
}

export const api = {
  async listSlots(): Promise<SlotSummary[]> {
    const res = await fetch(`${base()}/slots`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load slots");
    const data = await parseJson<{ slots: SlotSummary[] }>(res);
    return data.slots;
  },

  async getSlot(id: number): Promise<SlotDetail> {
    const res = await fetch(`${base()}/slots/${id}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) throw new Error("SLOT_NOT_FOUND");
      throw new Error("Failed to load slot");
    }
    return parseJson<SlotDetail>(res);
  },

  async reserveSeat(slotId: number, seatNumber: number): Promise<Booking> {
    const res = await fetch(`${base()}/book-seat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, seatNumber }),
    });
    type ErrBody = { booking?: Booking; error?: string; message?: string };
    let data: ErrBody = {};
    try {
      data = await parseJson<ErrBody>(res);
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || "Reserve failed");
    }
    if (!data.booking) throw new Error("Invalid response");
    return data.booking;
  },

  async confirmBooking(bookingId: number): Promise<Booking> {
    const res = await fetch(`${base()}/book-seat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, bookingId }),
    });
    type ErrBody = { booking?: Booking; error?: string; message?: string };
    let data: ErrBody = {};
    try {
      data = await parseJson<ErrBody>(res);
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || "Confirm failed");
    }
    if (!data.booking) throw new Error("Invalid response");
    return data.booking;
  },

  async listDoctors(): Promise<Array<{ id: number; name: string }>> {
    const res = await fetch(`${base()}/admin/doctors`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load doctors");
    const data = await parseJson<{ doctors: Array<{ id: number; name: string }> }>(
      res
    );
    return data.doctors;
  },

  async createSlot(body: {
    doctorId: number;
    startTime: string;
    totalSeats: number;
  }): Promise<number> {
    const res = await fetch(`${base()}/admin/create-slot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    type CreateRes = { slotId?: number; error?: string };
    let data: CreateRes = {};
    try {
      data = await parseJson<CreateRes>(res);
    } catch {
      /* ignore */
    }
    if (!res.ok) throw new Error(data.error || "Create slot failed");
    if (data.slotId == null) throw new Error("Invalid response");
    return data.slotId;
  },
};
