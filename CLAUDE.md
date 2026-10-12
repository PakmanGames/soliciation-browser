# Solicitation Browser

Next.js app that pulls daily DIBBS RFQs and lets a vendor browse, search, and filter them.
Brief: `README.md`. Product, architecture, and contracts: `docs/PRD.md`.

## Commands

- `docker compose up -d --wait` starts Postgres 17 on host port 5433 (copy `.env.example` to `.env`).
- `pnpm dev` runs the app on http://localhost:3000.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` must pass before a merge.
- `pnpm format` runs Prettier (with Tailwind class sorting) over the repo.
- No tests or test runner (PRD section 0): verify changes in a browser.
- Next.js 16 docs ship in `node_modules/next/dist/docs/` (see `AGENTS.md`, which `next dev` maintains).

## Layout

- `src/lib/solicitation.ts`: `Solicitation` data contract.
- `src/lib/query.ts`: `SolicitationQuery` and `SolicitationPage`, plus `parseQuery`/`serializeQuery` for URL params.
- `src/lib/api.ts`: client hooks, `useQueryState()` (URL is the state) and `useSolicitations(query)`.
- `src/app/api/solicitations/route.ts`: `GET` endpoint, currently backed by `src/server/stub/fixture-query.ts`.
- `src/app/page.tsx`: app shell composing the slot components below.
- `src/components/search/**`, `src/components/filters/**`, `src/components/results/**`: UI slots, no props, data via `src/lib/api.ts`.
- `src/components/ui/**`: generated shadcn/ui components.
- `data/fixtures/solicitations.sample.json`: sample data as `Solicitation[]`.

## Rules

- Each workstream owns specific paths: see `docs/PRD.md` section 6.1.
  Only edit paths you own.
- Contract files (`src/lib/solicitation.ts`, `src/lib/query.ts`) change only through the lead.
- Add shadcn components with `pnpm dlx shadcn@latest add <name>`; tell the lead, because it touches shared files.
- Work in your own worktree and branch, keep commits small and conventional, and rebase onto `origin/main`.
