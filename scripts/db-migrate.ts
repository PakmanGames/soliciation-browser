/** Applies `src/server/db/schema.sql`. Safe to run repeatedly: every statement is idempotent. */
import { sql } from "@/server/db/client";

async function main() {
  await sql.file("src/server/db/schema.sql");
  console.log("Schema applied.");
}

// On failure the rejection exits the process instead of awaiting `sql.end()`,
// which never settles after a failed connection.
main().then(() => sql.end());
