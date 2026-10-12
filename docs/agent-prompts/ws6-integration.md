# Task: WS6 end-to-end integration and polish

You are finishing a take-home project built by several parallel agents; the time budget is nearly used up.
Read `docs/ASSIGNMENT.md`, `docs/PRD.md` (section 0: no tests), `CLAUDE.md`, and `README.md` on `origin/main` first.
All workstreams are merged.
Your job is to run the real app end to end with real data, fix what is broken or looks off, and make the README match reality.

## Where to work

Repo: `/Users/pakmangames/repos/soliciation-browser`.
Use your own git worktree from `origin/main`, on a branch named `ws6-integration`.
Code changes go through a PR against main.
Changes to Markdown files only (README, docs) may be committed and pushed straight to main.

## Steps

1. Check that PRs #8 (hide closed RFQs) and #9 (`POST /api/refresh`) are merged; if not, ask the user to merge them before step 3.
2. Load real data:
   `docker compose up -d && pnpm install && pnpm db:migrate`, then `psql postgres://postgres:postgres@localhost:5433/solicitations -c 'truncate solicitations'` (it still holds placeholder rows), then `pnpm ingest --days 5 && pnpm db:load`.
   Expect about 4,600 rows.
3. `pnpm dev`, then check in a real browser at 1440px and 375px wide:
   - The default view (open RFQs, soonest due first), sorting, and paging.
   - Search: a word ("valve"), a full NSN, a partial dashed NSN ("5305-01"), and a solicitation number.
   - Every filter, facet counts updating, "Clear all", reload, and the back button.
   - "Open on DIBBS" links, and the Refresh button.
   - No console errors, hydration warnings, layout shift, or misalignment; filter and search responses feel instant.
   Fix what is broken or looks off, keeping changes small.
4. README:
   - Save a screenshot of the main view at 1440px to `docs/screenshot.png` and embed it where the screenshot TODO is.
   - Make every claim in "What it does", "Filter choices", and "Small things" match the app; delete or reword anything that did not ship.
   - Remove all `TODO(integration)` comments and the draft comment at the top.
5. `pnpm lint && pnpm typecheck && pnpm build` pass on the final main.

## Final report to the user

- PR URL (if any code changed), and what you fixed.
- Anything still broken or cut.
- The exact commands a reviewer runs from a fresh clone.
