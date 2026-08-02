import { readdir } from "node:fs/promises";
import path from "node:path";

import "./load-env";

import { closeDatabase, getDatabase } from "../lib/db/client";

async function migrate() {
  const sql = getDatabase();
  const migrationsDirectory = path.join(process.cwd(), "db", "migrations");
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  for (const filename of files) {
    const [applied] = await sql<{ filename: string }[]>`
      SELECT filename FROM schema_migrations WHERE filename = ${filename}
    `;

    if (applied) {
      console.log(JSON.stringify({ event: "migration.skipped", filename }));
      continue;
    }

    await sql.begin(async (transaction) => {
      await transaction.file(path.join(migrationsDirectory, filename));
      await transaction`
        INSERT INTO schema_migrations (filename) VALUES (${filename})
      `;
    });

    console.log(JSON.stringify({ event: "migration.applied", filename }));
  }
}

migrate()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(JSON.stringify({ event: "migration.failed", message }));
    process.exitCode = 1;
  })
  .finally(closeDatabase);
