/**
 * Apply migrations + sync settings to the configured database.
 *   - With DATABASE_URL unset: targets the embedded PGlite engine.
 *   - With DATABASE_URL set: targets that Postgres/Supabase database.
 */
import { getDb, syncSettings } from "../lib/db";

async function main() {
  console.log("Running migrations…");
  const db = await getDb();
  await syncSettings(db);
  console.log(`✓ Database ready (backend: ${db.kind}).`);
  await db.close();
}

main().catch((err) => {
  console.error("✗ db:setup failed:", err);
  process.exit(1);
});
