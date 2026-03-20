import { pool } from "./pool.js";

const SQL = `
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0 AND total_seats <= 200),
  UNIQUE (doctor_id, start_time)
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot_seat_confirmed
  ON bookings (slot_id, seat_number)
  WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_bookings_slot_seat_pending
  ON bookings (slot_id, seat_number)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_bookings_pending_expiry
  ON bookings (created_at)
  WHERE status = 'PENDING';
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    const { rows } = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM doctors"
    );
    if (Number(rows[0].count) === 0) {
      await client.query(
        `INSERT INTO doctors (name) VALUES 
         ('Dr. Sarah Chen'),
         ('Dr. James Wilson'),
         ('Dr. Priya Patel')`
      );
      console.log("Seeded default doctors.");
    }
    console.log("Migrations OK.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
