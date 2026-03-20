import fs from "fs";
import dotenv from "dotenv";
import path from "path";

function resolveEnvPath(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, ".env"),
    path.join(cwd, "backend", ".env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

dotenv.config({ path: resolveEnvPath() });

const DEFAULT_DB_URL =
  "postgresql://postgres:postgres@localhost:5432/modex_booking";

/**
 * pg v8 warns that sslmode=require will change meaning in v9.
 * verify-full matches today's behavior and silences the warning (fine for Neon).
 */
function normalizeDatabaseUrl(url: string): string {
  try {
    const normalized = url.replace(/^postgres:\/\//, "postgresql://");
    const u = new URL(normalized);
    const mode = u.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      u.searchParams.set("sslmode", "verify-full");
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: normalizeDatabaseUrl(
    process.env.DATABASE_URL?.trim() || DEFAULT_DB_URL
  ),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
};

/** For logs only — no password */
export function describeDatabaseTarget(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    return "localhost:5432 (DATABASE_URL missing — using default; add Neon URI to backend/.env)";
  }
  try {
    const u = new URL(raw.replace(/^postgres:/, "postgresql:"));
    return `${u.hostname}:${u.port || "5432"}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

export function isUsingDefaultDatabaseUrl(): boolean {
  return !process.env.DATABASE_URL?.trim();
}
