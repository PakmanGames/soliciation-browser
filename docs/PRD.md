# PRD: Solicitation Browser

Status: draft v2, for iteration.
Owner: lead (this session).
Brief: `docs/ASSIGNMENT.md`.

## 0. Constraints (read first)

- **Time: the entire project has 1 hour, start to finish.**
  Every workstream should aim to land its first mergeable version within 20 to 30 minutes.
  Cut scope before cutting stability; stretch items (5.5) are out unless everything else is done.
- **No tests unless something is actually broken.**
  Do not write unit or integration tests, and do not set up a test runner.
  Verify by running the app and checking it in a browser.
  Write a test only to pin down a real bug you are fixing.
  Typecheck and lint still have to pass.

## 1. Problem

DLA posts hundreds of RFQs to DIBBS every weekday.
DIBBS is slow and awkward to scan: a consent wall, paginated WebForms grids, and no way to narrow results to what a vendor can actually quote.
A vendor wants to answer one question every morning in under a minute: "Which new RFQs are worth my time to quote today?"

## 2. Target user

A small or mid-size parts supplier or distributor.
They sell into a few product categories (FSCs), may qualify for set-asides, and need enough lead time before the quote due date.
They check DIBBS daily and quote on a small fraction of what they see.

## 3. Goals and non-goals

Goals (MVP, all required by the brief):

- G1. Pull RFQs from DIBBS for recent issue dates, at minimum solicitation number and NSN, plus as many vendor-useful fields as are cheap.
- G2. Browse them in a fast, dense, sortable table.
- G3. Search across them with a single box.
- G4. Filter them with filters chosen for evaluating opportunities (section 5).
- G5. Open any row on its original DIBBS page.

Non-goals:

- Accounts, auth, multi-tenant data.
- Submitting quotes or anything that writes to DIBBS.
- Award history, pricing intelligence, PDF parsing (stretch at best).
- Production hardening beyond "stable during a demo".

## 4. Success criteria

- A cold start with `docker compose up -d && pnpm install && pnpm db:migrate && pnpm ingest --days 7 && pnpm dev` produces a working app.
- Search and filter results update in under 200 ms for at least 10k rows on a laptop.
- Filter state lives in the URL, so a filtered view is shareable and survives reload.
- Every row links to DIBBS, and the link works from a fresh browser (through the consent page).
- The README explains the approach, filter choices, and tradeoffs, which is what the reviewers grade.

## 5. Product requirements

### 5.1 Table

- Columns: Solicitation #, NSN (formatted `4-2-3-4`), Nomenclature, FSC, Qty + unit, Set-aside, Issued, Due (with "days left" badge), DIBBS link.
- Sortable by issued, due, quantity, solicitation, nomenclature.
- Default sort: due date ascending, expired hidden, so the most urgent quotable work is on top.
- Dense rows, sticky header, server pagination or virtualization (whichever is simpler with the API).
- Loading skeleton, empty state with "Clear filters", and an error state that keeps the last good results visible.
- Data freshness indicator ("Synced 12 min ago") with a Refresh button.

### 5.2 Search

- One search box that matches solicitation number, NSN (with or without dashes, partial), nomenclature words, and part number.
- Debounced, prefix-aware, and results stay on screen while the next query loads.

### 5.3 Filters and why

| Filter | Why a vendor wants it | Source |
| --- | --- | --- |
| Due date (due in 3 / 7 / 14 days, hide expired) | First question is "can I still quote this in time?" | `returnByDate` |
| Issued date (today / 3 days / 7 days / custom) | Daily workflow is "what is new since yesterday" | `issueDate` |
| Product category (FSG then FSC, with names and counts) | Vendors specialize, so this is the main relevance filter | `fsc` + reference table |
| Set-aside | Decides whether the vendor is even eligible | `setAside` |
| Quantity range | Proxy for deal size and fit with capacity | `quantity` |
| Buying office (DLA Aviation, Land and Maritime, Troop Support, ...) | Vendors have history with specific centers | Derived from solicitation number prefix + reference table |
| Has technical documents | Without drawings many vendors cannot quote | `hasTechnicalDocuments` |

Each filter option shows a count for the current result set (facets).
A field's facet counts apply every active filter except that field's own, so selecting one option never hides its siblings.
The final set depends on what WS1 finds cheap to ingest; the README will explain the choices.

### 5.4 Ingestion

- `pnpm ingest --days N` backfills recent issue dates into Postgres.
- `POST /api/refresh` ingests today, triggered by the Refresh button.
- Upserts are idempotent; a failed ingest never wipes good data.

### 5.5 Stretch (only after MVP is solid)

- Saved views or a "My FSCs" watchlist stored in localStorage.
- "New since last visit" highlighting.
- Row preview drawer with detail-page fields.
- Keyboard navigation (`/` to search, `j`/`k` rows, `o` to open on DIBBS).
- CSV export of the current view.
- Scheduled daily ingest.
- Hosted demo URL.

## 6. Architecture

- One TypeScript codebase: Next.js (App Router) on Node 24, pnpm.
- UI: Tailwind, shadcn/ui, TanStack Table, TanStack Query.
- Storage: PostgreSQL 17, run locally with Docker Compose, `DATABASE_URL` in `.env`.
- Data access: `postgres` (postgres.js) with plain SQL and one idempotent `schema.sql`, no ORM.
- Search: a generated lowercase `haystack` column (solicitation number, NSN, part number, nomenclature) with a `pg_trgm` GIN index; every search term must appear as a substring.
- Flow: DIBBS -> `src/server/dibbs` (fetch + parse) -> `src/server/db` (upsert, query, facets) -> `GET /api/solicitations` -> UI.
- Why this shape: Postgres handles 10k to 100k rows with full-text search and facet counts in milliseconds, makes a hosted demo easy (any managed Postgres), and a single API route is a clean seam between UI and server agents.

### 6.1 Repo layout and ownership

| Path | Owner |
| --- | --- |
| `package.json`, configs, `CLAUDE.md`, `docker-compose.yml`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/providers.tsx` | WS0 |
| `src/lib/solicitation.ts` (data contract) | WS0 + WS1, identical content |
| `src/lib/query.ts` (query contract, URL parse/serialize) | WS0 |
| `src/lib/api.ts` (fetch hooks) | WS0 |
| `src/server/dibbs/**`, `scripts/ingest.ts`, `docs/dibbs-data-source.md` | WS1 |
| `src/server/db/**`, `scripts/db-*.ts`, `src/app/api/**` | WS2 (replaces WS0 stub) |
| `src/components/results/**` | WS3 |
| `src/components/filters/**`, `src/components/search/**` | WS4 |
| `src/lib/reference/**` | WS5 |
| `data/fixtures/**` | WS1 (WS0 placeholder until then) |
| `README.md`, `docs/**` | WS6 |

Rule: an agent only edits paths it owns.
Contract files change only through the lead.

### 6.2 Contracts

Data contract: `Solicitation` in `src/lib/solicitation.ts`, defined verbatim in `docs/agent-prompts/ws1-ingestion.md`.

Query contract (draft, WS0 commits it):

```ts
export interface SolicitationQuery {
  q?: string;
  issuedFrom?: string; // YYYY-MM-DD
  issuedTo?: string;
  dueWithinDays?: number;
  includeExpired?: boolean; // default false
  fsc?: string[];
  setAside?: string[];
  office?: string[];
  qtyMin?: number;
  qtyMax?: number;
  hasTechDocs?: boolean;
  sort?: "dueDate" | "issueDate" | "quantity" | "solicitationNumber" | "nomenclature";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// GET /api/solicitations?<SolicitationQuery as URL params>
export interface SolicitationPage {
  items: Solicitation[];
  total: number;
  facets: Record<"fsc" | "setAside" | "office", { value: string; count: number }[]>;
  lastSyncedAt: string | null;
}
```

The page URL and the API URL use the same params, so `src/lib/query.ts` is the single parser and serializer for both.
Arrays are repeated params (`fsc=5305&fsc=5310`), booleans are `true`/`false`, and params equal to their default are omitted so URLs stay short.

## 7. Workstreams

| WS | What | Who | Starts | Blocked by |
| --- | --- | --- | --- | --- |
| WS0 | Scaffold + walking skeleton + contracts | Agent F | Now | Nothing |
| WS1 | DIBBS ingestion module + CLI | Agent A | Now | Nothing |
| WS5 | Reference data: FSG/FSC names, set-aside labels, buying office codes | Agent E | Now | Nothing |
| WS2 | Postgres schema and migrations, upsert, search, facets, real API routes, refresh endpoint, fixture seed script | Agent B | After WS0 | WS0 (WS1 fixture nice to have) |
| WS3 | Results table, sorting, pagination, states, DIBBS links, freshness | Agent C | After WS0 | WS0 |
| WS4 | Search box + filter panel + facet counts, URL sync | Agent D | After WS0 | WS0 (WS5 labels nice to have) |
| WS6 | Integration, E2E pass, polish, README write-up, demo script | Lead | After WS1 to WS4 | All |

WS0 walking skeleton, so WS2 to WS4 never wait on each other:

- Next.js app with Tailwind and shadcn/ui initialized, lint and typecheck passing.
- `docker-compose.yml` with Postgres 17 and `.env.example` with `DATABASE_URL`, so WS2 can start on the database immediately.
- `src/lib/solicitation.ts` and `src/lib/query.ts` committed.
- A stub `GET /api/solicitations` that filters `data/fixtures/solicitations.sample.json` in memory, implementing the contract naively.
- `src/app/page.tsx` composing `<SearchBox/>`, `<FilterPanel/>`, and `<ResultsTable/>` stubs, plus URL-state and data hooks in `src/lib/api.ts`.
- A placeholder fixture of about 20 hand-made rows until WS1 Milestone 1 lands.

## 8. Timeline (1 hour total, T0 = now)

| Window | Lead | Agents |
| --- | --- | --- |
| T0 to T+15m | Finalize PRD, write WS2 to WS5 prompts, merge WS0 | WS0 scaffold, WS1 recon + fixture, WS5 |
| T+15m to T+40m | Merge milestones as they land, unblock | WS1 module, WS2, WS3, WS4 |
| T+40m to T+50m | Integrate, real ingest, browser pass, fix | Fix-up tasks from lead |
| T+50m to T+60m | README (approach, filters, tradeoffs), demo prep | |

## 9. Merge protocol

- Each agent works in its own worktree and branch, with small conventional commits.
- The lead merges to main; agents rebase onto main after each merge.
- Milestone commits (contract, fixture, skeleton) merge immediately to unblock others.
- Before merge: typecheck and lint pass, and the app runs.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| WAF blocks scraping | Honest UA, low concurrency, bulk download files, Playwright fallback |
| DIBBS deep links blocked by consent wall | WS1 verifies the `goto` redirect; worst case link to the consent URL with `goto` set |
| Key fields (set-aside, due date) only on detail pages | Bounded enrichment, or drop the filter and explain in README |
| Merge conflicts across agents | Path ownership table, contracts committed first |
| Live site down during demo | Committed fixture plus `pnpm db:seed`, so the demo never depends on DIBBS |

## 11. Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Stack | Next.js, TypeScript, PostgreSQL | Lead's call; one language end to end, Postgres covers search and facets |
| Local database | Docker Compose, Postgres 17 | Reviewers can run it with one command |
| Ingestion path | Plain HTTP from Node, browser only for recon and verification | The app must refresh on its own with no human browser in the loop |
| Data access | postgres.js and plain SQL, no ORM | Fewest moving parts for a 1-hour budget |
| Search | Substring match on a trigram-indexed `haystack` column | Handles partial NSNs and part numbers, which word-based full-text search does not |

## 12. Open questions

1. Demo: local only, or do we want a hosted URL?
2. Exact time budget and how many agents you can run at once.
3. Any filters you already know you want, or want to drop?
