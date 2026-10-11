# funlern

Chat UI where you highlight part of an assistant answer and ask about it in a side thread. Each thread forks the conversation context at that point.

## Stack

Next.js (App Router) · Tailwind v4 · Vercel AI SDK · Supabase (auth via email OTP/magic link, Postgres) · Drizzle · `@antfu/eslint-config`

## Setup

```bash
pnpm install
cp .env.example .env.local   # also copy DATABASE_URL into .env for drizzle-kit
supabase start               # local Supabase; prints URL + publishable key
pnpm db:migrate
pnpm dev
```

Local auth emails go to Mailpit at http://127.0.0.1:54324.

For hosted Supabase, set the Magic Link email template to include `{{ .Token }}` and link to
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (see `supabase/templates/magic_link.html`).

## Layout

- `proxy.ts`: refreshes the Supabase session and redirects signed-out users to `/login`.
- `lib/supabase/`: server and browser clients. `getUserId()` is the authz check for routes and actions.
- `lib/db/schema.ts`: `model_config`, `conversation`, `message`, `thread`, `thread_message`.
- `lib/ai/resolve-model.ts`: builds the user's model (Anthropic, OpenAI, Google, OpenAI-compatible) from an encrypted config.

Drizzle connects as the database owner and bypasses RLS, so every query must filter by user id.
