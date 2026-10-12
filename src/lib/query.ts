/**
 * Query contract shared by the page URL and `GET /api/solicitations`.
 * Both use the same params, so this file is the single parser and serializer for both.
 * Changes to this contract go through the lead, because every workstream depends on it.
 *
 * URL conventions: arrays are repeated params (`fsc=5305&fsc=5310`), booleans are
 * `true`/`false`, and params equal to their default are omitted so URLs stay short.
 */
import type { Solicitation } from "@/lib/solicitation";

export interface SolicitationQuery {
  /**
   * Free-text search over solicitation number, NSN, part number, and nomenclature,
   * case-insensitive. Split on whitespace; every term must appear as a substring.
   * NSN-like terms (digits and dashes) also match with dashes stripped.
   */
  q?: string;
  /** Inclusive lower bound on `issueDate`, "YYYY-MM-DD". */
  issuedFrom?: string; // YYYY-MM-DD
  /** Inclusive upper bound on `issueDate`, "YYYY-MM-DD". */
  issuedTo?: string;
  /** Only rows with `returnByDate` between today and today + N days, inclusive. Excludes null due dates. */
  dueWithinDays?: number;
  /**
   * When false (default), hides RFQs that can no longer be quoted: `returnByDate` before today, or a DIBBS
   * status (`extra.status`) other than Open, such as Awarded, Cancelled, or Removed. Null due dates are never hidden.
   */
  includeExpired?: boolean; // default false
  /** Federal Supply Class codes, OR-ed together, e.g. ["5305", "5310"]. */
  fsc?: string[];
  /** Raw `setAside` values, OR-ed together. */
  setAside?: string[];
  /** Buying office codes: the first 6 characters of the solicitation number, e.g. "SPE7M1". OR-ed together. */
  office?: string[];
  /** Inclusive lower bound on `quantity`. Rows with null quantity are excluded when set. */
  qtyMin?: number;
  /** Inclusive upper bound on `quantity`. Rows with null quantity are excluded when set. */
  qtyMax?: number;
  /** true: only rows with technical documents, false: only rows without. Unset: no filter. */
  hasTechDocs?: boolean;
  /** Sort column, default "dueDate" (`returnByDate`). Nulls always sort last. */
  sort?:
    | "dueDate"
    | "issueDate"
    | "quantity"
    | "solicitationNumber"
    | "nomenclature";
  /** Sort direction, default "asc". */
  dir?: "asc" | "desc";
  /** 1-based page number, default 1. */
  page?: number;
  /** Rows per page, default 50, max 200. */
  pageSize?: number;
}

/** Fields that come back with facet counts. */
export type FacetField = "fsc" | "setAside" | "office";

// GET /api/solicitations?<SolicitationQuery as URL params>
export interface SolicitationPage {
  /** The requested page of matching rows, already sorted. */
  items: Solicitation[];
  /** Total matching rows across all pages. */
  total: number;
  /**
   * Counts per value, sorted by count descending. A field's counts apply every active
   * filter except that field's own, so selecting one option never hides its siblings.
   */
  facets: Record<
    "fsc" | "setAside" | "office",
    { value: string; count: number }[]
  >;
  /** Newest `fetchedAt` in the data, or null when there is no data yet. */
  lastSyncedAt: string | null;
}

export const PAGE_SIZE_MAX = 200;

/** Values `parseQuery` fills in when a param is missing or invalid. */
export const DEFAULT_QUERY = {
  sort: "dueDate",
  dir: "asc",
  includeExpired: false,
  page: 1,
  pageSize: 50,
} as const satisfies SolicitationQuery;

const SORTS = [
  "dueDate",
  "issueDate",
  "quantity",
  "solicitationNumber",
  "nomenclature",
] as const satisfies readonly NonNullable<SolicitationQuery["sort"]>[];
const DIRS = ["asc", "desc"] as const satisfies readonly NonNullable<
  SolicitationQuery["dir"]
>[];

/**
 * Parses URL params into a query with defaults filled in.
 * Never throws: invalid or unknown values are dropped, so a hand-edited URL still renders.
 */
export function parseQuery(params: URLSearchParams): SolicitationQuery {
  const pageSize = parseInteger(params.get("pageSize"), 1);
  return {
    q: params.get("q")?.trim() || undefined,
    issuedFrom: parseDate(params.get("issuedFrom")),
    issuedTo: parseDate(params.get("issuedTo")),
    dueWithinDays: parseInteger(params.get("dueWithinDays"), 0),
    includeExpired:
      parseBoolean(params.get("includeExpired")) ??
      DEFAULT_QUERY.includeExpired,
    fsc: parseList(params.getAll("fsc")),
    setAside: parseList(params.getAll("setAside")),
    office: parseList(params.getAll("office")),
    qtyMin: parseInteger(params.get("qtyMin"), 0),
    qtyMax: parseInteger(params.get("qtyMax"), 0),
    hasTechDocs: parseBoolean(params.get("hasTechDocs")),
    sort: parseEnum(params.get("sort"), SORTS) ?? DEFAULT_QUERY.sort,
    dir: parseEnum(params.get("dir"), DIRS) ?? DEFAULT_QUERY.dir,
    page: parseInteger(params.get("page"), 1) ?? DEFAULT_QUERY.page,
    pageSize:
      pageSize === undefined
        ? DEFAULT_QUERY.pageSize
        : Math.min(pageSize, PAGE_SIZE_MAX),
  };
}

/**
 * Serializes a query to URL params in a fixed key order.
 * Omits unset values, empty arrays, and values equal to their default, so equal queries
 * always produce the same string (also usable as a cache key).
 */
export function serializeQuery(query: SolicitationQuery): URLSearchParams {
  const params = new URLSearchParams();
  const set = (
    key: keyof SolicitationQuery,
    value: string | number | boolean | undefined,
  ) => {
    const fallback = (DEFAULT_QUERY as SolicitationQuery)[key];
    if (value === undefined || value === "" || value === fallback) return;
    params.set(key, String(value));
  };
  const append = (key: FacetField, values: string[] | undefined) => {
    for (const value of values ?? []) params.append(key, value);
  };

  set("q", query.q?.trim());
  set("issuedFrom", query.issuedFrom);
  set("issuedTo", query.issuedTo);
  set("dueWithinDays", query.dueWithinDays);
  set("includeExpired", query.includeExpired);
  append("fsc", query.fsc);
  append("setAside", query.setAside);
  append("office", query.office);
  set("qtyMin", query.qtyMin);
  set("qtyMax", query.qtyMax);
  set("hasTechDocs", query.hasTechDocs);
  set("sort", query.sort);
  set("dir", query.dir);
  set("page", query.page);
  set("pageSize", query.pageSize);
  return params;
}

function parseInteger(raw: string | null, min: number): number | undefined {
  if (raw === null || !/^\d+$/.test(raw.trim())) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min ? value : undefined;
}

function parseBoolean(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function parseDate(raw: string | null): string | undefined {
  if (raw === null || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  // Round-trip through Date to reject impossible dates such as 2026-02-31.
  const date = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(raw)
    ? raw
    : undefined;
}

function parseList(raw: string[]): string[] | undefined {
  const values = [...new Set(raw.map((value) => value.trim()).filter(Boolean))];
  return values.length > 0 ? values : undefined;
}

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === raw);
}
