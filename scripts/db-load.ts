/**
 * Upserts the committed sample fixture plus every `data/raw/*.json` written by `pnpm ingest`.
 * Raw files are either a `Solicitation[]` or an object with a `solicitations` array.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Solicitation } from "@/lib/solicitation";
import { sql } from "@/server/db/client";
import { upsertSolicitations } from "@/server/db/solicitations";

const FIXTURE = "data/fixtures/solicitations.sample.json";
const RAW_DIR = "data/raw";

async function main() {
  const rawFiles = existsSync(RAW_DIR)
    ? readdirSync(RAW_DIR)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((name) => path.join(RAW_DIR, name))
    : [];

  let written = 0;
  for (const file of [FIXTURE, ...rawFiles]) {
    const data: Solicitation[] | { solicitations: Solicitation[] } = JSON.parse(
      readFileSync(file, "utf8"),
    );
    const count = await upsertSolicitations(
      Array.isArray(data) ? data : data.solicitations,
    );
    written += count;
    console.log(`${file}: ${count} rows`);
  }

  const [{ total }] = await sql<{ total: number }[]>`
    select count(*)::int as total from solicitations
  `;
  console.log(
    `Upserted ${written} rows from ${1 + rawFiles.length} files; ${total} in the database.`,
  );
}

// On failure the rejection exits the process instead of awaiting `sql.end()`,
// which never settles after a failed connection.
main().then(() => sql.end());
