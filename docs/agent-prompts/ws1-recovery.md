# Task: finish and land WS1 (DIBBS ingestion) after a crashed session

You are taking over workstream WS1 from a session that crashed.
The project has a 1-hour budget and it is nearly used up, so the goal is to get the existing work merged in about 10 minutes.
Do not redo recon or rewrite working code.

Read on `origin/main` first (`git fetch origin`):

- `docs/PRD.md`, section 0 (1-hour budget, no tests) and section 6.
- `docs/agent-prompts/ws1-ingestion.md`: the original WS1 brief.
- `CLAUDE.md`: repo commands and rules.

## Where the work is

Worktree: `/Users/pakmangames/.treehouse/soliciation-browser-166099/2/soliciation-browser`, on a detached HEAD.

- Committed but never pushed: `149537e feat: add solicitation contract and sample fixture` (300 real records in `data/fixtures/solicitations.sample.json` plus `src/lib/solicitation.ts`, which is identical to main's).
- Uncommitted: `package.json`, `pnpm-lock.yaml`, `.gitignore`, `scripts/ingest.ts`, `src/server/dibbs/` (`session.ts`, `aspnet.ts`, `index-file.ts`, `grid.ts`, `normalize.ts`, `index.ts`, `__fixtures__/`, and three `*.test.ts` files), and `data/raw/`.

Do not discard any of it.

## Steps

1. In that worktree: `git switch -c ws1-ingestion`.
2. Remove the tests, since the PRD says no tests: delete `src/server/dibbs/*.test.ts` and `src/server/dibbs/__fixtures__/`, and drop `vitest` from `package.json`.
3. Commit the module and CLI: `feat: add DIBBS ingestion module and ingest CLI`.
   Do not commit `data/raw/`.
4. Rebase onto `origin/main` and resolve the conflicts this way:
   - `package.json`: take main's version, then add only `cheerio` to dependencies, `tsx` to devDependencies if it is not already there (PR #5 adds it), and the script `"ingest": "tsx --env-file-if-exists=.env scripts/ingest.ts"`.
   - `pnpm-lock.yaml`: take main's version, then run `pnpm install` to regenerate it.
   - `.gitignore`: take main's version and make sure `data/raw/` is in it.
   - `data/fixtures/solicitations.sample.json`: take your version (real data replaces the placeholder).
5. Verify:
   - `pnpm install && pnpm typecheck && pnpm lint` pass; fix any lint or type errors in your files.
   - `pnpm ingest --days 5` runs against the live site and writes `data/raw/*.json`.
     Today is Monday 2026-10-12, so expect Thursday and Friday to have hundreds of records and the weekend to be nearly empty.
6. Write a short `docs/dibbs-data-source.md` (about 20 lines, one sentence per line): which source you use (the daily "in" index file, the search-result grid, or both) and why, records per issue date, requests and time per issue date, the `dibbsUrl` format and whether it works from a fresh browser through the consent page, what the raw `setAside` codes mean and what each `extra` key holds, and known limitations.
7. Push `ws1-ingestion` and open a PR against **main** (not any other branch) with `gh pr create --base main`.

## Boundaries

You own `src/server/dibbs/**`, `scripts/ingest.ts`, `data/fixtures/**`, and `docs/dibbs-data-source.md`.
In `package.json` and `.gitignore`, make only the changes above.
Do not touch anything else.

## Final report to the user

- PR URL.
- Source used, records per issue date, and ingest time per issue date.
- Whether `dibbsUrl` works from a fresh browser.
- The meaning of each `setAside` code, so the filter labels can be fixed.
