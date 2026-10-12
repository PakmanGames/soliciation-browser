# Task: DIBBS RFQ ingestion module

You are one of several agents building a take-home project in parallel.
Read `docs/ASSIGNMENT.md` for the assignment brief.
We are building a full-stack web app that pulls daily RFQs (Requests for Quotation) from DIBBS (https://www.dibbs.bsm.dla.mil/RFQ/) and lets a vendor browse, search, and filter them.
Your job is the layer that talks to DIBBS: find the best way to get the data, then build a reliable, tested TypeScript module and CLI that returns normalized records.
Other agents are building storage, API, and UI at the same time against the contract below, so stay inside your lane and hit the milestones early.
The whole project has a few hours, so prefer a robust, working path over a perfect one.

## Stack (fixed)

- TypeScript on Node 24, pnpm.
- The app will be Next.js with PostgreSQL, but you do not touch either.
- Keep dependencies minimal: `cheerio` for HTML parsing, `tsx` to run scripts, `vitest` for tests, and a cookie jar helper only if you really need one.

## What we already know about the site

Verified on 2026-10-12 with curl:

- `GET https://www.dibbs.bsm.dla.mil/RFQ/` returns `302` to `/dodwarning.aspx?goto=/rfq/`, a DoD consent banner.
  You must accept it (an ASP.NET postback) and carry the resulting session cookies on every later request.
- The site is ASP.NET WebForms with split view state.
  The consent page has `__VIEWSTATE`, `__VIEWSTATE1` through `__VIEWSTATE23`, `__EVENTVALIDATION`, and more.
  Every postback (consent, paging) must echo back all hidden inputs from the page it came from.
- There is a WAF.
  Plain curl with its default User-Agent got the page, but a request with a bare spoofed `User-Agent: Mozilla/5.0` got a `Request Rejected` page.
  Send either an honest UA (e.g. `solicitation-browser/0.1`) or a complete, consistent browser header set.
  Do not hammer the site.

Unverified hints from memory (check them, do not trust them):

- RFQ search results by issue date live under `/RFQ/` (something like `RfqRecs.aspx?category=issue&TypeSrch=dt&Value=MM-DD-YYYY`) as a paginated grid with NSN/Part Number, Nomenclature, Technical Documents, Solicitation, Purchase Request, Quantity, Issue Date, and Return By Date.
- Per-solicitation detail pages (something like `RfqRec.aspx?sn=<solicitation>`) and per-NSN pages exist, and solicitations usually link a PDF.
- DIBBS has a Downloads area with daily RFQ files (historically "in" index files and "bq" batch-quote files per issue date).
  If they are reachable and cover our fields, they may be far more robust and cheaper than paging through HTML.
  Evaluate them first.

## Contract

Create `src/lib/solicitation.ts` with exactly this content.
Other agents create the identical file on their branches, so do not reformat or reorder it.
If you need to change it, do it in a separate commit and call it out to the user, because every workstream depends on it.

```ts
/**
 * One RFQ line item posted on DIBBS.
 * Produced by `src/server/dibbs`, stored by `src/server/db`, rendered by the UI.
 * Changes to this contract go through the lead, because every workstream depends on it.
 */
export interface Solicitation {
  /** Deterministic and stable across re-ingests, e.g. `${solicitationNumber}:${nsn}`. */
  id: string;
  /** Uppercase, no spaces or dashes, e.g. "SPE7M126T1234". */
  solicitationNumber: string;
  /** 13 digits, no dashes. Null only when DIBBS lists a part number without an NSN. */
  nsn: string | null;
  /** Manufacturer part number when DIBBS shows one. */
  partNumber: string | null;
  /** Federal Supply Class: first 4 digits of the NSN. */
  fsc: string | null;
  /** Item name as DIBBS shows it, trimmed, e.g. "SCREW,CAP,HEXAGON HEAD". */
  nomenclature: string | null;
  quantity: number | null;
  /** e.g. "EA". */
  unitOfIssue: string | null;
  purchaseRequestNumber: string | null;
  /** "YYYY-MM-DD". */
  issueDate: string;
  /** Quote due date, "YYYY-MM-DD". */
  returnByDate: string | null;
  /** Raw DIBBS set-aside value, or null if the source does not expose it. */
  setAside: string | null;
  /** Whether DIBBS lists technical documents (drawings, specs) for the item. */
  hasTechnicalDocuments: boolean | null;
  /** Opens this RFQ on DIBBS, verified to work from a fresh browser session. */
  dibbsUrl: string;
  /** Solicitation document, if DIBBS links one. */
  pdfUrl: string | null;
  /** Other fields captured cheaply. The UI ignores these until they are promoted to real fields. */
  extra: Record<string, string>;
  /** ISO timestamp of when this record was fetched. */
  fetchedAt: string;
}
```

## Steps and milestones

### 1. Recon (time box: 20 minutes)

Compare the candidate sources: bulk daily files, search-result HTML, and detail pages.
For each one, find out how to get it, which fields it has, how many requests and how long one issue date takes, and how stable it looks.
Pick the primary source (plus optional enrichment) and write it up in `docs/dibbs-data-source.md`.
Save a few real raw responses under `src/server/dibbs/__fixtures__/` for parser tests, trimmed if they are huge.

### 2. Milestone 1: contract and real fixture (target: 40 minutes after you start)

Create `src/lib/solicitation.ts` as above.
Produce `data/fixtures/solicitations.sample.json` with 100 to 300 real records from at least 2 issue dates, as a `Solicitation[]`.
If the file already exists, overwrite it with your real data.
A quick-and-dirty script is fine for this; quality comes in step 3.
Commit these two files on their own (`feat: add solicitation contract and sample fixture`) and tell the user right away, so the commit can be merged to main and unblock the storage and UI agents.

### 3. Milestone 2: module and CLI

Module API in `src/server/dibbs/index.ts`:

```ts
export interface IngestResult {
  issueDate: string;
  solicitations: Solicitation[];
  /** Partial failures. One bad page must not lose the whole day. */
  errors: { where: string; message: string }[];
  stats: { requests: number; durationMs: number };
}

export async function fetchSolicitationsIssuedOn(date: string /* "YYYY-MM-DD" */): Promise<IngestResult>;
```

The storage agent will call this function directly, so it must have no side effects beyond network requests.
Keep parsing in pure functions (raw response in, records out) separate from the HTTP/session code, so parsers are testable offline.

CLI in `scripts/ingest.ts`, exposed as `pnpm ingest`:

- `pnpm ingest --date 2026-10-09` ingests one issue date.
- `pnpm ingest --days 5` ingests the last 5 calendar days including today (weekends are simply empty).
- Writes `data/raw/<issueDate>.json` and prints one summary line per date: records, errors, requests, duration.
- Exits non-zero only if every requested date failed.

## Engineering requirements

- Session handling: accept the consent banner once per run, keep a cookie jar, and re-establish the session automatically if a response bounces back to the consent page.
- Politeness: at most 2 to 3 concurrent requests, timeouts on every request, and retries with backoff on timeouts and 5xx.
- Enrichment from per-solicitation detail pages is optional and only worth it if the primary source lacks key vendor fields (return-by date, set-aside).
  If you add it, keep it bounded and say what it costs per day.
- Normalization: NSN as 13 digits with no dashes, dates as `YYYY-MM-DD`, trimmed strings, uppercase solicitation numbers, numeric quantities.
- Validation: drop records without a solicitation number or issue date, and count them in `errors`.
- Idempotency: re-ingesting the same date yields the same `id`s.
  Check whether one solicitation can have several NSNs or lines, and document how often it happens and how `id` handles it.
- Tests: vitest unit tests for hidden-field extraction, result parsing, pagination detection, and normalization, all against the saved fixtures with no network.
  Add one opt-in live smoke test gated behind `DIBBS_LIVE=1`.
- If plain HTTP is truly blocked by the WAF, fall back to Playwright, but explain why in the doc first.

## Boundaries

You own only these paths:

- `src/server/dibbs/**`
- `scripts/ingest.ts`
- `src/lib/solicitation.ts` (shared contract, see above)
- `data/fixtures/**`
- `docs/dibbs-data-source.md`

Shared files, touched minimally:

- `package.json`: only add your dependencies and the `ingest` script.
  Another agent is scaffolding the Next.js app at the same time.
  If `package.json` does not exist on your branch yet, create a minimal one and expect a trivial merge later.
- `.gitignore`: only add `data/raw/`.
- Do not add tsconfig, ESLint, or Prettier configs unless strictly required; the scaffold owns them.

Do not write UI, database, or API code.
Work on your own branch with small commits, and rebase onto main once the scaffold lands there.

## Definition of done

- Milestone 1 commit delivered and reported.
- `pnpm ingest --days 5` runs end to end against the live site and writes plausible data.
- `pnpm vitest run` passes offline.
- `docs/dibbs-data-source.md` is complete.

## Final report to the user

- The source you chose and why, which contract fields are filled and which are always null, volume per issue date, and requests and time per issue date.
- The exact DIBBS link format for "open this RFQ on DIBBS", and whether it works from a fresh browser with no cookies (does the consent page redirect back to the record via `goto`?).
  Opening each row on DIBBS is a hard requirement of the brief, so verify it, in a real browser if you have browser tools.
- Fields you found that would make good vendor filters (for example set-aside, AMSC, first article testing, buying office, approved sources), and how expensive each is to get.
- Known limitations and risks: WAF behavior, rate limits, flaky pages, multi-line solicitations.
