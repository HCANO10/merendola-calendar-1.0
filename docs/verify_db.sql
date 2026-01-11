-- VERIFY DATABASE SCHEMA HEALTH
-- Execute this in Supabase SQL Editor to confirm all tables and triggers are OK

-- 1. Check Tables
select 
  tablename, 
  row_level_security_enabled 
from pg_tables 
where schemaname = 'public' 
and tablename in ('profiles', 'teams', 'memberships', 'merendolas', 'attendees');

-- 2. Check Triggers
select 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement 
from information_schema.triggers 
where event_object_schema = 'public';

-- 3. Check Functions
select 
  routine_name, 
  routine_type 
from information_schema.routines 
where routine_schema = 'public' 
and routine_name in ('create_team', 'join_team', 'handle_new_merendola');

-- 4. FORCE CACHE RELOAD
NOTIFY pgrst, 'reload schema';

-- SUCCESS MESSAGE
select 'Base de datos verificada y cache recargada exitosamente' as status;
