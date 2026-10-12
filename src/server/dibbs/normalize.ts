/**
 * Turns raw DIBBS rows into the shared `Solicitation` contract.
 * Pure functions only, so every rule here is unit-tested against saved fixtures.
 */
import type { Solicitation } from "../../lib/solicitation";
import type { GridRow } from "./grid";
import type { IndexRow } from "./index-file";

/** DIBBS set-aside codes, as used by the index and batch quote files. `setAside` stores the code. */
export const SET_ASIDE_LABELS: Record<string, string> = {
  N: "Unrestricted/Not Set-Aside",
  Y: "Small Business Set-Aside",
  H: "HUBZone Set-Aside",
  R: "Service Disabled Veteran-Owned Small Business (SDVOSB) Set-Aside",
  L: "Woman Owned Small Business (WOSB) Set-Aside",
  A: "8(a) Set-Aside",
  E: "Economically Disadvantaged Woman Owned Small Business (EDWOSB) Set-Aside",
};

// The grid only shows set-aside as an icon. Order matters: the EDWOSB alt text also
// contains "Women Owned", and every specific alt text ends in "Set-Aside".
const SET_ASIDE_ICON_PATTERNS: [RegExp, string][] = [
  [/unrestricted/i, "N"],
  [/hub\s*zone/i, "H"],
  [/service disabled|sdvosb/i, "R"],
  [/economically disadvantaged/i, "E"],
  [/wom[ae]n owned/i, "L"],
  [/\b8\s*\(?a\)?/i, "A"],
  [/small business set.?aside/i, "Y"],
];

export const DIBBS_ORIGIN = "https://www.dibbs.bsm.dla.mil";

/**
 * Package View for a solicitation. It has a single query parameter on purpose: when a
 * fresh browser hits the consent banner, DIBBS's `goto` redirect keeps only the first
 * query parameter of the original URL.
 */
export function dibbsPackageUrl(solicitationNumber: string): string {
  return `${DIBBS_ORIGIN}/rfq/rfqrec.aspx?sn=${solicitationNumber}`;
}

/** "SPE1C1-27-Q-0045" -> "SPE1C127Q0045". */
export function normalizeSolicitationNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** "8455-00-817-0305" -> "8455008170305"; anything that is not a 13-digit NSN -> null. */
export function normalizeNsn(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{13}$/.test(digits) ? digits : null;
}

/** "10-09-2026" or "10/09/2026" -> "2026-10-09"; two-digit years are 20YY. Invalid -> null. */
export function normalizeDate(raw: string): string | null {
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export function normalizeQuantity(raw: string): number | null {
  const digits = raw.replace(/,/g, "").trim();
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/** Maps a grid icon alt text to a set-aside code, or null if the icon is not a set-aside icon. */
export function setAsideFromIcon(alt: string): string | null {
  return (
    SET_ASIDE_ICON_PATTERNS.find(([pattern]) => pattern.test(alt))?.[1] ?? null
  );
}

/**
 * Stable record id: `solicitation:purchaseRequest:item`.
 * Neither shorter key is unique. One solicitation can list the same NSN on several
 * lines (one per purchase request), and one purchase request can carry companion test
 * lines such as "0001S00000052" (Government First Article) next to the real item.
 */
export function solicitationId(
  solicitationNumber: string,
  purchaseRequest: string | null,
  item: string | null,
): string {
  return `${solicitationNumber}:${purchaseRequest ?? ""}:${item ?? ""}`;
}

/**
 * Builds a `Solicitation` from a grid row, optionally enriched with the matching index
 * file row. Returns null when the row lacks a solicitation number or a valid issue date.
 */
export function toSolicitation(
  row: GridRow,
  index: IndexRow | undefined,
  fetchedAt: string,
): Solicitation | null {
  const solicitationNumber = normalizeSolicitationNumber(row.solicitation);
  const issueDate = normalizeDate(row.issued);
  if (!solicitationNumber || !issueDate) return null;

  const nsn = normalizeNsn(row.nsnOrPartNumber);
  const partNumber = nsn ? null : row.nsnOrPartNumber || null;
  const purchaseRequestNumber = row.purchaseRequest || null;
  const setAsideIcon = row.icons.find((alt) => setAsideFromIcon(alt));

  const extra: Record<string, string> = {};
  const put = (key: string, value: string | null | undefined | false) => {
    if (value) extra[key] = value;
  };
  put("status", row.status);
  put("setAsideLabel", setAsideIcon);
  put("itemLabel", row.nsnLabel);
  put("technicalDocumentsUrl", row.technicalDocumentsUrl);
  put("specStandardOnly", row.specStandardOnly && "true");
  put(
    "fastAwardCandidate",
    row.icons.some((alt) => /fast award/i.test(alt)) && "true",
  );
  put("aidc", row.icons.some((alt) => /\bAIDC\b/.test(alt)) && "true");
  put("buyerCode", index?.buyerCode);
  put("amsc", index?.amsc);
  put("setAsidePercent", index?.setAsidePercent);

  return {
    id: solicitationId(
      solicitationNumber,
      purchaseRequestNumber,
      nsn ?? partNumber,
    ),
    solicitationNumber,
    nsn,
    partNumber,
    fsc: nsn ? nsn.slice(0, 4) : null,
    nomenclature: row.nomenclature || null,
    quantity: normalizeQuantity(row.quantity),
    unitOfIssue: index?.unitOfIssue || null,
    purchaseRequestNumber,
    issueDate,
    returnByDate: normalizeDate(row.returnBy),
    setAside:
      (setAsideIcon && setAsideFromIcon(setAsideIcon)) ||
      index?.setAside ||
      null,
    hasTechnicalDocuments:
      row.technicalDocuments === "blank"
        ? null
        : row.technicalDocuments === "link",
    dibbsUrl: dibbsPackageUrl(solicitationNumber),
    pdfUrl: row.pdfUrl,
    extra,
    fetchedAt,
  };
}
