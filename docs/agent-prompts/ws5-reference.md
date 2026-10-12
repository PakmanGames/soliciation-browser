# Task: WS5 reference data

You are one of several agents building a take-home project in parallel, and the entire project has 1 hour.
Read `docs/ASSIGNMENT.md` (the brief) and `docs/PRD.md` (sections 0, 5.3, 6.1, 7) in the repo first.
You are WS5.

Your job: turn the cryptic codes in DIBBS data into human labels for the filters and table.
Vendors think in "Screws" and "DLA Aviation", not "5305" and "SPE4A6".
Target: 15 minutes.
No tests (PRD section 0).

## Where to work

The repo is `/Users/pakmangames/repos/soliciation-browser`.
Work in your own git worktree on a branch named `ws5-reference`, created from `origin/main` after `git fetch origin`.
You do not need the Next.js scaffold: your output is plain TypeScript with zero dependencies.

## Deliverables (all in `src/lib/reference/`)

1. `fsc.ts`: Federal Supply Classification names for products (the 4-digit numeric codes, not service codes).
   - `FSG_NAMES: Record<string, string>`: 2-digit group to name, e.g. `"53": "Hardware and Abrasives"`.
   - `FSC_NAMES: Record<string, string>`: 4-digit class to name, e.g. `"5305": "Screws"`.
   - Source it from an authoritative list (the PSC Manual on acquisition.gov or GSA's PSC download) rather than memory.
     If you cannot get the full class list within 10 minutes, ship all groups plus the classes you have, and say so.
2. `offices.ts`: DLA buying activity names, keyed by the first 6 characters of a solicitation number (the DoDAAC), e.g. `SPE7M1`, `SPE4A6`, `SPE1C1`, `SPE7L3`.
   - Map known codes or prefixes to a short name and full name, e.g. `{ short: "Land and Maritime", full: "DLA Land and Maritime, Columbus OH" }`.
   - Match on the longest known prefix, so unknown codes under a known prefix still resolve to the right center.
3. `set-aside.ts`: short labels for set-aside values.
   - The raw values come from DIBBS and are not known yet.
     Check `origin/main` and `origin/ws1-ingestion` for `data/fixtures/solicitations.sample.json` or `docs/dibbs-data-source.md` to see real values.
   - If none are available yet, map the common FAR set-aside types (total small business, partial small business, 8(a), HUBZone, SDVOSB, WOSB, EDWOSB, unrestricted) by tolerant matching on the raw text.
4. `index.ts` exporting pure helpers that never throw and fall back to the raw code:
   - `fsgOf(fsc: string): string`
   - `fscLabel(fsc: string): string`, e.g. `"Screws"`
   - `fsgLabel(fsg: string): string`
   - `officeOf(solicitationNumber: string): string` (first 6 characters)
   - `officeLabel(code: string): { short: string; full: string }`
   - `setAsideLabel(raw: string | null): string`

## Boundaries

You own only `src/lib/reference/**`.
Do not touch `package.json` or any other file.

## Definition of done

- `npx tsc --noEmit --strict src/lib/reference/*.ts` passes.
- Small conventional commits on `ws5-reference`, branch pushed.

## Final report to the user

- Branch name and that it is ready to merge (it cannot conflict with anything).
- Coverage: how many FSG and FSC names, which offices, which set-aside values, and the sources you used.
