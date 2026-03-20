import { PENDING_TTL_MS } from "../constants/booking.js";

export function pendingExpiresBefore(): Date {
  return new Date(Date.now() - PENDING_TTL_MS);
}

/** True if this PENDING row is still within the hold window */
export function pendingStillActive(createdAt: Date): boolean {
  return createdAt.getTime() > pendingExpiresBefore().getTime();
}
