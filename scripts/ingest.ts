/**
 * Ingests DIBBS RFQs by issue date into `data/raw/<issueDate>.json` (one `IngestResult` per date).
 *
 *   pnpm ingest --date 2026-10-09   one issue date
 *   pnpm ingest --days 5            the last 5 calendar days including today (US Eastern, DIBBS's clock)
 *
 * Exits non-zero only if every requested date failed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  DibbsSession,
  fetchSolicitationsIssuedOn,
  type IngestResult,
} from "../src/server/dibbs";

const OUT_DIR = "data/raw";

function lastDays(days: number): string[] {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(new Date());
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function datesFromArgs(): string[] {
  const { values } = parseArgs({
    options: {
      date: { type: "string", multiple: true },
      days: { type: "string" },
    },
  });
  if (values.date?.length) return values.date;
  const days = Number(values.days);
  if (Number.isInteger(days) && days > 0) return lastDays(days);
  console.error("Usage: pnpm ingest --date YYYY-MM-DD [--date ...] | --days N");
  process.exit(2);
}

/** A date fails when nothing came back and something went wrong; an empty weekend is not a failure. */
const failed = (result: IngestResult) =>
  result.solicitations.length === 0 && result.errors.length > 0;

async function main() {
  const dates = datesFromArgs();
  const session = new DibbsSession();
  await mkdir(OUT_DIR, { recursive: true });

  let failures = 0;
  // Dates run one after another: each date is a sequential postback chain already, and
  // sharing one session keeps the consent banner and daily index downloads to once per run.
  for (const date of dates) {
    let result: IngestResult;
    try {
      result = await fetchSolicitationsIssuedOn(date, { session });
    } catch (error) {
      failures++;
      console.log(
        `${date}  FAILED  ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    if (failed(result)) failures++;
    await writeFile(
      `${OUT_DIR}/${date}.json`,
      JSON.stringify(result, null, 2) + "\n",
    );
    const enriched = result.solicitations.filter(
      (s) => s.unitOfIssue !== null,
    ).length;
    console.log(
      `${date}  records=${result.solicitations.length}  enriched=${enriched}  errors=${result.errors.length}` +
        `  requests=${result.stats.requests}  duration=${(result.stats.durationMs / 1000).toFixed(1)}s`,
    );
    for (const error of result.errors.slice(0, 5))
      console.log(`  ! ${error.where}: ${error.message}`);
  }
  if (failures === dates.length) process.exit(1);
}

void main();
