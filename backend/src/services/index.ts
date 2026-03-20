import type pg from "pg";
import { MigrationService } from "./migration.service.js";
import { SlotService } from "./slot.service.js";
import { BookingService } from "./booking.service.js";

export type AppServices = {
  migration: MigrationService;
  slots: SlotService;
  bookings: BookingService;
};

export function createServices(pool: pg.Pool): AppServices {
  return {
    migration: new MigrationService(pool),
    slots: new SlotService(pool),
    bookings: new BookingService(pool),
  };
}

export { MigrationService } from "./migration.service.js";
export { SlotService } from "./slot.service.js";
export { BookingService } from "./booking.service.js";
