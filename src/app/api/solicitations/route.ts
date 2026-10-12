import type { NextRequest } from "next/server";

import { parseQuery } from "@/lib/query";
import { isDatabaseUnavailable } from "@/server/db/client";
import { querySolicitations } from "@/server/db/solicitations";

export async function GET(request: NextRequest) {
  const query = parseQuery(request.nextUrl.searchParams);
  try {
    return Response.json(await querySolicitations(query));
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
