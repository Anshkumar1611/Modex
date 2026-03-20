/** How long a PENDING hold stays valid (must match SQL INTERVAL in queries). */
export const PENDING_HOLD_MINUTES = 2;

export const PENDING_TTL_MS = PENDING_HOLD_MINUTES * 60 * 1000;

/** Use in SQL: `INTERVAL '2 minutes'` — keep in sync with PENDING_HOLD_MINUTES */
export const PENDING_SQL_INTERVAL = `'${PENDING_HOLD_MINUTES} minutes'`;
