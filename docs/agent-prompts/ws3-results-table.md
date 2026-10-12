# Task: WS3 results table

You are one of several agents building a take-home project in parallel, and the entire project has 1 hour.
Read `README.md` (the brief) and `docs/PRD.md` in the repo first, especially sections 0, 2, 5.1, and 6.
You are WS3.

Your job: the results table a vendor scans every morning.
It is the heart of the demo, and reviewers grade UX, speed, and product sense, so make it feel fast, dense, and polished.
Target: 25 minutes.
No tests (PRD section 0); verify in a real browser.

## Where to work and when to start

The repo is `/Users/pakmangames/repos/soliciation-browser`.
The scaffold (WS0) is being built right now and will be pushed as branch `ws0-scaffold`.

1. Start immediately: read the PRD and plan your columns, states, and component split.
2. Run `git fetch origin` every 2 minutes.
   As soon as `origin/main` has a `package.json`, create branch `ws3-results-table` from it; if only `origin/ws0-scaffold` exists, branch from that and rebase onto main once it merges.
3. Read the scaffold's `src/lib/api.ts`, `src/lib/query.ts`, `src/lib/solicitation.ts`, and your stub components before writing code.

## What you build

You own `src/components/results/**`: rewrite the stubs `results-table.tsx` and `sync-status.tsx`, and add any files you need there.
Get data only through `useQueryState()` and `useSolicitations()` from `src/lib/api.ts`, so you never touch `page.tsx`.

### `ResultsTable`

- TanStack Table (already installed) with manual sorting and pagination, because the server does both.
- Columns (PRD 5.1):
  - Solicitation # (monospace), linking to `dibbsUrl` in a new tab.
  - NSN formatted `4-2-3-4` (monospace), with a copy-to-clipboard button on hover and a toast on copy.
  - Nomenclature, truncated with a tooltip for the full text.
  - FSC code, with its name as a tooltip or subtitle if `src/lib/reference` exists on `origin/main` (WS5); otherwise the code alone.
  - Quantity and unit, right-aligned, tabular numbers.
  - Set-aside as a subtle badge.
  - Issued date.
  - Due date with a days-left badge: red at 3 days or fewer, amber at 7 or fewer, muted "Expired" when past.
  - An "Open on DIBBS" icon button (new tab, `rel="noopener noreferrer"`, accessible label).
- Clicking sortable headers calls `setQuery({ sort, dir })`, with a clear sort indicator.
- Footer: "1 to 50 of 1,234", previous and next, page size select.
- Dense rows (about 36px), sticky header, and only the table body scrolls inside the main column.

### States

- First load: skeleton rows matching the real row height, so nothing shifts when data arrives.
- Refetching: keep the current rows visible with a subtle loading indicator; never flash empty.
- Empty: a short message and a "Clear filters" button that resets the query.
- Error: a message with "Retry", keeping the last good rows visible if there were any.

### `SyncStatus`

- "Synced 12 min ago" from `lastSyncedAt`, refreshing every minute, with the exact time as a tooltip.
- A "Refresh" button that calls `POST /api/refresh` (WS2 is building it), shows a spinner, then invalidates the solicitations query and toasts the result.
  If the endpoint returns 404, toast "Refresh not available yet" instead of failing.

## Boundaries

You own only `src/components/results/**`.
Adding shadcn components with `pnpm dlx shadcn add` is fine.
Do not touch `page.tsx`, `src/lib/*`, the API, or the filter and search components.
If you need a change outside your paths, tell the user instead of making it.

## Definition of done

- Checked in a real browser at 1440px and 375px wide: no console errors, no hydration warnings, no layout shift, and nothing misaligned.
- Sorting, paging, copy, and DIBBS links all work against the fixture data.
- `pnpm lint && pnpm typecheck` pass.
- Small conventional commits on `ws3-results-table`, rebased onto `origin/main`, branch pushed.

## Final report to the user

- Branch name and that it is ready to merge.
- Screenshots or a short description of each state.
- Anything you needed from another workstream and could not do.
