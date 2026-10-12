import type postgres from "postgres";

import type {
  FacetField,
  SolicitationPage,
  SolicitationQuery,
} from "@/lib/query";
import { DEFAULT_QUERY } from "@/lib/query";
import type { Solicitation } from "@/lib/solicitation";
import { sql } from "@/server/db/client";

const UPSERT_BATCH_SIZE = 1000;

/**
 * Inserts or updates rows by `id`, so re-ingesting a day is idempotent and never deletes data.
 * Returns the number of rows written.
 */
export async function upsertSolicitations(
  rows: Solicitation[],
): Promise<number> {
  // Postgres rejects an upsert that touches the same row twice in one statement, so dedupe first (last wins).
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  let written = 0;
  for (let start = 0; start < unique.length; start += UPSERT_BATCH_SIZE) {
    const batch = unique.slice(start, start + UPSERT_BATCH_SIZE).map(toRecord);
    const result = await sql`
      insert into solicitations ${sql(batch)}
      on conflict (id) do update set
        solicitation_number = excluded.solicitation_number,
        nsn = excluded.nsn,
        part_number = excluded.part_number,
        fsc = excluded.fsc,
        nomenclature = excluded.nomenclature,
        quantity = excluded.quantity,
        unit_of_issue = excluded.unit_of_issue,
        purchase_request_number = excluded.purchase_request_number,
        issue_date = excluded.issue_date,
        return_by_date = excluded.return_by_date,
        set_aside = excluded.set_aside,
        has_technical_documents = excluded.has_technical_documents,
        dibbs_url = excluded.dibbs_url,
        pdf_url = excluded.pdf_url,
        extra = excluded.extra,
        fetched_at = excluded.fetched_at
    `;
    written += result.count;
  }
  return written;
}

function toRecord(row: Solicitation) {
  return {
    id: row.id,
    solicitation_number: row.solicitationNumber,
    nsn: row.nsn,
    part_number: row.partNumber,
    fsc: row.fsc,
    nomenclature: row.nomenclature,
    quantity: row.quantity,
    unit_of_issue: row.unitOfIssue,
    purchase_request_number: row.purchaseRequestNumber,
    issue_date: row.issueDate,
    return_by_date: row.returnByDate,
    set_aside: row.setAside,
    has_technical_documents: row.hasTechnicalDocuments,
    dibbs_url: row.dibbsUrl,
    pdf_url: row.pdfUrl,
    extra: sql.json(row.extra),
    fetched_at: row.fetchedAt,
  };
}

const SORT_COLUMNS = {
  dueDate: "return_by_date",
  issueDate: "issue_date",
  quantity: "quantity",
  solicitationNumber: "solicitation_number",
  nomenclature: "nomenclature",
} as const satisfies Record<NonNullable<SolicitationQuery["sort"]>, string>;

const FACET_COLUMNS = {
  fsc: "fsc",
  setAside: "set_aside",
  office: "office",
} as const satisfies Record<FacetField, string>;

/**
 * Runs one search: the requested page, the total, facet counts, and freshness, all in parallel.
 * Semantics match the field docs on `SolicitationQuery`.
 */
export async function querySolicitations(
  query: SolicitationQuery,
): Promise<SolicitationPage> {
  const sort = SORT_COLUMNS[query.sort ?? DEFAULT_QUERY.sort];
  const dir = query.dir === "desc" ? sql`desc` : sql`asc`;
  const page = query.page ?? DEFAULT_QUERY.page;
  const pageSize = query.pageSize ?? DEFAULT_QUERY.pageSize;
  const filters = where(conditions(query));

  const [items, [{ total }], fsc, setAside, office, [{ lastSyncedAt }]] =
    await Promise.all([
      // Dates are cast to text in SQL: postgres.js would turn `date` into a JS Date at local
      // midnight, which shifts the day once serialized as UTC. The `id` tiebreak keeps pages stable.
      sql<Solicitation[]>`
      select
        id,
        solicitation_number as "solicitationNumber",
        nsn,
        part_number as "partNumber",
        fsc,
        nomenclature,
        quantity,
        unit_of_issue as "unitOfIssue",
        purchase_request_number as "purchaseRequestNumber",
        issue_date::text as "issueDate",
        return_by_date::text as "returnByDate",
        set_aside as "setAside",
        has_technical_documents as "hasTechnicalDocuments",
        dibbs_url as "dibbsUrl",
        pdf_url as "pdfUrl",
        extra,
        ${isoTimestamp(sql`fetched_at`)} as "fetchedAt"
      from solicitations
      ${filters}
      order by ${sql(sort)} ${dir} nulls last, id
      limit ${pageSize} offset ${(page - 1) * pageSize}
    `,
      sql<
        { total: number }[]
      >`select count(*)::int as total from solicitations ${filters}`,
      facet(query, "fsc"),
      facet(query, "setAside"),
      facet(query, "office"),
      sql<{ lastSyncedAt: string | null }[]>`
      select ${isoTimestamp(sql`max(fetched_at)`)} as "lastSyncedAt" from solicitations
    `,
    ]);

  return { items, total, facets: { fsc, setAside, office }, lastSyncedAt };
}

/** Digits and dashes with at least one digit, e.g. a whole or partial dashed NSN. */
const NSN_LIKE = /^[\d-]*\d[\d-]*$/;

/** Counts per value under every active filter except the field's own, so siblings stay visible. */
function facet(query: SolicitationQuery, field: FacetField) {
  const column = sql(FACET_COLUMNS[field]);
  return sql<{ value: string; count: number }[]>`
    select ${column} as value, count(*)::int as count
    from solicitations
    ${where([...conditions(query, field), sql`${column} is not null`])}
    group by ${column}
    order by count desc, value
  `;
}

/** One SQL condition per active filter, all parameterized. `skip` omits one facet's own filter. */
function conditions(
  query: SolicitationQuery,
  skip?: FacetField,
): postgres.Fragment[] {
  const result: postgres.Fragment[] = [];

  const terms = (query.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  for (const term of terms) {
    // NSNs are stored as 13 bare digits but vendors paste them dashed ("5305-01-234").
    // The raw form still matches too, for dashed part numbers made only of digits.
    result.push(
      NSN_LIKE.test(term) && term.includes("-")
        ? sql`(haystack like ${likePattern(term)} or haystack like ${likePattern(term.replaceAll("-", ""))})`
        : sql`haystack like ${likePattern(term)}`,
    );
  }

  if (query.issuedFrom)
    result.push(sql`issue_date >= ${query.issuedFrom}::date`);
  if (query.issuedTo) result.push(sql`issue_date <= ${query.issuedTo}::date`);
  if (query.dueWithinDays !== undefined) {
    result.push(
      sql`return_by_date between current_date and current_date + ${query.dueWithinDays}::int`,
    );
  }
  if (!query.includeExpired) {
    result.push(
      sql`(return_by_date is null or return_by_date >= current_date)`,
    );
  }
  if (query.qtyMin !== undefined) result.push(sql`quantity >= ${query.qtyMin}`);
  if (query.qtyMax !== undefined) result.push(sql`quantity <= ${query.qtyMax}`);
  if (query.hasTechDocs !== undefined) {
    result.push(sql`has_technical_documents = ${query.hasTechDocs}`);
  }

  for (const field of Object.keys(FACET_COLUMNS) as FacetField[]) {
    const values = query[field];
    if (field !== skip && values?.length) {
      result.push(sql`${sql(FACET_COLUMNS[field])} in ${sql(values)}`);
    }
  }

  return result;
}

function where(fragments: postgres.Fragment[]): postgres.Fragment {
  if (fragments.length === 0) return sql``;
  return sql`where ${fragments.reduce((all, next) => sql`${all} and ${next}`)}`;
}

/** Substring pattern for `like`, with the user's own wildcards escaped. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Same format as `Date.prototype.toISOString`, so rows round-trip the contract exactly. */
function isoTimestamp(value: postgres.Fragment): postgres.Fragment {
  return sql`to_char(${value} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}
