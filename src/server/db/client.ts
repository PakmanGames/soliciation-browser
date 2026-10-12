import postgres from "postgres";

/** Matches `.env.example` and docker-compose.yml, so a fresh clone works without a `.env`. */
const DEFAULT_DATABASE_URL =
  "postgres://postgres:postgres@localhost:5433/solicitations";

function createClient() {
  return postgres(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, {
    // Fail fast so the API can answer 503 instead of hanging the UI for postgres.js's default 30s.
    connect_timeout: 5,
    // `current_date` drives the due-date filters, so it must be the server's local day, not UTC.
    connection: { TimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    onnotice: () => {},
  });
}

// Next.js dev re-evaluates modules on every reload; caching on globalThis keeps one pool
// instead of leaking a new set of connections per edit.
const globalForDb = globalThis as typeof globalThis & { sql?: postgres.Sql };

export const sql = globalForDb.sql ?? createClient();
globalForDb.sql = sql;

/** Network errors plus Postgres codes for "server starting", "no such database", and "not migrated". */
const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "57P03",
  "3D000",
  "42P01",
]);

/** True when an error means the database is down or not set up, as opposed to a bug in a query. */
export function isDatabaseUnavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    UNAVAILABLE_CODES.has(String(error.code))
  );
}
