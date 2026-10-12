import type { IngestResult } from "@/server/dibbs";
import { fetchSolicitationsIssuedOn } from "@/server/dibbs";
import { isDatabaseUnavailable } from "@/server/db/client";
import { upsertSolicitations } from "@/server/db/solicitations";

interface RefreshResult {
  issueDate: string;
  inserted: number;
  errors: IngestResult["errors"];
}

/**
 * Shared by overlapping requests, so a double click never runs two DIBBS sessions at once.
 * The result is shared, not the `Response`, because a response body can only be read once.
 */
let inFlight: Promise<RefreshResult> | null = null;

/** Ingests RFQs issued today and upserts them. Never deletes data, so a failed refresh is harmless. */
export async function POST() {
  inFlight ??= refresh().finally(() => {
    inFlight = null;
  });
  try {
    return Response.json(await inFlight);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    console.error("Database unavailable:", error);
    return Response.json(
      {
        error:
          "Database unavailable. Run `docker compose up -d && pnpm db:migrate`.",
      },
      { status: 503 },
    );
  }
}

async function refresh(): Promise<RefreshResult> {
  // DIBBS dates RFQs on US Eastern time, so "today" must too, whatever the server's zone.
  const issueDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(new Date());
  const { solicitations, errors } = await fetchSolicitationsIssuedOn(issueDate);
  const inserted = await upsertSolicitations(solicitations);
  return { issueDate, inserted, errors };
}
