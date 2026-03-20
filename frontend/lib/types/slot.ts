export interface SlotSummary {
  id: number;
  doctorId: number;
  doctorName: string;
  startTime: string;
  totalSeats: number;
  bookedCount: number;
  availableCount: number;
}

export type SeatUiStatus = "available" | "pending" | "confirmed";

export interface SeatAvailability {
  seatNumber: number;
  status: SeatUiStatus;
  bookingId?: number;
  expiresAt?: string | null;
}

export interface SlotDetail extends SlotSummary {
  seats: SeatAvailability[];
}
