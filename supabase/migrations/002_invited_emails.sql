-- ============================================
-- Invited Emails - Only invited users can sign in
-- ============================================

-- Table to track which emails are allowed to sign in
create table public.invited_emails (
  email text primary key,
  name text not null default '',
  invited_at timestamptz not null default now()
);

alter table public.invited_emails enable row level security;

-- Anyone can check if an email is invited (needed for login page check)
-- Using anon role so the check works before authentication
create policy "Anyone can check invited emails"
  on public.invited_emails for select
  to anon, authenticated
  using (true);

-- Only admins can manage invites
create policy "Admins can insert invites"
  on public.invited_emails for insert
  to authenticated
  with check (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete invites"
  on public.invited_emails for delete
  to authenticated
  using (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

-- Seed: add any existing player emails to the invited list
-- so current players aren't locked out
insert into public.invited_emails (email, name)
select email, name from public.players
on conflict (email) do nothing;

-- ============================================
-- Update the handle_new_user trigger
-- Only create a player record if the email was invited
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  invited_name text;
begin
  -- Check if this email was invited
  select name into invited_name
  from public.invited_emails
  where email = new.email;

  -- Only create a player if they were invited
  if invited_name is not null then
    insert into public.players (id, email, name)
    values (
      new.id,
      new.email,
      case when invited_name = '' then split_part(new.email, '@', 1) else invited_name end
    );
  end if;

  return new;
end;
$$;
