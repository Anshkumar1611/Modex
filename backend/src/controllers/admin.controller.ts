import type { Request, Response } from "express";
import type { SlotService } from "../services/slot.service.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createAdminController(slotService: SlotService) {
  return {
    createSlot: asyncHandler(async (req: Request, res: Response) => {
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
      const result = await slotService.createSlot(doctorId, startTime, totalSeats);
      if (!result.ok) {
        if (result.reason === "DOCTOR_NOT_FOUND") {
          res.status(404).json({ error: "DOCTOR_NOT_FOUND" });
          return;
        }
        res.status(409).json({ error: "DUPLICATE_SLOT" });
        return;
      }
      res.status(201).json({ slotId: result.slotId });
    }),

    listDoctors: asyncHandler(async (_req: Request, res: Response) => {
      const doctors = await slotService.listDoctors();
      res.json({ doctors });
    }),
  };
}
