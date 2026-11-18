# Claude continuation instructions

Read `HANDOFF.md` first and inspect the existing files. Continue from the current project state; do not rebuild from scratch.

## Non-negotiable rules
- The ten question titles, instructions, interactions and one-mark rules are already decided. Keep them unchanged unless Tejas asks otherwise.
- Work in small stages; do not attempt the whole backend, hosting and UI review in one response.
- At the end of every stage: run checks, update `HANDOFF.md`, describe completed/incomplete items, and stop for approval.
- Never expose the Supabase service-role key or internal session-signing secret in client files or Git. This build is intentionally password-free: do not reintroduce student access codes or admin/test password prompts unless the user explicitly changes this requirement.
- `supabase/seed.sql` includes student roll numbers and names; keep it private and do not commit it to a public repository.
- Server-side scoring must stay in the Edge Function. Do not reintroduce the correct-answer mapping into `app.js`.

## Stage 0 — inspect only
Inspect frontend, migration, seed, Edge Function and Vercel configuration. Identify missing setup, likely compile errors, and security gaps. Do not deploy or create a new Supabase project without Tejas' approval.

## Stage 1 — validate app presentation
Review all ten question layouts on desktop/mobile. Improve readability and accessibility without changing questions. Test all interaction controls. Do not add speed marks or competitive bonuses.

## Stage 2 — Supabase setup
Once Tejas confirms the organization/project creation:
1. Create/use the Supabase project.
2. Apply `supabase/migrations/202611170001_initial_schema.sql`.
3. Load `supabase/seed.sql`.
4. Configure only the internal Edge Function session-signing secret (`APP_SESSION_SECRET`) and required Supabase server environment values. No user-entered access code or password is used.
5. Deploy the `quiz-api` function.
6. Verify RLS, unique-attempt index and function health. Never move service-role credentials into the browser.

## Stage 3 — backend QA
Before calling the system ready, add and test rate limiting for `lookup` and `special_login`, and restrict Edge Function CORS to the final Vercel domain. Clearly warn that `admin875` alone permits admin access and roll-number-only entry does not authenticate student identity. Review the current HMAC-session revocation limitation and decide whether to shorten session lifetime or move to Supabase Auth.
Test student lookup, unknown student registration, official attempt uniqueness, `test34` repeated testing, admin-only data access, pending approval, equal-score ranks, and Excel export. Ensure test records never enter official results. Verify scoring for every question using known test responses.

## Stage 4 — Vercel
Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel Project Settings. Deploy from a private repository. Confirm `/api/config` returns only those public values. Never set Supabase service-role keys in Vercel/browser config.

## Stage 5 — final readiness
Test on multiple phones/browsers. Verify one official attempt per roll number across devices. Test admin Excel export and missing-attempt rows. Do not call the password-free system secure for official internal marks: roll-number-only entry permits identity impersonation and `admin875` alone opens the admin dashboard. Recommend restoring authenticated admin access and adding college-email OTP or individual student PINs if the faculty needs identity assurance.
