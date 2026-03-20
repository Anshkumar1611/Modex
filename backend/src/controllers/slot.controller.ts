import type { Request, Response } from "express";
import type { SlotService } from "../services/slot.service.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createSlotController(slotService: SlotService) {
  return {
    listSlots: asyncHandler(async (_req: Request, res: Response) => {
      const slots = await slotService.listSlots();
      res.json({ slots });
    }),

    getSlot: asyncHandler(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: "INVALID_SLOT_ID" });
        return;
      }
      const detail = await slotService.getSlotDetail(id);
      if (!detail) {
        res.status(404).json({ error: "SLOT_NOT_FOUND" });
        return;
      }
      res.json(detail);
    }),
  };
}
