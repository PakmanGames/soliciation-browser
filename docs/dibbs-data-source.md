# DIBBS data source

Verified against the live site on 2026-10-12.

## Source

The primary source is the "RFQs by Issue Date" grid (`/RFQ/RfqRecs.aspx?category=issue&TypeSrch=dt&Value=MM-DD-YYYY`), paged 50 rows at a time through ASP.NET postbacks.
It is the only source with the exact issue date, set-aside, tech-docs flag, status, and PDF link on every row.
Rows are enriched from the daily index files (`https://dibbs2.bsm.dla.mil/Downloads/RFQ/Archive/inYYMMDD.txt`, layout at `/Rfq/RfqFileDefs.aspx`) with unit of issue, buyer code, AMSC, and set-aside percentage, joined on solicitation, purchase request, and item.
The index files alone are not enough: they are keyed by post date (most rows issued on day D are in the file for D-1), and they lack the issue date, the tech-docs flag, and the `0001S...` test lines.
Every DIBBS host shows a DoD consent banner first, so the session posts it back once per host and keeps the cookies.
The WAF accepts the honest User-Agent `solicitation-browser/0.1` but rejects a bare `Mozilla/5.0`.

## Volume and cost

Measured with `pnpm ingest --days 5` on Monday 2026-10-12 at about 15:50 ET (2 min 21 s in total, 0 errors):

| Issue date | Records | Requests | Time | Enriched from index files |
| --- | --- | --- | --- | --- |
| 2026-10-08 (Thu) | 3,022 | 62 | 88 s | 95% |
| 2026-10-09 (Fri) | 1,594 | 33 | 47 s | 95% |
| 2026-10-10 (Sat) | 8 | 2 | 0.3 s | 100% |
| 2026-10-11 (Sun) | 0 | 2 | 0.5 s | - |
| 2026-10-12 (Mon, partial) | 6 | 13 | 4 s | 100% |

Record counts match DIBBS's own "Records Found" for every date.
A weekday costs about one request per 50 rows, plus a few for consent, the recent files page, and the index files.
Rows missing from every index file (mostly `0001S...` test lines) have no `unitOfIssue`, `buyerCode`, or `amsc`.

## Links

`dibbsUrl` is the Package View, `https://www.dibbs.bsm.dla.mil/rfq/rfqrec.aspx?sn=<SOLICITATION>`.
It was verified in a fresh Chrome profile with no cookies: the consent page appears, and OK redirects back to the right RFQ record.
DIBBS's `goto` redirect keeps only the first query parameter, so deep links must have exactly one.
`pdfUrl` (`https://dibbs2.bsm.dla.mil/Downloads/RFQ/<last digit>/<SOLICITATION>.PDF`) also works from a fresh browser, because the dibbs2 consent post returns the PDF itself.

## Fields

`setAside` holds the DIBBS file code: `N` unrestricted, `Y` small business, `H` HUBZone, `R` SDVOSB, `L` WOSB, `A` 8(a), `E` EDWOSB.
`id` is `solicitation:purchaseRequest:item`, because 5 to 8% of solicitations have several lines, and some lines share a purchase request with a `0001S...` test line.
`nsn` is null and `partNumber` holds the value for part-numbered items and DIBBS test lines (`0001S00000052` Government First Article, `...53` Contractor First Article, `...61` and `...62` Production Lot Testing).
`quantity` is null when DIBBS shows "QTY - See Solicitation", and `hasTechnicalDocuments` is null when the grid cell is blank (under 1% of rows).
`extra` keys appear only when set: `status` (Open, Awarded, Cancelled, Removed), `setAsideLabel` (grid icon text), `itemLabel` (e.g. Mil-Spec), `technicalDocumentsUrl`, `specStandardOnly`, `fastAwardCandidate`, `aidc`, `buyerCode`, `amsc`, and `setAsidePercent`.

## Limitations

Paging is a sequential postback chain with about 200 KB of view state per page, so a busy day takes one to two minutes, and dates run one at a time.
A failed page is skipped when a later page is linked from the last good one, an expired session restarts from page 1, and both are reported in `errors`.
Today's index file is posted the next day, so rows issued today are enriched only from earlier files.
Approved sources (CAGE and part number per NSN, in the daily `bq` zip) are not ingested yet; they would enable a "my CAGE is an approved source" filter.
