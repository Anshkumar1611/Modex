import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { BookingService } from "./services/bookingService.js";
import { buildRoutes } from "./routes/index.js";

function isConnectionRefused(err: unknown): boolean {
  const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
  return code === "ECONNREFUSED" || (err instanceof Error && err.message?.includes("ECONNREFUSED"));
}

async function main() {
  const bookingService = new BookingService(pool);
  try {
    await bookingService.runMigrateOnBoot();
  } catch (err) {
    if (isConnectionRefused(err)) {
      console.error("\n❌ Cannot connect to PostgreSQL at localhost:5432.");
      console.error("   Start the database first, then run again.\n");
      console.error("   Examples:");
      console.error("     brew services start postgresql@14");
      console.error("     docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=modex_booking -p 5432:5432 -d postgres:16\n");
    }
    throw err;
  }

  const app = express();
  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/", buildRoutes(bookingService));

  setInterval(() => {
    bookingService.expirePendingBookings().catch((e) => console.error("expire job", e));
  }, 30_000);

  await bookingService.expirePendingBookings();

  app.listen(config.port, () => {
    console.log(`API http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
