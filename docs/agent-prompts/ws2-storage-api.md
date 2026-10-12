# Task: WS2 Postgres storage and API

You are one of several agents building a take-home project in parallel, and the entire project has 1 hour.
Read `README.md` (the brief) and `docs/PRD.md` in the repo first, especially sections 0, 5, 6, and 7.
You are WS2.

Your job: store DIBBS solicitations in Postgres and serve the search, filter, and facet API the UI is built on.
Target: 25 minutes.
No tests (PRD section 0); verify by running the app and hitting the API.

## Where to work and when to start

The repo is `/Users/pakmangames/repos/soliciation-browser`.
The scaffold (WS0) is being built right now and will be pushed as branch `ws0-scaffold`.

1. Start immediately: read the PRD and write `src/server/db/schema.sql` and your query logic.
2. Run `git fetch origin` every 2 minutes.
   As soon as `origin/main` has a `package.json`, create branch `ws2-storage-api` from it; if only `origin/ws0-scaffold` exists, branch from that and rebase onto main once it merges.
3. Never create your own `package.json` or Next.js app.

## Decisions already made

- Driver: `postgres` (postgres.js), plain SQL, no ORM.
- Postgres 17 runs from the scaffold's `docker-compose.yml`, with `DATABASE_URL` from `.env` (see `.env.example`).
- Search: a generated lowercase `haystack` column (solicitation number, NSN, part number, nomenclature) with a `pg_trgm` GIN index.
  Split `q` on whitespace; every term must appear as a substring.
  Strip dashes from terms that look like NSNs.

## Deliverables

1. `src/server/db/schema.sql`: idempotent (`CREATE ... IF NOT EXISTS`).
   - Table `solicitations` mirroring the `Solicitation` contract in `src/lib/solicitation.ts`: `id` primary key, `date` columns for dates, `timestamptz` for `fetched_at`, `jsonb` for `extra`.
   - Generated column `office` = first 6 characters of the solicitation number.
   - Generated `haystack` column with the trigram index, plus btree indexes on `return_by_date`, `issue_date`, `fsc`.
2. `src/server/db/client.ts`: one postgres.js client, cached on `globalThis` so Next.js dev reloads do not leak connections.
3. `src/server/db/solicitations.ts`:
   - `upsertSolicitations(rows: Solicitation[]): Promise<number>`: batched `INSERT ... ON CONFLICT (id) DO UPDATE`.
   - `querySolicitations(query: SolicitationQuery): Promise<SolicitationPage>`: same semantics as the WS0 stub in `src/server/stub/fixture-query.ts`, which is the reference behavior.
     - All filters in the query contract, with `dueWithinDays` and `includeExpired` relative to `current_date`.
     - Sorting with nulls last, then pagination; total count.
     - Facets for `fsc`, `setAside`, `office`, where each field's counts apply every active filter except its own.
       Run the facet queries in parallel with the page query.
     - `lastSyncedAt` = max `fetched_at`.
   - Pitfall: postgres.js returns `date` columns as JS `Date` objects, which shift by timezone.
     Return dates as `YYYY-MM-DD` strings (cast to text in SQL) so rows match the contract exactly.
   - Build the dynamic `WHERE` with postgres.js fragments, never string concatenation of user input.
4. `src/app/api/solicitations/route.ts`: swap the stub for `querySolicitations`, keeping the route a few lines long.
   Return a `503` with a clear message if the database is unreachable, so the UI can show its error state.
   Delete `src/server/stub/` once nothing imports it.
5. Scripts (run with `tsx`) and `package.json` entries:
   - `pnpm db:migrate`: runs `schema.sql`.
   - `pnpm db:load`: upserts `data/fixtures/solicitations.sample.json` plus every `data/raw/*.json` (the WS1 CLI output, either a `Solicitation[]` or an object with a `solicitations` array) and prints counts.
6. `POST /api/refresh` in `src/app/api/refresh/route.ts`: ingests today's issue date with WS1's `fetchSolicitationsIssuedOn` from `src/server/dibbs`, upserts, and returns `{ inserted, errors }`.
   Only do this if WS1's module is on `origin/main` by the time everything above works; otherwise skip it and say so in your report.

## Boundaries

You own `src/server/db/**`, `scripts/db-*.ts`, and `src/app/api/**`.
In `package.json`, only add your dependencies and `db:*` scripts.
Do not touch UI components, `src/lib/*` contracts, or `src/server/dibbs/**`.
If a contract looks wrong, tell the user instead of changing it.

## Definition of done

- `docker compose up -d && pnpm db:migrate && pnpm db:load` works on a fresh database.
- `curl 'localhost:3000/api/solicitations?q=screw&fsc=5305&sort=quantity&dir=desc'` returns the same shape as the stub, with sensible facets.
- The page in the browser works exactly as it did with the stub.
- `pnpm lint && pnpm typecheck` pass.
- Small conventional commits on `ws2-storage-api`, rebased onto `origin/main`, branch pushed.

## Final report to the user

- Branch name and that it is ready to merge.
- Exact commands to get from an empty database to a working app.
- Query time for a typical filtered request, and anything WS3 or WS4 should know.
