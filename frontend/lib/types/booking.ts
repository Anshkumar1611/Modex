export type BookingStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface Booking {
  id: number;
  slotId: number;
  seatNumber: number;
  status: BookingStatus;
  createdAt: string;
  expiresAt?: string | null;
}
