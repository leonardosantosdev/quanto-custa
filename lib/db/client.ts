import postgres, { type Sql } from "postgres";

let client: Sql | null = null;

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL não está configurada.");
    this.name = "DatabaseConfigurationError";
  }
}

export function hasDatabaseConfiguration(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabase(): Sql {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new DatabaseConfigurationError();
  }

  if (!client) {
    client = postgres(connectionString, {
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return client;
}

export async function closeDatabase(): Promise<void> {
  if (!client) return;
  await client.end({ timeout: 5 });
  client = null;
}
