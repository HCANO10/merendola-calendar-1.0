
-- EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- CLEANUP (allows re-running script cleanly)
drop trigger if exists on_merendola_created on merendolas;
drop function if exists handle_new_merendola();
drop function if exists create_team(text);
drop function if exists join_team(text);

-- 1. PROFILES
create table if not exists profiles (
  user_id uuid references auth.users not null primary key,
  display_name text,
  birthday date,
  notification_email text,
  active_team_id uuid, 
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TEAMS
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Hardening: Force invite_code to be UPPERCASE
do $$ begin
  alter table teams add constraint teams_invite_code_upper check (invite_code = upper(invite_code));
exception when duplicate_object then null; end $$;

-- 3. MEMBERSHIPS
create table if not exists memberships (
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references profiles(user_id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (team_id, user_id)
);

-- Circular FK (active_team_id)
do $$ begin
  alter table profiles add constraint fk_active_team foreign key (active_team_id) references teams(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 4. MERENDOLAS
create table if not exists merendolas (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references profiles(user_id) on delete set null,
  date date not null,
  time text,
  title text not null,
  contribution text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists idx_merendolas_team_date on merendolas (team_id, date);

-- 5. ATTENDEES
create table if not exists attendees (
  merendola_id uuid references merendolas(id) on delete cascade not null,
  user_id uuid references profiles(user_id) on delete cascade not null,
  status text default 'pendiente' check (status in ('si', 'no', 'pendiente')),
  responded_at timestamp with time zone,
  primary key (merendola_id, user_id)
);
-- Ensure UNIQUE constraint (redundant with PK but requested for explicit check)
-- "primary key (merendola_id, user_id)" implies strict uniqueness, so 'unique(merendola_id, user_id)' is implicit.
-- We won't add an extra unique index to save space, relying on PK.


-- RLS POLICIES ---------------------------------------------------------------

-- 1. Enable RLS
alter table profiles enable row level security;
alter table teams enable row level security;
alter table memberships enable row level security;
alter table merendolas enable row level security;
alter table attendees enable row level security;

-- 2. PROFILES
create policy "View own profile" on profiles for select using (auth.uid() = user_id);
create policy "Update own profile" on profiles for update using (auth.uid() = user_id);
create policy "Insert own profile" on profiles for insert with check (auth.uid() = user_id);

create policy "View team members profiles" on profiles for select using (
  exists (
    select 1 from memberships m1
    join memberships m2 on m1.team_id = m2.team_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.user_id
  )
);

-- 3. TEAMS
create policy "View own teams" on teams for select using (
  exists (
    select 1 from memberships
    where memberships.team_id = teams.id
    and memberships.user_id = auth.uid()
  )
);

-- 4. MEMBERSHIPS
create policy "View own memberships" on memberships for select using (user_id = auth.uid());
create policy "View team memberships" on memberships for select using (
  exists (
    select 1 from memberships my_m
    where my_m.team_id = memberships.team_id
    and my_m.user_id = auth.uid()
  )
);

-- 5. MERENDOLAS (With Profile Gate)
create policy "View team merendolas" on merendolas for select using (
  exists (
      select 1 from memberships
      where memberships.team_id = merendolas.team_id
      and memberships.user_id = auth.uid()
  )
  AND
  exists (
      select 1 from profiles
      where user_id = auth.uid()
      and birthday is not null 
      and notification_email is not null
  )
);

create policy "Insert team merendolas" on merendolas for insert with check (
  exists (
      select 1 from memberships
      where memberships.team_id = merendolas.team_id
      and memberships.user_id = auth.uid()
  )
  AND
  exists (
      select 1 from profiles
      where user_id = auth.uid()
      and birthday is not null 
      and notification_email is not null
  )
);

create policy "Update own merendolas" on merendolas for update using (user_id = auth.uid());
create policy "Delete own merendolas" on merendolas for delete using (user_id = auth.uid());

-- 6. ATTENDEES (With Profile Gate)
create policy "View team attendees" on attendees for select using (
  exists (
    select 1 from merendolas
    join memberships on memberships.team_id = merendolas.team_id
    where merendolas.id = attendees.merendola_id
    and memberships.user_id = auth.uid()
  )
  AND
  exists (
      select 1 from profiles
      where user_id = auth.uid()
      and birthday is not null 
      and notification_email is not null
  )
);

create policy "Update own status" on attendees for update using (
  user_id = auth.uid()
  AND
  exists (
      select 1 from profiles
      where user_id = auth.uid()
      and birthday is not null 
      and notification_email is not null
  )
) with check (
  user_id = auth.uid()
);


-- RPC FUNCTIONS (Hardened) ---------------------------------------------------

-- CREATE TEAM
create or replace function create_team(team_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team_id uuid;
  new_code text;
begin
  if length(team_name) < 3 then
    raise exception 'El nombre del equipo debe tener al menos 3 caracteres.';
  end if;

  new_code := upper(substring(team_name from 1 for 3)) || '-' || floor(random() * 8999 + 1000)::text;
  
  insert into teams (name, invite_code)
  values (team_name, new_code)
  returning id into new_team_id;

  insert into memberships (team_id, user_id, role)
  values (new_team_id, auth.uid(), 'admin');

  update profiles set active_team_id = new_team_id where user_id = auth.uid();

  return new_team_id;
end;
$$;
revoke all on function create_team(text) from public;
grant execute on function create_team(text) to authenticated;


-- JOIN TEAM (Normalized Input)
create or replace function join_team(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_team_id uuid;
  normalized_code text;
begin
  -- Normalize: Remove spaces and convert to UPPER
  normalized_code := upper(trim(invite_code_input));

  select id into target_team_id from teams where invite_code = normalized_code limit 1;

  if target_team_id is null then
    raise exception 'Código de invitación inválido.';
  end if;

  if exists (select 1 from memberships where team_id = target_team_id and user_id = auth.uid()) then
     update profiles set active_team_id = target_team_id where user_id = auth.uid();
     return target_team_id;
  end if;

  insert into memberships (team_id, user_id, role)
  values (target_team_id, auth.uid(), 'member');

  update profiles set active_team_id = target_team_id where user_id = auth.uid();

  return target_team_id;
end;
$$;
revoke all on function join_team(text) from public;
grant execute on function join_team(text) to authenticated;


-- TRIGGERS (Hardened) --------------------------------------------------------

create or replace function handle_new_merendola()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into attendees (merendola_id, user_id, status)
  select new.id, m.user_id, 'pendiente'
  from memberships m
  where m.team_id = new.team_id
  on conflict (merendola_id, user_id) do nothing;
  
  update attendees set status = 'si', responded_at = now()
  where merendola_id = new.id and user_id = new.user_id;
  
  return new;
end;
$$;
revoke all on function handle_new_merendola() from public;

create trigger on_merendola_created
  after insert on merendolas
  for each row execute procedure handle_new_merendola();

-- FORCE CACHE RELOAD
NOTIFY pgrst, 'reload schema';

-- END
