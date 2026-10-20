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

`.env.local` is gitignored; keys go there, never in `.env.example`.

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `supabase status`, "Publishable" (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | `supabase status`, "Secret" (`sb_secret_…`), not the S3 secret key. Server only: it bypasses RLS, so it must never get a `NEXT_PUBLIC_` prefix |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

| Local service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Studio | http://127.0.0.1:55323 |
| Mailpit (sign-in codes) | http://127.0.0.1:55324 |

## Tests

- `pnpm test`: Vitest unit tests for the pure logic (anchors, folding threads into main, side-question rendering).
- `pnpm test:smoke`: end to end against the local stack (sign in through Mailpit, chat, thread, fold). Needs `pnpm db:start` and `pnpm dev`; calls Claude, so it is opt-in.

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
