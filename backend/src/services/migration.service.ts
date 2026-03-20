import type pg from "pg";
import { SCHEMA_DDL, SEED_DOCTORS_SQL } from "../db/ddl.js";

export class MigrationService {
  constructor(private readonly pool: pg.Pool) {}

  async runMigrateOnBoot(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(SCHEMA_DDL);
      const { rows } = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM doctors"
      );
      if (Number(rows[0].count) === 0) {
        await client.query(SEED_DOCTORS_SQL);
      }
    } finally {
      client.release();
    }
  }
}
