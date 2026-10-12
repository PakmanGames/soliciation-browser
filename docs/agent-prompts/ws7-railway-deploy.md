# Task: WS7 deploy to Railway for the demo

Optional stretch goal: a public demo URL.
The project's time budget is nearly used up, so take the shortest path that works, and stop and report if you hit a wall after about 15 minutes.
Read `README.md`, `CLAUDE.md`, and `docs/PRD.md` section 0 on `origin/main` first.

Target: one Railway project with the Next.js app and a Railway Postgres database, reachable on Railway's default `*.up.railway.app` domain, loaded with real data.

## Where to work

Repo: `/Users/pakmangames/repos/soliciation-browser`.
Use your own git worktree from `origin/main`, on a branch named `ws7-railway-deploy`.
Another agent (WS6) is polishing the app and README at the same time, so keep repo changes minimal and do not touch app code.

## What you have

- The Railway CLI (`railway` 5.x) is installed and already logged in as the user; check with `railway whoami`.
  If it is not, ask the user to run `! railway login` and wait.
- Use the `context7` MCP tools or Railway's docs for current CLI syntax instead of memory.

## Steps

1. `railway init` a new project named `solicitation-browser`, then add a PostgreSQL database service to it.
2. Create the app service and set its variables:
   - `DATABASE_URL` as a reference to the Postgres service's private `DATABASE_URL` (the `${{Postgres.DATABASE_URL}}` reference syntax), so the app talks to the database over Railway's private network.
   - `TZ=America/New_York`.
     The DB client sets the session time zone from the server's zone, and `current_date` drives the due-date filters; Railway containers default to UTC, which would shift "due today" by a day in US evenings.
3. Make the build reproducible with the smallest possible repo change:
   - Pin Node 24 (`"engines": { "node": "24.x" }` in `package.json`).
   - The app uses pnpm via the `packageManager` field (`pnpm@12.10.1`); confirm Railway's builder honors it, and fix only if the build fails.
   - Build `pnpm build`, start `pnpm start` (Next.js reads `PORT`).
   - Add a `railway.json` only if the defaults do not work.
4. Deploy with `railway up` from your worktree, then generate the default public domain with `railway domain`.
5. Load data from your machine through the database's public URL (`DATABASE_PUBLIC_URL` from `railway variables` on the Postgres service):
   - `DATABASE_URL=<public url> pnpm db:migrate`
   - Copy `data/raw/*.json` from the user's main checkout (`/Users/pakmangames/repos/soliciation-browser/data/raw/`) or any agent worktree that has it; if none exists, run `pnpm ingest --days 5` first.
   - `DATABASE_URL=<public url> pnpm db:load`; expect several thousand rows.
   - If the public connection requires SSL, append `?sslmode=require` to the URL.
6. Verify on the public URL in a real browser:
   - The table loads real data, search and filters work, and "Open on DIBBS" links work.
   - `curl https://<domain>/api/solicitations | jq .total` matches the loaded row count.
   - Press Refresh once.
     DIBBS's firewall may block Railway's cloud IPs; if it fails, that is acceptable for the demo because the data is already loaded, but note it.
7. Commit only the deployment config changes on `ws7-railway-deploy` and open a PR against main.
8. Add a "Live demo: <url>" line under the title in `README.md` and push that README-only change straight to main (pull first; WS6 may have edited it).

## Boundaries

Do not change app code, the schema, or other agents' files.
Do not delete or reset anything in Railway beyond what you created.

## Final report to the user

- The public URL, and the row count it serves.
- PR URL for the config changes.
- Whether Refresh works from Railway.
- Anything that did not work and how far you got.
