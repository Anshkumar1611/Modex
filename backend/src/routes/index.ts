import { Router } from "express";
import type { AppServices } from "../services/index.js";
import { createSlotController } from "../controllers/slot.controller.js";
import { createBookingController } from "../controllers/booking.controller.js";
import { createAdminController } from "../controllers/admin.controller.js";

export function buildRoutes(services: AppServices): Router {
  const router = Router();
  const slots = createSlotController(services.slots);
  const bookings = createBookingController(services.bookings);
  const admin = createAdminController(services.slots);

  router.get("/slots", slots.listSlots);
  router.get("/slots/:id", slots.getSlot);
  router.post("/book-seat", bookings.bookSeat);
  router.post("/admin/create-slot", admin.createSlot);
  router.get("/admin/doctors", admin.listDoctors);

  return router;
}
