export type BookingStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface Doctor {
  id: number;
  name: string;
}

export interface Slot {
  id: number;
  doctorId: number;
  doctorName: string;
  startTime: string;
  totalSeats: number;
  /** Seats currently unavailable (CONFIRMED or active PENDING) */
  bookedCount?: number;
  availableCount?: number;
}

export interface Booking {
  id: number;
  slotId: number;
  seatNumber: number;
  status: BookingStatus;
  createdAt: string;
  expiresAt?: string | null;
}

export interface CreateSlotBody {
  doctorId: number;
  startTime: string;
  totalSeats: number;
}

export interface BookSeatBody {
  slotId: number;
  seatNumber: number;
}

export interface SeatAvailability {
  seatNumber: number;
  status: "available" | "pending" | "confirmed" | "failed";
  bookingId?: number;
  expiresAt?: string | null;
}

export interface SlotDetail extends Slot {
  seats: SeatAvailability[];
}
