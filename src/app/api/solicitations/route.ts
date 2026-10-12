import type { NextRequest } from "next/server";

import { parseQuery } from "@/lib/query";
import { queryFixture } from "@/server/stub/fixture-query";

// WS2 swaps the fixture stub for the Postgres query behind this same route.
export async function GET(request: NextRequest) {
  const query = parseQuery(request.nextUrl.searchParams);
  return Response.json(await queryFixture(query));
}
