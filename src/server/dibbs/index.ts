/**
 * DIBBS RFQ ingestion: fetches every RFQ line issued on a date and normalizes it into
 * the shared `Solicitation` contract. No side effects beyond network requests.
 *
 * Primary source is the "RFQs by Issue Date" grid (exact issue date, set-aside, tech docs,
 * PDF link), paged 50 rows at a time through ASP.NET postbacks. Rows are enriched from the
 * daily index files (unit of issue, buyer code, AMSC), joined on solicitation, purchase
 * request and item. See docs/dibbs-data-source.md for why.
 */
import type { Solicitation } from "../../lib/solicitation";
import { isConsentPage } from "./aspnet";
import {
  GRID_EVENT_TARGET,
  parseRfqGrid,
  type GridPage,
  type GridRow,
} from "./grid";
import {
  parseIndexFile,
  parseRecentFiles,
  RECENT_FILES_URL,
  type IndexRow,
} from "./index-file";
import {
  DIBBS_ORIGIN,
  normalizeNsn,
  normalizeSolicitationNumber,
  toSolicitation,
} from "./normalize";
import { DibbsSession, type Page } from "./session";

export { DibbsSession } from "./session";

export interface IngestResult {
  issueDate: string;
  solicitations: Solicitation[];
  /** Partial failures. One bad page must not lose the whole day. */
  errors: { where: string; message: string }[];
  stats: { requests: number; durationMs: number };
}

export interface FetchOptions {
  /** Share one session across dates so consent is accepted once and daily files are downloaded once. */
  session?: DibbsSession;
}

type IngestError = IngestResult["errors"][number];

/**
 * Most rows issued on day D appear in the index file posted on D-1, a few in D's file,
 * so join against every file posted in the few days up to D.
 */
const INDEX_LOOKBACK_DAYS = 3;

export async function fetchSolicitationsIssuedOn(
  date: string,
  options: FetchOptions = {},
): Promise<IngestResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error(`Expected YYYY-MM-DD, got "${date}"`);
  const started = Date.now();
  const session = options.session ?? new DibbsSession();
  const requestsBefore = session.requests;
  const errors: IngestError[] = [];
  const fetchedAt = new Date().toISOString();

  const [rows, index] = await Promise.all([
    fetchGridRows(session, date, errors),
    loadIndex(session, date).catch((error) => {
      errors.push({
        where: `index files for ${date}`,
        message: messageOf(error),
      });
      return new Map<string, IndexRow>();
    }),
  ]);

  const byId = new Map<string, Solicitation>();
  for (const row of rows) {
    const solicitation = toSolicitation(
      row,
      index.get(gridJoinKey(row)),
      fetchedAt,
    );
    if (!solicitation) {
      errors.push({
        where: `row ${row.solicitation || "?"} ${row.purchaseRequest}`,
        message: "Missing solicitation number or issue date",
      });
      continue;
    }
    byId.set(solicitation.id, solicitation);
  }

  return {
    issueDate: date,
    solicitations: [...byId.values()],
    errors,
    stats: {
      requests: session.requests - requestsBefore,
      durationMs: Date.now() - started,
    },
  };
}

export function gridUrl(date: string): string {
  const [y, m, d] = date.split("-");
  return `${DIBBS_ORIGIN}/RFQ/RfqRecs.aspx?category=issue&TypeSrch=dt&Value=${m}-${d}-${y}`;
}

/**
 * Walks every grid page for the date. Paging is a chain of postbacks (each needs the
 * previous page's view state), so a failed page is skipped by jumping to a later page
 * linked from the last good one, and an expired session restarts from page 1 and hops
 * forward through the pager's "..." links.
 */
async function fetchGridRows(
  session: DibbsSession,
  date: string,
  errors: IngestError[],
): Promise<GridRow[]> {
  const url = gridUrl(date);
  const rows: GridRow[] = [];
  const seen = new Set<number>();
  const failed = new Set<number>();
  const collect = (grid: GridPage) => {
    if (seen.has(grid.currentPage)) return;
    seen.add(grid.currentPage);
    rows.push(...grid.rows);
  };

  let page: Page;
  let grid: GridPage;
  try {
    page = await session.get(url);
    grid = parseRfqGrid(page.body);
  } catch (error) {
    errors.push({ where: `grid ${date} page 1`, message: messageOf(error) });
    return rows;
  }
  collect(grid);
  const pageSize = grid.rows.length;
  const pageCount = pageSize ? Math.ceil(grid.recordsFound / pageSize) : 1;

  let restarts = 0;
  for (
    let target = 2, hops = 0;
    target <= pageCount && hops < pageCount * 3;
    hops++
  ) {
    if (seen.has(target) || failed.has(target)) {
      target++;
      continue;
    }
    const from = grid.currentPage;
    const candidates = grid.pageLinks.filter(
      (n) => n > from && n <= target && !failed.has(n),
    );
    if (candidates.length === 0) {
      errors.push({
        where: `grid ${date} page ${target}`,
        message: `Unreachable from page ${from}; stopped paging`,
      });
      break;
    }
    const hop = Math.max(...candidates);
    try {
      const next = await session.postBack(
        page,
        GRID_EVENT_TARGET,
        `Page$${hop}`,
      );
      if (isConsentPage(next.body)) {
        if (restarts++ > 0)
          throw new Error("Session expired twice while paging");
        page = await session.get(url);
        grid = parseRfqGrid(page.body);
        continue;
      }
      const parsed = parseRfqGrid(next.body);
      if (parsed.currentPage !== hop)
        throw new Error(
          `Asked for page ${hop}, got page ${parsed.currentPage}`,
        );
      page = next;
      grid = parsed;
      collect(grid);
    } catch (error) {
      failed.add(hop);
      errors.push({
        where: `grid ${date} page ${hop}`,
        message: messageOf(error),
      });
      if (hop === target) target++;
    }
  }

  if (rows.length !== grid.recordsFound && errors.length === 0) {
    errors.push({
      where: `grid ${date}`,
      message: `DIBBS reports ${grid.recordsFound} records, parsed ${rows.length}`,
    });
  }
  return rows;
}

/** Index rows from every daily file posted within the lookback window, keyed for the grid join. */
async function loadIndex(
  session: DibbsSession,
  issueDate: string,
): Promise<Map<string, IndexRow>> {
  const earliest = shiftDate(issueDate, -INDEX_LOOKBACK_DAYS);
  const recent = parseRecentFiles(
    (await session.getCached(RECENT_FILES_URL)).body,
  );
  const files = recent.filter(
    (f) => f.postDate >= earliest && f.postDate <= issueDate,
  );
  const index = new Map<string, IndexRow>();
  // Oldest first, so a line re-posted in a later file wins.
  for (const file of files.sort((a, b) =>
    a.postDate.localeCompare(b.postDate),
  )) {
    for (const row of parseIndexFile(
      (await session.getCached(file.url)).body,
    )) {
      index.set(
        joinKey(
          row.solicitationNumber,
          row.purchaseRequest,
          row.nsnOrPartNumber,
        ),
        row,
      );
    }
  }
  return index;
}

function gridJoinKey(row: GridRow): string {
  return joinKey(
    normalizeSolicitationNumber(row.solicitation),
    row.purchaseRequest,
    row.nsnOrPartNumber,
  );
}

function joinKey(
  solicitationNumber: string,
  purchaseRequest: string,
  item: string,
): string {
  return `${solicitationNumber}:${purchaseRequest}:${normalizeNsn(item) ?? item.toUpperCase()}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
