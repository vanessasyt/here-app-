-- Fix 5: lock down who can read and (especially) WRITE each table.
--
-- THE PROBLEM
-- The app talks straight to the database with the public anon key — there is no
-- server in between — so Row Level Security is the ONLY thing stopping a user
-- from acting as someone else. Write access in particular was never verified.
-- Without correct policies, a logged-in user could:
--   * accept/decline a meet request they aren't part of,
--   * insert a `messages` row with someone else's `sender_id` (impersonation),
--   * insert a `meet_again` row for another user to force a chat to unlock,
--   * read messages for conversations they aren't in.
-- Any of these break the core "both people must agree, privately" promise.
--
-- THE FIX
-- Establish a known-good policy set: enable RLS on every table, DROP all existing
-- policies (Postgres OR-combines permissive policies, so leaving an old broad one
-- in place would silently defeat these), then create tight policies where every
-- write is gated by auth.uid() and every read is limited to rows you participate
-- in. The allowances below exactly match what the app actually does.
--
-- ⚠️ This REPLACES all current policies on these tables. Review the list, then run
-- it in the Supabase SQL editor. After applying, run the verification checklist in
-- the PR description.

-- 1) Enable RLS everywhere (no-op if already on).
alter table public.profiles       enable row level security;
alter table public.meet_requests  enable row level security;
alter table public.messages       enable row level security;
alter table public.meet_again     enable row level security;
alter table public.blocked_users  enable row level security;
alter table public.reports        enable row level security;

-- 2) Drop every existing policy on these tables for a clean slate.
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','meet_requests','messages','meet_again','blocked_users','reports')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3) PROFILES ---------------------------------------------------------------
-- Read: any logged-in user (column exposure is limited separately by the
--       column GRANTs in the "restrict profile columns" migration / Fix 4).
-- Write: only your own row.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 4) MEET_REQUESTS ---------------------------------------------------------
-- Read/update: only the two people involved. Insert: only as the sender.
create policy "meet_requests_select_party" on public.meet_requests
  for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy "meet_requests_insert_sender" on public.meet_requests
  for insert to authenticated
  with check (from_id = auth.uid());
create policy "meet_requests_update_party" on public.meet_requests
  for update to authenticated
  using (from_id = auth.uid() or to_id = auth.uid())
  with check (from_id = auth.uid() or to_id = auth.uid());

-- 5) MESSAGES --------------------------------------------------------------
-- Read: only messages in a conversation you belong to.
-- Insert: only as yourself, and only into a conversation you belong to.
create policy "messages_select_party" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.meet_requests r
    where r.id = messages.request_id
      and (r.from_id = auth.uid() or r.to_id = auth.uid())
  ));
create policy "messages_insert_self" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.meet_requests r
      where r.id = request_id
        and (r.from_id = auth.uid() or r.to_id = auth.uid())
    )
  );

-- 6) MEET_AGAIN ------------------------------------------------------------
-- Read: rows for requests you're part of (needed to detect a mutual "yes").
-- Insert/update: only your own row (FollowUpScreen upserts on (user_id,request_id)).
create policy "meet_again_select_party" on public.meet_again
  for select to authenticated
  using (exists (
    select 1 from public.meet_requests r
    where r.id = meet_again.request_id
      and (r.from_id = auth.uid() or r.to_id = auth.uid())
  ));
create policy "meet_again_insert_self" on public.meet_again
  for insert to authenticated with check (user_id = auth.uid());
create policy "meet_again_update_self" on public.meet_again
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 7) BLOCKED_USERS ---------------------------------------------------------
-- Read: rows that involve you. Insert: only as the blocker.
create policy "blocked_users_select_party" on public.blocked_users
  for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());
create policy "blocked_users_insert_self" on public.blocked_users
  for insert to authenticated with check (blocker_id = auth.uid());

-- 8) REPORTS ---------------------------------------------------------------
-- Append-only safety log: insert only as yourself; no client reads (reviewed
-- out-of-band with admin/service-role access).
create policy "reports_insert_self" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
