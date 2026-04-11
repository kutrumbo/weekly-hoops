-- ============================================
-- Weekly Hoops - Database Schema
-- ============================================

-- 1. Players table (extends Supabase auth.users)
create table public.players (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  name text not null default '',
  auto_in boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Games table
create table public.games (
  id uuid default gen_random_uuid() primary key,
  game_date timestamptz not null,
  status text not null default 'open' check (status in ('open', 'locked', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 3. Attendance table
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references public.players(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('in', 'out', 'pending')),
  note text default '',
  updated_at timestamptz not null default now(),
  unique(player_id, game_id)
);

-- 4. App settings table (key-value)
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Insert default settings
insert into app_settings (key, value) values
  ('game_day', 'Wednesday'),
  ('game_time', '19:00'),
  ('game_location', '');

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.attendance enable row level security;
alter table public.app_settings enable row level security;

-- Players: everyone can read, only self can update own row, admins can do anything
create policy "Players are viewable by authenticated users"
  on public.players for select
  to authenticated
  using (true);

create policy "Players can update own record"
  on public.players for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can insert players"
  on public.players for insert
  to authenticated
  with check (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
    or id = auth.uid()
  );

create policy "Admins can update any player"
  on public.players for update
  to authenticated
  using (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete players"
  on public.players for delete
  to authenticated
  using (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

-- Games: everyone can read, admins can create/update/delete
create policy "Games are viewable by authenticated users"
  on public.games for select
  to authenticated
  using (true);

create policy "Admins can create games"
  on public.games for insert
  to authenticated
  with check (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update games"
  on public.games for update
  to authenticated
  using (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete games"
  on public.games for delete
  to authenticated
  using (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

-- Attendance: everyone can read, players can update own attendance
create policy "Attendance is viewable by authenticated users"
  on public.attendance for select
  to authenticated
  using (true);

create policy "Players can update own attendance"
  on public.attendance for update
  to authenticated
  using (player_id = auth.uid());

create policy "System or admins can insert attendance"
  on public.attendance for insert
  to authenticated
  with check (
    player_id = auth.uid()
    or exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

-- App settings: everyone can read, admins can update
create policy "Settings are viewable by authenticated users"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "Admins can update settings"
  on public.app_settings for update
  to authenticated
  using (
    exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

-- ============================================
-- Function: Auto-create player profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.players (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Function: Auto-populate attendance for auto_in players
-- ============================================

create or replace function public.create_attendance_for_new_game()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Create 'in' records for auto_in players
  insert into public.attendance (player_id, game_id, status)
  select p.id, new.id, 'in'
  from public.players p
  where p.auto_in = true;

  -- Create 'pending' records for non-auto_in players
  insert into public.attendance (player_id, game_id, status)
  select p.id, new.id, 'pending'
  from public.players p
  where p.auto_in = false;

  return new;
end;
$$;

create trigger on_game_created
  after insert on public.games
  for each row execute function public.create_attendance_for_new_game();
