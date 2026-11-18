# Supabase setup files

The connected Supabase project is `wyrasydffupqywehdnze` (Mumbai). The roster, quiz tables and 10 question records are already present. Do not re-run `seed.sql` unless intentionally rebuilding the database.
1. Add `APP_SESSION_SECRET` (random, at least 32 characters) in Supabase Dashboard → Edge Functions → Secrets.
2. Link with `supabase link --project-ref wyrasydffupqywehdnze`.
3. Deploy with `supabase functions deploy quiz-api`.

The public `roster`, `pending_students`, and `attempts` tables have RLS enabled and deny direct `anon`/`authenticated` access. Only the Edge Function's server-side service role should query or mutate them.

`quiz-api` verifies custom HMAC-signed short-lived application sessions. The function has `verify_jwt = false` because the public browser uses a publishable key, not a Supabase Auth user JWT. The function still checks its own signed student/test/admin session for protected actions. There are no user-entered student access codes or account passwords in this mode. The special account IDs themselves select their roles, so anyone who knows `admin875` can access admin functions. Keep the internal HMAC signing secret and never expose the service role key.
