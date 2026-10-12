/**
 * Parser for the daily RFQ index ("in") files, e.g.
 * `https://dibbs2.bsm.dla.mil/Downloads/RFQ/Archive/in261008.txt`.
 * Fixed-width layout documented at https://www.dibbs.bsm.dla.mil/Rfq/RfqFileDefs.aspx.
 * Files are keyed by DIBBS *post* date, which does not match the grid's issue date
 * (most rows issued on day D are in the file for D-1), so they are only used to
 * enrich grid rows, joined on solicitation + purchase request.
 */

export interface IndexRow {
  solicitationNumber: string;
  nsnOrPartNumber: string;
  purchaseRequest: string;
  /** "MM/DD/YY". */
  returnBy: string;
  fileName: string;
  quantity: string;
  unitOfIssue: string;
  /** Truncated to 21 characters by the file format. */
  nomenclature: string;
  buyerCode: string;
  /** Acquisition Method Suffix Code. */
  amsc: string;
  /** "1" = NSN, "2" = part number. */
  itemType: string;
  /** Y, H, R, L, A, E or N, see `SET_ASIDE_LABELS`. */
  setAside: string;
  setAsidePercent: string;
}

const LAYOUT: [keyof IndexRow, number][] = [
  ["solicitationNumber", 13],
  ["nsnOrPartNumber", 46],
  ["purchaseRequest", 13],
  ["returnBy", 8],
  ["fileName", 19],
  ["quantity", 7],
  ["unitOfIssue", 2],
  ["nomenclature", 21],
  ["buyerCode", 5],
  ["amsc", 1],
  ["itemType", 1],
  ["setAside", 1],
  ["setAsidePercent", 3],
];

/** Parses an index file; lines shorter than the solicitation number are skipped. */
export function parseIndexFile(text: string): IndexRow[] {
  const rows: IndexRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length < 13) continue;
    const row = {} as IndexRow;
    let offset = 0;
    for (const [key, width] of LAYOUT) {
      row[key] = line.slice(offset, offset + width).trim();
      offset += width;
    }
    rows.push(row);
  }
  return rows;
}

/** Page listing the downloadable daily files (about 20 recent post dates). */
export const RECENT_FILES_URL =
  "https://www.dibbs.bsm.dla.mil/RFQ/RFQDates.aspx?category=recent";

export interface IndexFileLink {
  /** "YYYY-MM-DD". */
  postDate: string;
  url: string;
}

/** Index file links on the recent files page, newest first as DIBBS lists them. */
export function parseRecentFiles(html: string): IndexFileLink[] {
  const links: IndexFileLink[] = [];
  for (const m of html.matchAll(
    /href=['"]([^'"]*\/in(\d{2})(\d{2})(\d{2})\.txt)['"]/gi,
  )) {
    links.push({ postDate: `20${m[2]}-${m[3]}-${m[4]}`, url: m[1] });
  }
  return links;
}
