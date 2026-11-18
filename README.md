# DCCN Quiz Arena

A responsive, individual quiz website for **CSE2251 — Data Communication and Computer Networks**. It contains 10 very simple interactive challenges, one mark each, with a shared leaderboard and an admin Excel marksheet.

## Current status

The frontend is configured with the existing Supabase project in Mumbai, India. The live database already contains the 61-student roster, the 10-question bank, and the quiz tables. The browser configuration uses the project public publishable key. The `quiz-api` Edge Function still needs to be deployed (or updated) and its private `APP_SESSION_SECRET` set before sign-in/submission can work. Vercel deployment is separate and is not included in this ZIP.

## What changed in this version

- Improved the question workspace: clearer question number, topic label, one-mark badge, instruction strip, and dedicated interactive activity panel.
- Better question navigation and mobile layout.
- The ten question titles, instructions, interactions, answer rules, and one-mark scoring have been retained.
- Correct-answer mappings and explanations are now held in the Supabase Edge Function rather than the browser JavaScript. The explanation is returned only after a submission is scored.
- Student roster is seeded into Supabase; it is no longer loaded as a public browser JavaScript file.
- Official attempts are stored centrally, with a PostgreSQL unique partial index enforcing one official submission per roll number.
- `test34` attempts are flagged separately and excluded from the official leaderboard and marksheet.
- Admin dashboard reads shared results, can approve unknown identities, and exports a true `.xlsx` marksheet.

## Project structure

```text
DCCN_Quiz_Arena/
├── index.html
├── styles.css
├── app.js
├── supabase-config.js          # Local fallback; only public config values
├── api/config.js               # Vercel runtime config endpoint
├── vercel.json                 # Vercel headers/config
├── package.json
├── QUESTION_BANK.md
├── HANDOFF.md
├── supabase/
│   ├── config.toml
│   ├── migrations/202611170001_initial_schema.sql
│   ├── seed.sql                # Student names + roll numbers; keep private
│   └── functions/quiz-api/index.ts
└── qa-checks.cjs
```

## Supabase setup

### 1. Create a Supabase project

Create a project in your Supabase organization. Select a nearby region such as Mumbai (`ap-south-1`) for the Bengaluru class. Copy the project URL and the **publishable** API key from Project Settings / API Keys.

### 2. Database status

The existing project already contains the quiz tables and seeded data. The migration and seed files are retained in this source package for reference/rebuilds only. Do not rerun them against the live database without checking the current schema first.

The seed contains only names and roll numbers from the supplied roster. It deliberately does not include the Web Technologies CA marks. Keep this SQL file and any repository containing roster information private; it is ignored by `.gitignore` to reduce the risk of accidentally pushing student details to a public repository.

The schema enables RLS and revokes direct access from `anon` and `authenticated`. Browser users do not query the roster or attempts directly. All database access is performed by the `quiz-api` Edge Function using its server-side service role credential.

### 3. Configure the Edge Function secrets

The function needs these Supabase Edge Function secrets:

- `APP_SESSION_SECRET` — internal server-side HMAC signing secret, at least 32 characters. It is not a student/admin password and is never entered into the website.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — Supabase normally provides these to Edge Functions; verify that they are available in the function environment. If not, add them as server-side Edge Function secrets only.

Generate the internal session-signing secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Save it directly as `APP_SESSION_SECRET` in Supabase Function secrets. Do not paste the generated value into a public chat or commit it to Git.

### 4. Deploy the Edge Function

The function is in `supabase/functions/quiz-api/index.ts`. It has `verify_jwt = false` in `supabase/config.toml` because it validates its own short-lived HMAC session token. The Supabase publishable key is used only as the public project identifier/API key; the function checks the signed session role for protected actions. There are no user-entered access codes or passwords in this password-free version.

Deploy `quiz-api` using the Supabase CLI or the Supabase dashboard's Edge Function deployment workflow. If using the CLI, initialize/link the local Supabase project to the project ref you created, then deploy the function. Use the current Supabase CLI documentation for command syntax; CLI v3 changed how hosted changes are targeted and confirmed.

### 5. Public Supabase configuration

The project URL and publishable key are already filled into `supabase-config.js` and `api/config.js`. These are public values; no service-role key is included in the browser.

These are public browser values. Vercel's `/api/config` function returns only these two values to the website. Never add the Supabase service-role/secret key to Vercel or browser code.

## Vercel deployment

1. Put the project in a **private** Git repository (the `supabase/seed.sql` roster file is intentionally git-ignored; import it manually in Supabase SQL Editor before deployment).
2. Import that repository into Vercel.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as described above.
4. Deploy. Vercel serves the static website and the `/api/config` serverless function.

For local Vercel-compatible development:

```bash
npm run dev
```

This runs `npx vercel dev` and may ask you to log into/link a Vercel project. For a static-only visual preview:

```bash
npm run preview
```

The static preview uses the already configured public values in `supabase-config.js`. Do not add server-side secrets there.

## Sign-in and assessment flow

- Students enter only their roll number. The server looks up the roll number and returns the registered name.
- If the roll number is not found, the student enters a full name; the server creates a pending identity record.
- Entering `admin875` opens the admin dashboard. Entering `test34` opens test mode. Neither account asks for a password.
- The frontend submits responses, but the Edge Function calculates the score and returns the result/review.
- A unique database index permits only one official attempt per roll number. The test account can repeat test attempts because they are flagged `is_test = true`.
- The leaderboard excludes test and pending identities. Equal scores share rank.
- Admin can approve pending identities and export the roster, official scores, pending status, and non-attempted students to Excel.

## Important identity and security trade-off

This version intentionally has **no student access code and no admin/test passwords**, as requested. Students enter only a roll number; unknown roll numbers can enter a name. `admin875` opens the admin dashboard and `test34` opens test mode.

This is convenient, but it is **not secure authentication**:
- Anyone who knows or guesses a student's roll number can start an attempt under that student's identity. The first completed official attempt for a roll number locks that roll number.
- Anyone who knows `admin875` can open the marks dashboard and download the marksheet. The admin identifier is not a password.
- Anyone who knows `test34` can enter test mode. Test submissions remain excluded from official marks and the leaderboard.
- Roll-number lookup can reveal the matching name to anyone who submits that roll number.

Use this password-free mode only if the faculty accepts these risks and supervises the quiz. For real internal marks, an admin password or Supabase Auth account and a student identity check (college-email OTP or individual PIN) are strongly recommended. The internal `APP_SESSION_SECRET` is still required to sign short-lived server sessions; it is a backend configuration secret, not a user password or access code.

## Production-readiness notes

- Because there are no user-entered credentials, roll-number impersonation and public access to `admin875` are possible. Do not use this mode for unsupervised official marks unless the faculty accepts that risk.
- The Edge Function currently uses a 4-hour HMAC session. Sessions are signed and expire, but they are not individually revocable before expiry. Revoke/shorten sessions if the faculty needs stricter session control.
- The Edge Function CORS policy is currently permissive (`*`). Once the final Vercel domain is known, restrict allowed origins to the deployed domain and any approved preview domain.
- No browser end-to-end test, live Supabase integration test, or Vercel deployment has been completed because there is no Supabase project yet.

## Validation

Run:

```bash
node --check app.js
node --check api/config.js
node qa-checks.cjs
```

The QA script checks the 61 seeded roster records, the five manually added students, the shortest route answer (A → C → F, cost 8, 2 hops), absence of the client-side answer mappings, and required Supabase/Vercel scaffolding.

A live database test, Edge Function deployment test, and browser end-to-end assessment test still require a Supabase project and credentials. Do not treat this package as ready for official marks until those tests pass.


## Connected project values

- Supabase project ref: `wyrasydffupqywehdnze`
- Project URL: `https://wyrasydffupqywehdnze.supabase.co`
- Browser key: publishable key (safe to expose; restricted by RLS)
- Live database: 61 roster records and 10 quiz question rows verified.

## Remaining setup before the quiz works

1. In Supabase Dashboard → Edge Functions → Secrets, add `APP_SESSION_SECRET` with a random value of at least 32 characters.
2. From this folder, run `supabase link --project-ref wyrasydffupqywehdnze` if not already linked, then `supabase functions deploy quiz-api`.
3. Deploy this folder to Vercel (import the repository or run `npx vercel --prod`).

**Security note:** This password-free build deliberately treats `admin875` as the admin selector, as requested. Anyone who knows it can access the admin dashboard and marks export. Student roll-number-only entry also allows impersonation. Use supervised assessment only.
