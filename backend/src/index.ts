import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createServices } from "./services/index.js";
import { createApp } from "./app.js";

function isConnectionRefused(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code?: string }).code
      : undefined;
  return (
    code === "ECONNREFUSED" ||
    (err instanceof Error && err.message?.includes("ECONNREFUSED"))
  );
}

async function main() {
  const services = createServices(pool);

  try {
    await services.migration.runMigrateOnBoot();
  } catch (err) {
    if (isConnectionRefused(err)) {
      console.error("\n❌ Cannot connect to PostgreSQL.");
      console.error("   Check DATABASE_URL in backend/.env (e.g. Neon URI).\n");
    }
    throw err;
  }

  const app = createApp(services);

  const EXPIRE_MS = 30_000;
  setInterval(() => {
    services.bookings
      .expirePendingBookings()
      .catch((e) => console.error("expire job", e));
  }, EXPIRE_MS);

  await services.bookings.expirePendingBookings();

  app.listen(config.port, () => {
    console.log(`API http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
