/**
 * Temporary in-memory implementation of the query contract over the sample fixture.
 * It lets the UI workstreams build against real API behavior before the Postgres
 * implementation (WS2) replaces it behind the same route. Deliberately naive: it
 * re-reads and scans the whole file on every request.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  FacetField,
  SolicitationPage,
  SolicitationQuery,
} from "@/lib/query";
import { DEFAULT_QUERY } from "@/lib/query";
import type { Solicitation } from "@/lib/solicitation";

const FIXTURE_PATH = path.join(
  process.cwd(),
  "data/fixtures/solicitations.sample.json",
);

const SORT_KEYS = {
  dueDate: (row) => row.returnByDate,
  issueDate: (row) => row.issueDate,
  quantity: (row) => row.quantity,
  solicitationNumber: (row) => row.solicitationNumber,
  nomenclature: (row) => row.nomenclature,
} satisfies Record<
  NonNullable<SolicitationQuery["sort"]>,
  (row: Solicitation) => string | number | null
>;

const FACET_KEYS = {
  fsc: (row) => row.fsc,
  setAside: (row) => row.setAside,
  office: (row) => buyingOffice(row),
} satisfies Record<FacetField, (row: Solicitation) => string | null>;

export async function queryFixture(
  query: SolicitationQuery,
): Promise<SolicitationPage> {
  const rows = JSON.parse(
    await readFile(FIXTURE_PATH, "utf8"),
  ) as Solicitation[];
  const today = localDate(0);

  const matching = rows.filter((row) => matches(row, query, today));
  const sorted = sortRows(matching, query);
  const page = query.page ?? DEFAULT_QUERY.page;
  const pageSize = query.pageSize ?? DEFAULT_QUERY.pageSize;

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: matching.length,
    facets: {
      fsc: countFacet(rows, query, today, "fsc"),
      setAside: countFacet(rows, query, today, "setAside"),
      office: countFacet(rows, query, today, "office"),
    },
    lastSyncedAt: rows.reduce<string | null>(
      (newest, row) =>
        newest === null || row.fetchedAt > newest ? row.fetchedAt : newest,
      null,
    ),
  };
}

/** The buying activity code (DoDAAC) that prefixes every DLA solicitation number. */
function buyingOffice(row: Solicitation): string {
  return row.solicitationNumber.slice(0, 6);
}

/**
 * Applies every filter in the query. `skip` leaves out one facet field's own filter,
 * which is how facet counts keep showing sibling options of a selected value.
 */
function matches(
  row: Solicitation,
  query: SolicitationQuery,
  today: string,
  skip?: FacetField,
) {
  if (query.q && !matchesText(row, query.q)) return false;
  if (query.issuedFrom && row.issueDate < query.issuedFrom) return false;
  if (query.issuedTo && row.issueDate > query.issuedTo) return false;
  if (query.dueWithinDays !== undefined) {
    const due = row.returnByDate;
    if (due === null || due < today || due > localDate(query.dueWithinDays))
      return false;
  }
  if (
    !query.includeExpired &&
    row.returnByDate !== null &&
    row.returnByDate < today
  )
    return false;
  for (const field of ["fsc", "setAside", "office"] as const) {
    const selected = query[field];
    if (field === skip || !selected) continue;
    const value = FACET_KEYS[field](row);
    if (value === null || !selected.includes(value)) return false;
  }
  if (
    query.qtyMin !== undefined &&
    (row.quantity === null || row.quantity < query.qtyMin)
  ) {
    return false;
  }
  if (
    query.qtyMax !== undefined &&
    (row.quantity === null || row.quantity > query.qtyMax)
  ) {
    return false;
  }
  if (
    query.hasTechDocs !== undefined &&
    row.hasTechnicalDocuments !== query.hasTechDocs
  ) {
    return false;
  }
  return true;
}

function matchesText(row: Solicitation, q: string): boolean {
  const needle = q.toLowerCase();
  const digits = needle.replace(/-/g, "");
  return (
    row.solicitationNumber.toLowerCase().includes(digits) ||
    (row.nsn !== null && digits !== "" && row.nsn.includes(digits)) ||
    (row.nomenclature?.toLowerCase().includes(needle) ?? false) ||
    (row.partNumber?.toLowerCase().includes(needle) ?? false)
  );
}

function sortRows(
  rows: Solicitation[],
  query: SolicitationQuery,
): Solicitation[] {
  const key = SORT_KEYS[query.sort ?? DEFAULT_QUERY.sort];
  const sign = (query.dir ?? DEFAULT_QUERY.dir) === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    // Nulls last in both directions, then the id as a tie-breaker so pages are stable.
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1;
    } else if (left !== right) {
      return (left < right ? -1 : 1) * sign;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function countFacet(
  rows: Solicitation[],
  query: SolicitationQuery,
  today: string,
  field: FacetField,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = FACET_KEYS[field](row);
    if (value === null || !matches(row, query, today, field)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Server-local calendar date `offsetDays` from today, as "YYYY-MM-DD". */
function localDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
