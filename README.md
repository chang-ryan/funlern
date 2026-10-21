# funlern

Chat UI where you highlight part of an assistant answer and ask about it in a side thread. Each thread forks the conversation context at that point.

## Stack

Next.js (App Router) · Tailwind v4 · Vercel AI SDK · Supabase (auth via email OTP/magic link, Postgres) · Drizzle · `@antfu/eslint-config`

## Setup

Needs Docker running (`supabase start` runs Postgres, Auth, Studio and Mailpit in containers).

```bash
pnpm install
cp .env.example .env.local   # then fill in the keys below
pnpm db:start                # local Supabase on ports 553xx; applies supabase/migrations
pnpm dev
```

`.env.local` is gitignored; keys go there, never in `.env.example`. Plan material lives in the private `materials` Storage bucket, defined in `supabase/config.toml`; if a running stack predates it, `supabase seed buckets --local` creates it.

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `supabase status`, "Publishable" (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | `supabase status`, "Secret" (`sb_secret_…`), not the S3 secret key. Server only: it bypasses RLS, so it must never get a `NEXT_PUBLIC_` prefix |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `TAVILY_API_KEY` | tavily.com (free tier: 1,000 searches a month). Optional: without it the tutor is told search isn't set up |

| Local service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Studio | http://127.0.0.1:55323 |
| Mailpit (sign-in codes) | http://127.0.0.1:55324 |

## Tests

- `pnpm test`: Vitest unit tests for the pure logic, plus snapshots of every prompt and tool definition (they're the cached prefix, so a change must be on purpose: `pnpm test -u`).
- `pnpm test:smoke`: end to end against the local stack with a scripted model, so it checks what the server sends, saves and puts in context without calling Claude (a few seconds). Run `pnpm db:start` and `pnpm dev:mock` (port 3100) first. The scripted model is in `lib/ai/mock-model.ts`; a learner message can ask it to echo its whole request (`[mock:echo]`) or call a tool (`[mock:tool update_doc {...}]`).
- `pnpm test:evals`: a few live checks with real Claude that only a model can pass: does the tutor use its brief, folded edits and material, and call its tools from plain language. Run against `pnpm dev` (port 3000, or set `APP_URL`); it costs a little and can flake on wording.

Next allows one dev server per checkout, so stop `pnpm dev` before `pnpm dev:mock` in the same folder.

## Database changes

Drizzle owns the schema; the Supabase CLI applies migrations.

1. Edit `lib/db/schema.ts`. Column names come from `casing: 'snake_case'`, so `displayName: text()` is `display_name`.
2. `pnpm db:generate <scope>` writes `supabase/migrations/<timestamp>_<scope>.sql`. Keep one migration per task. Hand-written SQL (functions, triggers) goes in the same file.
3. `pnpm db:check` runs `drizzle-kit check` (snapshots consistent) and squawk (no locking or unsafe changes).
4. `pnpm db:migrate` applies it locally (`pnpm db:reset` rebuilds from scratch).
5. `pnpm db:push` applies pending migrations to the linked hosted project.

Never edit a migration that has been applied anywhere; add a new one.

Hosted connection values live in `.env.remote` (gitignored). Auth settings and the email template live in `supabase/config.toml`; push them with `supabase config push`.

## Layout

- `proxy.ts`: refreshes the Supabase session and redirects signed-out users to `/login`.
- `lib/supabase/`: server and browser clients. `getUserId()` is the authz check for routes and actions.
- `lib/db/schema.ts`: `profiles`, `conversations`, `messages`, `threads`, `thread_messages`.
- `lib/ai/`: `model.ts` (Claude), `prompts/`, `tools/`, `cache.ts`.

Drizzle connects as the database owner and bypasses RLS, so every query must filter by user id.
