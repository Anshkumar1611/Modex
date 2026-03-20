import { Router } from "express";
import type { BookingService } from "../services/bookingService.js";
import { createSlotController } from "../controllers/slotController.js";
import { createBookingController } from "../controllers/bookingController.js";
import { createAdminController } from "../controllers/adminController.js";

export function buildRoutes(bookingService: BookingService): Router {
  const router = Router();
  const slots = createSlotController(bookingService);
  const bookings = createBookingController(bookingService);
  const admin = createAdminController(bookingService);

  router.get("/slots", slots.listSlots);
  router.get("/slots/:id", slots.getSlot);
  router.post("/book-seat", bookings.bookSeat);
  router.post("/admin/create-slot", admin.createSlot);
  router.get("/admin/doctors", admin.listDoctors);

  return router;
}
