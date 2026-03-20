import type { Request, Response } from "express";
import type { BookingService } from "../services/booking.service.js";
import { asyncHandler } from "../middleware/async-handler.js";

const CONFIRM_STATUS: Record<
  "NOT_FOUND" | "NOT_PENDING" | "EXPIRED" | "CONFLICT",
  number
> = {
  NOT_FOUND: 404,
  NOT_PENDING: 409,
  EXPIRED: 410,
  CONFLICT: 409,
};

export function createBookingController(bookingService: BookingService) {
  return {
    bookSeat: asyncHandler(async (req: Request, res: Response) => {
      const confirm = req.body?.confirm === true;
      if (confirm) {
        const bookingId = Number(req.body?.bookingId);
        if (!Number.isFinite(bookingId)) {
          res.status(400).json({ error: "INVALID_BOOKING_ID" });
          return;
        }
        const result = await bookingService.confirmBooking(bookingId);
        if (!result.ok) {
          res.status(CONFIRM_STATUS[result.reason]).json({
            error: result.reason,
            message:
              result.reason === "EXPIRED"
                ? "Reservation expired. Please select a seat again."
                : undefined,
          });
          return;
        }
        res.status(200).json({ booking: result.booking });
        return;
      }

      const slotId = Number(req.body?.slotId);
      const seatNumber = Number(req.body?.seatNumber);
      if (!Number.isFinite(slotId) || !Number.isFinite(seatNumber)) {
        res.status(400).json({ error: "INVALID_BODY" });
        return;
      }
      const result = await bookingService.reserveSeat(slotId, seatNumber);
      if (!result.ok) {
        const status =
          result.reason === "SLOT_NOT_FOUND"
            ? 404
            : result.reason === "SEAT_INVALID"
              ? 400
              : 409;
        res.status(status).json({
          error: result.reason,
          message:
            result.reason === "SEAT_TAKEN"
              ? "This seat is no longer available."
              : undefined,
        });
        return;
      }
      res.status(201).json({ booking: result.booking });
    }),
  };
}
