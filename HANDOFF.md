# DCCN Quiz Arena — Development Handoff

## Goal
Build a responsive, individual DCCN quiz site for CSE2251 with ten very simple interactive activities, one mark each, a shared leaderboard, and a secure admin marks export.

## Locked decisions
- Ten questions, exactly one mark each; 10 marks total; no negative marking.
- The existing question text and activity concepts are retained. Do not rewrite the question content unless the user requests it.
- Questions are interactive: diagram selection, classification, OSI layer tap, matching, error classification, Ethernet device selection, Wi-Fi step ordering, packet movement, node-by-node shortest-path routing, and IPv4 octet builder.
- Routing is direct node selection on the topology. The route A → C → F has total cost 8 and 2 hops. A → B → D → F also costs 8 but takes 3 hops, so fewer hops breaks the tie.
- Student enters only a roll number; known student name is looked up automatically. Unknown roll numbers can enter a name and are pending admin verification.
- Password-free special accounts: entering `admin875` opens admin; entering `test34` opens testing. No user-entered access code or password is requested.
- `test34` attempts are always flagged as test and excluded from official marks, leaderboard, and export.
- Leaderboard ranks only by marks; ties share rank.
- Admin can approve pending identities and download `.xlsx` marks, including students with no attempt.

## Source material and roster
- Source of question content: seven PDFs in `Theory.zip` (Modules 1.1, 1.2, 2.1, 2.2 Ethernet, 2.3 Wireless LAN, 3.1 and 3.2).
- `QUESTION_BANK.md` documents the ten questions, answer criteria and slide references.
- `supabase/seed.sql` contains 61 unique student names and roll numbers: 56 spreadsheet records + five user-provided records. No CA marks were imported.
- The five manual records: Naveen Kumar NL (20261LCS3032), Raghavendra B (20261LCS3036), Jagan N (20261LCS3028), Bharath BS (20261LCS3033), Aditya (20261LCS3035).
- `supabase/seed.sql` contains student data and is ignored by Git; keep it out of public repositories.

## Current implementation (v0.3.2 scaffold)
- `index.html`, `styles.css`, `app.js`: responsive frontend and redesigned question workspace.
- `app.js` no longer loads roster data in the browser and no longer includes the question answer mappings. It calls the Supabase Edge Function.
- `supabase/migrations/202611170001_initial_schema.sql`: roster, pending students, attempts, RLS, grants and unique one-official-attempt index.
- `supabase/seed.sql`: 61 roster rows.
- `supabase/functions/quiz-api/index.ts`: lookup, student start, special account login, server-side scoring, submit, leaderboard, admin dashboard data and identity approval.
- `supabase/config.toml`: Edge Function config with `verify_jwt = false` because the Edge Function checks its own HMAC session token.
- `api/config.js`: Vercel serverless endpoint exposing only Supabase URL + publishable key.
- `vercel.json`: security headers and static hosting configuration.

## Critical setup state
**No live Supabase project has been created/linked in the user's connected Supabase account yet.** There are no project credentials in this package. The connected account currently exposes one organization, `tr58561@gmail.com's Org` (`wxqlvazhkkrawhdemlcr`), and no projects. The estimated project creation cost returned by Supabase is $0/month. Ask Tejas to confirm that the project may be created in this organization before using `create_project`.

After project creation:
1. Run the migration SQL in Supabase SQL Editor.
2. Run `supabase/seed.sql` in SQL Editor.
3. Configure `APP_SESSION_SECRET` and verify server-side Supabase environment values. The HMAC secret signs sessions internally; students and special accounts do not enter passwords.
4. Deploy `supabase/functions/quiz-api`.
5. Configure Vercel `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
6. Deploy to Vercel and run real multi-device QA.

## Security notes
- Login rate limiting / brute-force throttling is not implemented yet; add this before official graded use.
- This is intentionally password-free: roll-number impersonation is possible, and anyone who knows `admin875` can reach the admin dashboard.
- HMAC sessions expire after four hours but are not individually revocable before expiry.
- Current Edge Function CORS is permissive (`*`); restrict it to the final Vercel domain after the deployment URL is known.
- Never place the Supabase service-role/secret key in frontend files or Vercel public config.
- The SQL enables RLS and revokes direct browser-role access; all DB operations go through the Edge Function.
- Official attempts are guarded by a partial unique index on `roll_number` for `is_test = false`.
- Score is computed in the Edge Function; answer mappings and post-submit review text are held server-side.
- Password-free mode is intentional. Anyone can impersonate a known roll number and anyone who knows `admin875` can access the admin dashboard. Use supervised assessment only, or restore proper authentication before official internal marks.

## QA performed in this iteration
- `node --check app.js` passed.
- `node --check api/config.js` passed.
- `npm test` passed: 61 unique roster records, manual records present, least-cost/fewest-hop route, no client-side answer mappings, and Vercel/Edge Function scaffold.
- CSS parsed with tinycss2: 344 top-level rules, 0 parse errors.
- Supabase Edge Function TypeScript type-check passed using Deno/Supabase declaration stubs; this is a compile check, not a live function deployment test.
- Live Supabase queries, Edge Function deployment, browser end-to-end test and Vercel deployment remain pending because no Supabase project exists yet.

## Resume instructions
Inspect this file first. Continue from actual state, do not regenerate existing work. Do not silently change the ten questions. Next required action is Supabase project creation in the organization confirmed by the user, then apply schema, seed, secrets, Edge Function deploy, Vercel env/deploy, and multi-device tests. Update this handoff after each step.
