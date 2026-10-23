# Production rollout

PR #17 adds a database migration and requires a trusted CA for hosted Supabase connections. Complete the prerequisites below before merging/deploying. PR #18's Next.js upgrade, headers, and thread validation are already included through the rebase onto main. This PR does not change hosted configuration or production records.

## Before deploying

1. **Isolate previews.** Create a separate Supabase project, apply the migrations, and create its private `materials` bucket. In Vercel, remove Preview from the production environment entries and add preview-specific values. Keep deployment protection enabled. Preview builds deliberately fail if their Supabase URL or database URL identifies production project `zlncroyozoixgobiwuxg`.
2. **Configure verified TLS.** In each Supabase project's Database Settings → SSL configuration, download the CA certificate. Paste the entire PEM, including `BEGIN CERTIFICATE` and `END CERTIFICATE`, into Vercel's server-only `DATABASE_SSL_CA` variable for that environment. Multiline PEM and literal `\n` escapes both work. It is a public CA certificate, not a private key. Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0` or disable certificate verification.
3. **Apply the migration before the app.** With the intended Supabase project linked, review `pnpm exec supabase db push --linked --dry-run`, then run `pnpm exec supabase db push --linked`. This adds `20261023032947_ai_usage_limits.sql`: an RLS-enabled `ai_usage` table. Confirm the linked project is the intended target. Old application code can run while the new table exists; new code requires it.
4. **Deploy and verify.** Check CI and the isolated preview, then merge. Verify signup, login, plan creation, chat, a side thread, a small PDF/Markdown upload, and a quota rejection. Inspect runtime logs as well as HTTP status: streaming failures can return HTTP 200.

The read-only hosted connection check passed with Supabase's CA and both certificate/hostname verification enabled. The application never downloads a certificate at runtime. Without `DATABASE_SSL_CA`, remote connections still require verified TLS against Node's trust store; this project's current pooler needs the Supabase CA.

## Vercel environment matrix

| Variable | Production | Preview |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project URL | Separate preview project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production publishable key | Preview publishable key |
| `SUPABASE_SECRET_KEY` | Production `sb_secret_…` key | Preview project's secret key |
| `DATABASE_URL` | Production transaction pooler, port 6543 | Preview transaction pooler, port 6543 |
| `DATABASE_SSL_CA` | PEM downloaded from Database Settings | CA for the preview database |
| `ANTHROPIC_API_KEY` | Production provider key | Separate key/workspace and budget |
| `TAVILY_API_KEY` | Optional production search key | Separate key/budget, or omit |
| `ANTHROPIC_MODEL` | Optional default model | Optional default model |
| `AI_REQUESTS_PER_MINUTE` | Default 10 per learner | Tune independently |
| `AI_REQUESTS_PER_DAY` | Default 100 per learner | Tune independently |
| `AI_REQUESTS_GLOBAL_PER_DAY` | Default 1,000 across the app | Tune independently |

Only the two `NEXT_PUBLIC_SUPABASE_*` values belong in the browser. Keep private keys as sensitive variables. `RESEND_API_KEY` is used for Supabase SMTP configuration, not by the Vercel app. Never copy production `.env.remote` into a preview checkout.

The build guard detects the known production project in the URLs; it cannot determine which project an opaque secret key belongs to. Verify all preview credentials belong to the preview project. Update `lib/config/deployment.ts` if the production project changes. Environment changes require a new deployment, including public variables baked into browser assets.

## Usage and database behavior

- Every chat turn, side-thread turn, plan draft, and scanned-PDF transcription reserves one request before paid work. A chat reservation covers its title generation and at most four model steps. Text-only PDF extraction does not consume AI allowance. Retries and failed provider requests count; rejected reservations roll back all counters.
- Minute/day windows use UTC. Limits persist in Postgres across Vercel instances and deployments. Concurrent reservations are atomic. Chat/thread/upload quota responses use HTTP 429 plus `Retry-After`; plan drafting returns a user-facing error.
- Output is capped at 4,096 tokens per tutor/plan/quiz model call, 128 for titles, and 8,192 for scanned-PDF transcription. Truncated transcriptions are refused instead of saving incomplete material.
- These are request budgets, **not dollar caps**: input length, tool steps, provider retries and model choice affect cost. Set provider spending limits and alerts. Decide whether open signup is appropriate; the global budget also limits aggregate usage across new accounts.
- Limits must be positive integers up to 1,000,000. Invalid configuration and database failures fail closed. Set larger limits explicitly for repeated local smoke runs (CI does this); mock mode does not bypass the limiter.
- Remote Postgres connections verify TLS, use transaction-pooler-compatible `prepare: false`, and open at most three connections per process with a 20-second idle timeout. Other SQL tools need their own CA/TLS configuration.
- Old usage windows do not affect new ones. For retention, periodically delete rows older than seven days: `delete from public.ai_usage where window_start < now() - interval '7 days';`. Do not delete current windows to reset a production budget inadvertently. User-specific counters cascade when their profile is deleted; shared daily counters remain.
- New uploads are limited to 4 MiB in both client and server checks to leave multipart overhead below Vercel's 4.5 MB request limit. Existing stored files are unaffected; the bucket's larger storage limit need not change.

## Remaining owner settings

- [ ] After all SQL clients use verified TLS, enable Supabase SSL enforcement. It can restart the database briefly; schedule the change. [Supabase SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement).
- [ ] Set Auth Site URL to `https://www.funlern.io`. Allow `/auth/confirm` on `www.funlern.io`, `funlern.io`, and `funlern.vercel.app` if all remain supported. The production override in `supabase/config.toml` now records these values; review the config diff before pushing. Give previews their own auth URLs and templates.
- [ ] Verify Resend's sender domain and delivery from `no-reply@funlern.io`. Keep email confirmation required; set suitable signup/email limits for the intended audience.
- [ ] Enable GitHub Dependabot alerts and security updates. The repository now has weekly npm and GitHub Actions update configuration; that file does not enable the dashboard security switches. Keep secret scanning and push protection enabled.
- [ ] Restrict local secret files with `chmod 600 .env.local .env.remote`; check shell history, copied files, and shared logs for accidental exposure. Rotate keys that were actually exposed. No production-key leak was found in the audit's Git history or browser assets.
- [ ] Consider a separate least-privilege app database role, with migration credentials kept outside Vercel. Current application connections bypass RLS, so server-side ownership checks remain required. Changing roles requires a separate grant/permission review and deployment verification.

## Validation

Unit tests cover TLS configuration, preview isolation, limit windows/configuration, plan quota rejection, and client upload limits. Database regression tests run in a disposable local schema (`TEST_DATABASE_URL` rejects remote hosts): foreign message-ID collisions, atomic rollback, legitimate retries, concurrent usage reservations, global/personal budgets, and day boundaries. The smoke suite covers authenticated app flows and exhausted quotas for chat, threads, and scanned uploads. No test uses hosted data or paid AI calls.
