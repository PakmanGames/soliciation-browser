/**
 * Short labels for DIBBS set-aside values.
 *
 * WS1 stores the one-letter code from the DIBBS RFQ index file
 * (https://www.dibbs.bsm.dla.mil/Rfq/RfqFileDefs.aspx). In the index files for
 * 2026-10-05 to 2026-10-11, N was 80%, Y 15%, and L, R, H, E made up the rest.
 */
export const SET_ASIDE_CODES: Record<string, string> = {
  N: "Unrestricted",
  Y: "Small Business",
  H: "HUBZone",
  R: "SDVOSB",
  L: "WOSB",
  E: "EDWOSB",
  A: "8(a)",
};

/**
 * Fallback for free-text values such as the grid's icon alt text
 * ("HUBZone Set-Aside"). Order matters: the EDWOSB text also contains
 * "Woman Owned", and the generic small business pattern must come last.
 */
export const SET_ASIDE_PATTERNS: [RegExp, string][] = [
  [/unrestricted|not set.?aside|full and open/i, "Unrestricted"],
  [/hub\s*zone/i, "HUBZone"],
  [/service.?disabled|sdvosb/i, "SDVOSB"],
  [/economically disadvantaged|edwosb/i, "EDWOSB"],
  [/wom[ae]n.?owned|wosb/i, "WOSB"],
  [/\b8\s*\(\s*a\s*\)/i, "8(a)"],
  [/partial/i, "Partial Small Business"],
  [/small business/i, "Small Business"],
];
