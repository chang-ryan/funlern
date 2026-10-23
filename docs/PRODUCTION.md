# Production hardening — draft rollout checklist

This work is in progress. Do not merge or deploy until the TLS certificate configuration and remaining validation are complete. No hosted settings have been changed by this PR.

## Intended repo changes

- Scope message conflict updates to their original conversation or thread.
- Verify remote Postgres TLS, with Supabase's CA certificate; keep local loopback connections usable.
- Enforce atomic per-minute, per-user daily, and global daily AI request budgets in Postgres.
- Bound model output and return useful quota errors from every paid entry point.
- Reject preview builds configured with the production Supabase project.
- Cap uploads at 4 MiB, below Vercel's request-body limit including multipart overhead.
- Add Dependabot configuration and regression tests.

## Owner tasks (after implementation is ready)

- [ ] Create a separate Supabase project for previews; apply migrations and create its private materials bucket.
- [ ] Replace Preview-scoped Supabase URL, publishable key, secret key, and database URL in Vercel. Use separate provider keys/budgets for previews. Remove production values from Preview scope.
- [ ] Download the project's CA certificate from Supabase Database Settings. Follow the final TLS configuration instructions added before this PR is ready; current verified-TLS code cannot connect without the CA.
- [ ] Apply `20261023032947_ai_usage_limits.sql` to the target database before deploying code that reserves AI usage. Review the final migration and deployment order first.
- [ ] Review the proposed default AI limits: 10 requests/minute/user, 100/day/user, 1,000/day globally. Request limits are not dollar caps; configure provider spending limits and alerts too.
- [ ] After verifying all clients use TLS, enable Supabase SSL enforcement. This can briefly restart the database; schedule accordingly.
- [ ] Set Supabase Auth Site URL to `https://www.funlern.io`; allow `/auth/confirm` on each supported production hostname. Keep preview auth redirects separate.
- [ ] Enable GitHub Dependabot alerts and security updates. Keep secret scanning and push protection enabled.
- [ ] Restrict local secret files: `chmod 600 .env.local .env.remote`. Check shell history, copied files, and shared logs for accidental key exposure; rotate any key actually exposed.
- [ ] Verify Resend's sender domain and mail delivery, then exercise signup, login, plan creation, chat, and a small upload on the deployed app.

Database-owner access still bypasses RLS. The app must continue enforcing ownership server-side. A restricted app database role is a separate operational rollout, not a claim made by this PR.
