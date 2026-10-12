/**
 * Parser for the "RFQs by Issue Date" search results grid
 * (`/RFQ/RfqRecs.aspx?category=issue&TypeSrch=dt&Value=MM-DD-YYYY`).
 * Pure: HTML in, raw rows out. Normalization into `Solicitation` lives in `normalize.ts`.
 */
import * as cheerio from "cheerio";

/** One grid row with values exactly as DIBBS renders them (trimmed, not normalized). */
export interface GridRow {
  /** NSN ("8455-00-817-0305") or part number / DIBBS item code ("0001S00000062"). */
  nsnOrPartNumber: string;
  nomenclature: string;
  /** Red label under the NSN, e.g. "Mil-Spec". */
  nsnLabel: string | null;
  /** "link" when DIBBS links technical documents, "none" when it says None, "blank" when the cell is empty. */
  technicalDocuments: "link" | "none" | "blank";
  technicalDocumentsUrl: string | null;
  /** DIBBS marks some tech docs as "*Spec/Stnd Only" (specs and standards, no drawings). */
  specStandardOnly: boolean;
  /** Displayed with dashes, e.g. "SPE1C1-27-Q-0045". */
  solicitation: string;
  pdfUrl: string | null;
  packageViewUrl: string | null;
  /** Icon alt texts in the solicitation cell, e.g. "Small Business Set-Aside", "Fast Award Candidate...". */
  icons: string[];
  /** "Open", "Removed", ... */
  status: string;
  purchaseRequest: string;
  quantity: string;
  /** "MM-DD-YYYY". */
  issued: string;
  /** "MM-DD-YYYY". */
  returnBy: string;
}

export interface GridPage {
  /** Total rows DIBBS reports for the whole query ("Records Found: N"). */
  recordsFound: number;
  /** 1-based page number shown as current in the pager (1 when there is no pager). */
  currentPage: number;
  /** `__EVENTARGUMENT` that loads the next page, e.g. "Page$2", or null on the last page. */
  nextPageArgument: string | null;
  /** Page numbers this page's pager can post back to (a 10-page window plus the "..." jumps). */
  pageLinks: number[];
  rows: GridRow[];
}

/** Grid postback target; paging posts `__EVENTTARGET` = this and `__EVENTARGUMENT` = "Page$N". */
export const GRID_EVENT_TARGET = "ctl00$cph1$grdRfqSearch";

const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

/**
 * Parses one results page. Throws on anything that is not a results page (DIBBS answers a
 * bad query with HTTP 200 and an "Errors were found in your request" page), so an error
 * can never pass for an empty day. An empty day reads "Record Found: 0".
 */
export function parseRfqGrid(html: string): GridPage {
  const $ = cheerio.load(html);
  const recordsMatch = /Records? Found:\s*([\d,]+)/.exec($("body").text());
  if (!recordsMatch) {
    const reason =
      clean($("#ctl00_cph1_lblErrNarr").text()).replace(/^·\s*/, "") ||
      clean($("title").text());
    throw new Error(`Not an RFQ results page (${reason})`);
  }
  const recordsFound = Number(recordsMatch[1].replace(/,/g, ""));

  // The pager renders the current page as a bare <span> and every other page as a
  // __doPostBack link. Pages past the visible window hide behind a "..." link that
  // still carries the exact next page argument, so look it up by number, not by label.
  const pager = $("#ctl00_cph1_grdRfqSearch tr.pagination").first();
  const currentText = pager.find("td > span").first().text().trim();
  const currentPage = currentText ? Number(currentText) : 1;
  const pageLinks = pager
    .find("a")
    .toArray()
    .map((a) => /'Page\$(\d+)'/.exec($(a).attr("href") ?? "")?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);

  const rows: GridRow[] = [];
  $(
    "#ctl00_cph1_grdRfqSearch tr.BgWhite, #ctl00_cph1_grdRfqSearch tr.BgSilver",
  ).each((_, tr) => {
    const cell = (name: string) => $(tr).find(`[id$="_lbl${name}"]`).first();
    const nsnCell = cell("Nsn");
    const techCell = cell("TechnicalDocuments");
    const solCell = cell("Solicitation");
    const prLines = cell("Pr")
      .html()!
      .split(/<br\s*\/?>/i)
      .map((part) => clean(cheerio.load(part).text()));
    const techLink = techCell.find("a").first().attr("href") ?? null;
    const techText = clean(techCell.text());

    rows.push({
      nsnOrPartNumber: clean(nsnCell.contents().first().text()),
      nomenclature: clean(cell("Nomenclature").text()),
      nsnLabel: clean(nsnCell.find("span").first().text()) || null,
      technicalDocuments: techLink
        ? "link"
        : techText === ""
          ? "blank"
          : "none",
      technicalDocumentsUrl: techLink,
      specStandardOnly: techText.includes("Spec/Stnd Only"),
      solicitation: clean(solCell.find("a").first().text()),
      pdfUrl: solCell.find('a[title="RFQ document"]').attr("href") ?? null,
      packageViewUrl:
        solCell.find('a[title="Package View"]').attr("href") ?? null,
      icons: solCell
        .find("img")
        .toArray()
        .map((img) => clean($(img).attr("alt") ?? ""))
        .filter(Boolean),
      status: clean(cell("Status").find("span").first().text()),
      purchaseRequest: prLines[0] ?? "",
      quantity: (prLines[1] ?? "").replace(/^QTY:\s*/i, ""),
      issued: clean(cell("Issued").text()),
      returnBy: clean(cell("ReturnBy").text()),
    });
  });

  const nextPageArgument = pageLinks.includes(currentPage + 1)
    ? `Page$${currentPage + 1}`
    : null;
  return { recordsFound, currentPage, nextPageArgument, pageLinks, rows };
}
