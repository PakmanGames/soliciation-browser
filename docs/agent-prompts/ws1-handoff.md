# Handoff: your DIBBS exploration is now workstream WS1 (ingestion)

Pause what you are doing and read this before your next step.
The project now has a plan, and the DIBBS work you have been doing in the browser is the recon phase of one workstream in it.
Several other agents will build storage, API, and UI in parallel against the contracts in your brief, so your output has to match them exactly.

## Read first

1. The PRD: `docs/PRD.md` on `origin/main` (run `git fetch origin` first).
   It covers the product, architecture, workstreams, and file ownership.
   You are WS1.
2. Your full brief is appended below this section, and also lives at `docs/agent-prompts/ws1-ingestion.md`.
   It is authoritative wherever it conflicts with what you were doing before.

The lead owns the PRD.
Never edit it, and re-fetch it if the user says it changed.

Stack: Next.js, TypeScript, PostgreSQL.
You do not touch the database or the UI.

## How to fold in what you already have

1. Stop broad exploration.
   First write what you have already learned into `docs/dibbs-data-source.md`: URLs, the consent flow, request and response shapes you saw in the network panel, form fields, how pagination works, which fields each page exposes, any bulk download files, and how deep links behave.
   That is the recon deliverable, and it is cheap because you already know it.
2. The browser is for recon and verification, not the pipeline.
   The app has to ingest on its own from a CLI and a refresh endpoint, with no human browser in the loop.
   Turn what you saw in the network panel into plain HTTP requests from Node.
   Use Playwright only as a documented fallback if plain HTTP is truly blocked.
3. If you have already captured data, reuse it to hit Milestone 1 fast.
   Convert it into the `Solicitation` contract as `data/fixtures/solicitations.sample.json` (100 to 300 rows, at least 2 issue dates).
   Save raw page HTML you have already seen as parser fixtures under `src/server/dibbs/__fixtures__/`.
4. Use your browser access for the deep-link check in the brief.
   From a session with no DIBBS cookies (for example an incognito window), confirm that the `dibbsUrl` format lands on the right record after the consent page.
5. Then continue with Milestone 2 as the brief describes.

## Rules for the browser

You are in the user's real browser.
Stay read-only: never log in, submit a quote, or change anything on DIBBS beyond accepting the public consent banner.

## Where to work

The repo is `/Users/pakmangames/repos/soliciation-browser` (main branch).
Work on a branch named `ws1-ingestion` in your own git worktree of that repo, not on main and not in the lead's worktree.
If your scratch work so far lives outside the repo, bring over only what is useful.

## Before you continue

Reply to the user with a short status, at most 5 lines:

- What you have learned so far.
- Which source you plan to use (bulk files, search-result HTML, or detail pages) and why.
- Your ETA for the Milestone 1 commit.

Then proceed without waiting.

---

