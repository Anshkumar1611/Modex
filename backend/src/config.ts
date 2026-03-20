import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/modex_booking",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
};
