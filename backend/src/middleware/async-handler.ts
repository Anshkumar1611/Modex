import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Wraps async route handlers so rejected promises become 500 JSON responses.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      console.error(err);
      if (res.headersSent) {
        next(err);
        return;
      }
      res.status(500).json({ error: "INTERNAL_ERROR" });
    });
  };
}
