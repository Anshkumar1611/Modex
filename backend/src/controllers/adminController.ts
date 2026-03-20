import type { Request, Response } from "express";
import type { BookingService } from "../services/bookingService.js";

export function createAdminController(bookingService: BookingService) {
  return {
    createSlot: async (req: Request, res: Response) => {
      try {
        const doctorId = Number(req.body?.doctorId);
        const totalSeats = Number(req.body?.totalSeats);
        const startTimeRaw = req.body?.startTime;
        if (
          !Number.isFinite(doctorId) ||
          !Number.isFinite(totalSeats) ||
          typeof startTimeRaw !== "string"
        ) {
          res.status(400).json({ error: "INVALID_BODY" });
          return;
        }
        const startTime = new Date(startTimeRaw);
        if (Number.isNaN(startTime.getTime())) {
          res.status(400).json({ error: "INVALID_START_TIME" });
          return;
        }
        const result = await bookingService.createSlot(
          doctorId,
          startTime,
          totalSeats
        );
        if (!result.ok) {
          if (result.reason === "DOCTOR_NOT_FOUND") {
            res.status(404).json({ error: "DOCTOR_NOT_FOUND" });
            return;
          }
          res.status(409).json({ error: "DUPLICATE_SLOT" });
          return;
        }
        res.status(201).json({ slotId: result.slotId });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },

    listDoctors: async (_req: Request, res: Response) => {
      try {
        const doctors = await bookingService.listDoctors();
        res.json({ doctors });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  };
}
