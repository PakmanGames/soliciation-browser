# Task: WS0 scaffold and walking skeleton

You are one of several agents building a take-home project in parallel.
Read these first, in the repo:

1. `docs/ASSIGNMENT.md`: the assignment brief.
2. `docs/PRD.md`: product, architecture, contracts, workstreams, and file ownership.
   You are WS0.
3. `docs/agent-prompts/ws1-ingestion.md`: only for the `Solicitation` contract block, which you copy verbatim.

Your job is the foundation every other agent builds on: a Next.js app with a working end-to-end data flow (fixture -> stub API -> URL state -> page) and the shared contracts.
The storage (WS2), results table (WS3), and search and filters (WS4) agents are waiting on you, so speed beats polish.
Target: 15 minutes. The entire project has 1 hour (PRD section 0).
Build the frame and the seams, not the features.

## Stack (fixed)

- Next.js latest (App Router, `src/` dir, `@/*` import alias), TypeScript strict, pnpm, Node 24.
- Tailwind CSS and shadcn/ui.
- TanStack Query for data fetching. Also install `@tanstack/react-table` now so WS3 does not touch `package.json`.
- Prettier with `prettier-plugin-tailwindcss`.
- No tests and no test runner (PRD section 0). Verify by running the app in a browser.
- PostgreSQL 17 via Docker Compose. You only provide the container; WS2 owns everything database related, including the driver and ORM.

Use the context7 MCP tools for current Next.js, shadcn, and TanStack Query docs instead of relying on memory.

## Where to work

The repo is `/Users/pakmangames/repos/soliciation-browser`.
Work in your own git worktree on a branch named `ws0-scaffold`, created from `origin/main` after `git fetch origin`.

## Deliverables

### 1. App scaffold

- `create-next-app` refuses non-empty directories and writes its own README.
  Scaffold into a temp directory and move the files into the repo root.
  The existing `README.md` (the project write-up) and `docs/` must stay untouched.
- Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `format`.
  Do not add `db:*` or `ingest` scripts; WS2 and WS1 own those.
- `.gitignore` additions: `.env`, `data/raw/`.

### 2. shadcn/ui components up front

Initialize shadcn/ui with the neutral base color and add the components WS3 and WS4 will need, so they do not both generate overlapping files later:
`button`, `input`, `badge`, `table`, `checkbox`, `select`, `popover`, `command`, `skeleton`, `tooltip`, `separator`, `scroll-area`, `sheet`, `dropdown-menu`, `toggle-group`, `slider`, `sonner`.

### 3. Postgres container

- `docker-compose.yml` with a `postgres:17` service, a named volume, and a healthcheck.
- Map host port 5433 to avoid clashing with any local Postgres.
- `.env.example` with `DATABASE_URL=postgres://postgres:postgres@localhost:5433/solicitations`.
- Verify `docker compose up -d` comes up healthy.

### 4. Contracts

- `src/lib/solicitation.ts`: copy the contract block from `docs/agent-prompts/ws1-ingestion.md` byte for byte.
  WS1 creates the identical file on its branch, so any difference causes a merge conflict.
  If `origin/main` already has this file, keep it as is.
- `src/lib/query.ts`: `SolicitationQuery` and `SolicitationPage` exactly as in PRD section 6.2, plus:
  - `parseQuery(params: URLSearchParams): SolicitationQuery`: tolerant of garbage (invalid values are dropped, never thrown), fills defaults.
  - `serializeQuery(query: SolicitationQuery): URLSearchParams`: omits params equal to their default, so URLs stay short and stable.
  - Conventions from the PRD: arrays as repeated params (`fsc=5305&fsc=5310`), booleans as `true`/`false`.
  - Defaults: `sort=dueDate`, `dir=asc`, `includeExpired=false`, `page=1`, `pageSize=50` (max 200).
- These are the files every agent codes against, so add short doc comments on each field explaining its meaning.

### 5. Stub API over the fixture

- `src/server/stub/fixture-query.ts`: implements the whole query contract naively in memory over `data/fixtures/solicitations.sample.json`.
  - `q`: case-insensitive substring match on solicitation number, NSN (strip dashes from the query first), nomenclature, and part number.
  - All filters in `SolicitationQuery`. `dueWithinDays` and `includeExpired` are relative to today.
  - `office` is the first 6 characters of the solicitation number (the buying activity code); WS5 will map codes to names.
  - Sorting with nulls last, then pagination.
  - Facets for `fsc`, `setAside`, `office`: each field's counts apply every active filter except that field's own.
  - `lastSyncedAt`: the newest `fetchedAt` in the data.
- `src/app/api/solicitations/route.ts`: `GET` that parses the URL with `parseQuery` and returns a `SolicitationPage` from the stub.
  WS2 will swap the stub for Postgres behind this same route, so keep the route itself to a few lines.

### 6. Client data flow

- `src/app/providers.tsx`: `QueryClientProvider` and the shadcn `Toaster`.
- `src/lib/api.ts`:
  - `useQueryState()`: reads `useSearchParams` through `parseQuery`, returns `[query, setQuery]`.
    `setQuery(patch)` merges the patch, resets `page` to 1 unless the patch sets it, and writes with `router.replace(..., { scroll: false })` via `serializeQuery`.
  - `useSolicitations(query)`: TanStack Query fetch of `/api/solicitations?...` with `placeholderData: keepPreviousData`, so results stay on screen while the next ones load.
  - Search debouncing is not here; WS4 debounces inside its search box.

### 7. Page frame with stub components

`src/app/page.tsx` composes these stubs inside a `Suspense` boundary (required by `useSearchParams`):

| Stub | Owner | Stub behavior |
| --- | --- | --- |
| `src/components/search/search-box.tsx` | WS4 | Plain input bound to `q` |
| `src/components/filters/filter-panel.tsx` | WS4 | Lists facet values with counts as plain checkboxes for `fsc` |
| `src/components/results/results-table.tsx` | WS3 | Plain list of solicitation number, NSN, nomenclature, due date, total count |
| `src/components/results/sync-status.tsx` | WS3 | Shows `lastSyncedAt` as text |

Each stub takes no props and gets its data from the hooks in `src/lib/api.ts`, so WS3 and WS4 can rewrite their components without touching `page.tsx`.

Layout (desktop first, dense and neutral, it should look like a professional data tool):

- Header, about 56px tall: product name "Solicitation Browser" on the left, `SyncStatus` on the right.
- Left sidebar, about 288px wide, sticky, scrolls independently: `FilterPanel`.
- Main column: `SearchBox` on top, `ResultsTable` filling the remaining height.
- Below 768px, hide the sidebar; WS4 will add a sheet for mobile filters.

Keep the stubs ugly but functional.
Polish belongs to WS3 and WS4.

### 8. Placeholder fixture

- If `origin/main` already has `data/fixtures/solicitations.sample.json` from WS1, use it and skip this step.
- Otherwise create about 25 hand-made rows that match the `Solicitation` contract and look realistic.
  Mix FSCs (for example 5305 screws, 5330 seals, 2530 brake parts, 4720 hoses, 5961 semiconductors), buying offices (`SPE7M1`, `SPE4A6`, `SPE1C1`, `SPE7L3`), set-asides, quantities, and both with and without technical documents.
- Set issue and return-by dates around today (a few expired, most due within 2 to 20 days), so the default filters show rows.
- Put `"placeholder": "true"` in each row's `extra`, so nobody mistakes it for real data.
  WS1 will overwrite this file with real data.

### 9. `CLAUDE.md` for all agents

Short, no more than 40 lines: one-line project summary, commands (dev, lint, typecheck, format, docker), repo layout, a pointer to `docs/PRD.md` section 6.1 for file ownership, and the rule that agents only edit paths they own and change contracts only through the lead.

## Boundaries

Do not build: the database layer (WS2), the DIBBS client (WS1), the real table (WS3), real filters and search (WS4), or reference data such as FSC names (WS5).
Do not edit `README.md` or anything in `docs/`.

## Definition of done

- `docker compose up -d && pnpm install && pnpm dev` shows the page with fixture rows coming through the stub API.
- Editing the URL by hand (for example `?q=screw&fsc=5305&includeExpired=true`) changes the results, the facet counts, and the input states.
- `pnpm lint && pnpm typecheck && pnpm build` all pass.
- You checked the page in a real browser at desktop and mobile widths: no console errors, no hydration warnings, no layout shift.
- Small conventional commits on `ws0-scaffold`, rebased onto `origin/main`, and the branch pushed.

## Final report to the user

- The branch name and that it is ready to merge to main.
- Anything in the PRD contracts you found ambiguous and how you resolved it.
- Anything WS2, WS3, or WS4 should know before they start.
