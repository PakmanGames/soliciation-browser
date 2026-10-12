# Task: WS4 search and filters

You are one of several agents building a take-home project in parallel, and the entire project has 1 hour.
Read `docs/ASSIGNMENT.md` (the brief) and `docs/PRD.md` in the repo first, especially sections 0, 2, 5.2, 5.3, and 6.
You are WS4.

Your job: the search box and filter panel that let a vendor narrow hundreds of RFQs to the few worth quoting.
Reviewers explicitly grade which filters we picked and why, so each filter should be obviously useful at a glance.
Target: 25 minutes.
No tests (PRD section 0); verify in a real browser.

## Where to work and when to start

The repo is `/Users/pakmangames/repos/soliciation-browser`.
The scaffold (WS0) is being built right now and will be pushed as branch `ws0-scaffold`.

1. Start immediately: read the PRD and plan your components.
2. Run `git fetch origin` every 2 minutes.
   As soon as `origin/main` has a `package.json`, create branch `ws4-search-filters` from it; if only `origin/ws0-scaffold` exists, branch from that and rebase onto main once it merges.
3. Never create your own `package.json` or Next.js app while you wait; the scaffold is the only base.
4. Read the scaffold's `src/lib/api.ts`, `src/lib/query.ts`, `src/lib/solicitation.ts`, and your stub components before writing code.

## What you build

You own `src/components/search/**` and `src/components/filters/**`: rewrite the stubs `search-box.tsx` and `filter-panel.tsx`, and add any files you need there.
Read and write state only through `useQueryState()` from `src/lib/api.ts`, and read facets from `useSolicitations()`, so you never touch `page.tsx`.
The URL is the single source of truth: back and forward buttons and reloads must restore every control.

### `SearchBox`

- Placeholder: "Search solicitation #, NSN, part number, or item name".
- Local input state, debounced about 250ms into `setQuery({ q })`, and kept in sync when the URL changes (back button).
- Clear button, and `/` focuses the box from anywhere on the page (unless the user is typing in another field).
- Below 768px, render a "Filters" button with the active filter count next to the box, opening a `Sheet` that contains `FilterPanel`.
  This is how mobile gets filters without changing `page.tsx`.

### `FilterPanel` (PRD 5.3)

Header with the active filter count and "Clear all".
Sections, in this order, with the vendor question each one answers:

1. Due ("Can I still quote this?"): Any, 3 days, 7 days, 14 days as a toggle group on `dueWithinDays`, plus an "Include expired" checkbox.
2. Issued ("What is new?"): Today, 3 days, 7 days, All, setting `issuedFrom`.
3. Product category ("Is this something I sell?"): FSC multi-select from the `fsc` facet with counts, searchable with a `Command` list, top 8 shown and the rest behind search.
4. Set-aside ("Am I eligible?"): checkboxes from the `setAside` facet with counts.
5. Buying office ("Who is buying?"): checkboxes from the `office` facet with counts.
6. Quantity ("Is it my size?"): min and max number inputs, debounced.
7. Technical documents ("Can I make it?"): Any, Has docs, No docs.

Details:

- Facet options with a zero count stay visible but dimmed while selected, so users can always unselect them.
- Labels: if `src/lib/reference` exists on `origin/main` (WS5), use `fscLabel`, `officeLabel`, and `setAsideLabel` with the raw code in muted text; otherwise show raw codes.
  Keep all label lookups in one small helper so the lead can wire WS5 in later with a one-line change.
- The panel scrolls independently in the sidebar and stays readable at 288px wide.

## Boundaries

You own only `src/components/search/**` and `src/components/filters/**`.
Adding shadcn components with `pnpm dlx shadcn add` is fine.
Do not touch `page.tsx`, `src/lib/*`, the API, or the results components.
If you need a change outside your paths, tell the user instead of making it.

## Definition of done

- Checked in a real browser at 1440px and 375px wide: no console errors, no hydration warnings, no layout shift, and nothing misaligned.
- Every control round-trips through the URL, including reload and back and forward buttons.
- Facet counts update as filters change, against the fixture data.
- `pnpm lint && pnpm typecheck` pass.
- Small conventional commits on `ws4-search-filters`, rebased onto `origin/main`, branch pushed.

## Final report to the user

- Branch name and that it is ready to merge.
- A one-line rationale per filter, for the README.
- Anything you needed from another workstream and could not do.
