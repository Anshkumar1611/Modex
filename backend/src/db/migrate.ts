import { pool } from "./pool.js";
import { SCHEMA_DDL, SEED_DOCTORS_SQL } from "./ddl.js";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_DDL);
    const { rows } = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM doctors"
    );
    if (Number(rows[0].count) === 0) {
      await client.query(SEED_DOCTORS_SQL);
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
