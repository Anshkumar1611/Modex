import type { Request, Response } from "express";
import type { BookingService } from "../services/bookingService.js";

export function createSlotController(bookingService: BookingService) {
  return {
    listSlots: async (_req: Request, res: Response) => {
      try {
        const slots = await bookingService.listSlots();
        res.json({ slots });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },

    getSlot: async (req: Request, res: Response) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: "INVALID_SLOT_ID" });
          return;
        }
        const detail = await bookingService.getSlotDetail(id);
        if (!detail) {
          res.status(404).json({ error: "SLOT_NOT_FOUND" });
          return;
        }
        res.json(detail);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  };
}
