import express from "express";
import cors from "cors";
import { config } from "./config.js";
import type { AppServices } from "./services/index.js";
import { buildRoutes } from "./routes/index.js";

export function createApp(services: AppServices): express.Application {
  const app = express();

  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/", buildRoutes(services));

  return app;
}
