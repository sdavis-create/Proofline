@AGENTS.md

# Proofline

Multi-platform listing tool for print-on-demand sellers. The full roadmap is in
`PROOFLINE_BUILD_PLAN.md`: read it at the start of each session. Work one phase at a
time. Propose a plan before writing code and wait for approval.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui (base-nova,
Base UI primitives) · Supabase (Postgres, Auth, Storage) · Vitest · deployed on Vercel.

## Commands

- `npm run dev`: local dev server at http://localhost:3000
- `npm run check`: lint + typecheck + format check + tests (the same checks CI runs,
  minus the build)
- `npm test`: Vitest, single run
- `npm run format`: apply Prettier formatting

On this Windows machine the shell PATH may not include Node yet. If `node` isn't
found, prepend `C:\Program Files\nodejs`.

## Non-negotiable rules

1. Never auto-submit on third-party platforms. The user always clicks publish.
2. No headless browser automation of customer accounts.
3. Secrets live only in env vars. Never commit keys. Only `NEXT_PUBLIC_*` values may
   reach the browser or extension, and no secret key ever gets that prefix.
4. All AI calls go through the server, with usage logged and caps enforced.
5. RLS on every user-owned table (and Storage bucket), tested with two accounts.
6. Validate AI output in code against platform rules and the risk list, every time.
7. Private image storage with signed URLs.

## Conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- Server logic goes in `app/api/*` route handlers or server actions. Shared logic goes in
  `lib/`. Server-only modules start with `import "server-only"`.
- Supabase clients: `@/lib/supabase/server` (server) and `@/lib/supabase/client`
  (browser). Create one per request on the server. Generate DB types from the schema
  into `lib/database.types.ts` once tables exist.
- Platform rules (title/tag limits) live in the database, not in code.
- Every new feature gets at least one test for its core logic (validation, limits,
  risk checks). Tests sit next to the code as `*.test.ts`.
- Small commits with clear messages. One phase per branch, merged when its "Done when"
  items pass.
- Ask before adding a new paid service or major dependency.
- Use shadcn/ui components (`npx shadcn@latest add <name>`). No one-off styling
  systems. Don't hand-edit `components/ui/*` unless necessary.
- Claude model string comes from the `ANTHROPIC_MODEL` env var (default
  `claude-sonnet-5-5`).
