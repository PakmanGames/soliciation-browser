/**
 * Helpers for driving DIBBS's ASP.NET WebForms pages without a browser.
 * Every postback (consent banner, grid paging) must echo back all hidden inputs of
 * the page it came from, including the split `__VIEWSTATE0..N` chunks.
 */
import * as cheerio from "cheerio";

/** All `<input type="hidden">` name/value pairs, entity-decoded, in document order. */
export function extractHiddenFields(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  $("input[type=hidden]").each((_, el) => {
    const name = $(el).attr("name");
    if (name) fields[name] = $(el).attr("value") ?? "";
  });
  return fields;
}

/** The first form's action resolved against the page URL, or null if the page has no form. */
export function extractFormAction(
  html: string,
  pageUrl: string,
): string | null {
  const action = cheerio.load(html)("form").first().attr("action");
  return action ? new URL(action, pageUrl).toString() : null;
}

/** True for the DoD Warning and Consent banner that gates every DIBBS host. */
export function isConsentPage(html: string): boolean {
  return (
    html.includes("Warning and Consent") && html.includes('name="butAgree"')
  );
}

/** True for the WAF block page (served with HTTP 200, so status codes do not reveal it). */
export function isWafRejection(html: string): boolean {
  return html.includes("<title>Request Rejected</title>");
}
