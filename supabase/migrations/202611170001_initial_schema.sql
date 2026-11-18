-- DCCN Quiz Arena initial schema
-- All exposed tables use RLS and deny direct access to browser roles.
-- Supabase Edge Function uses the service role key server-side only.

create extension if not exists pgcrypto;

create table if not exists public.roster (
  roll_number text primary key,
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  source text not null default 'spreadsheet' check (source in ('spreadsheet', 'manual', 'approved')),
  created_at timestamptz not null default now()
);

create table if not exists public.pending_students (
  roll_number text primary key,
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null,
  student_name text not null,
  marks smallint not null check (marks between 0 and 10),
  total_marks smallint not null default 10 check (total_marks = 10),
  verification_status text not null check (verification_status in ('roster', 'pending', 'verified', 'test')),
  is_test boolean not null default false,
  responses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

-- A roll number can submit only one official attempt. Test attempts are separate and repeatable.
create unique index if not exists attempts_one_official_per_roll
  on public.attempts (roll_number) where is_test = false;
create index if not exists attempts_leaderboard_idx
  on public.attempts (marks desc, submitted_at asc) where is_test = false;
create index if not exists attempts_verification_idx
  on public.attempts (verification_status, submitted_at desc) where is_test = false;

-- Enable RLS and deny direct table access to anon/authenticated.
alter table public.roster enable row level security;
alter table public.pending_students enable row level security;
alter table public.attempts enable row level security;

revoke all on public.roster from anon, authenticated;
revoke all on public.pending_students from anon, authenticated;
revoke all on public.attempts from anon, authenticated;
grant all on public.roster to service_role;
grant all on public.pending_students to service_role;
grant all on public.attempts to service_role;

comment on table public.roster is 'Student roll numbers and names. Access only through the quiz Edge Function.';
comment on table public.pending_students is 'Unlisted roll numbers awaiting faculty verification.';
comment on table public.attempts is 'Submitted quiz attempts. Correct answers and scoring remain server-side.';
