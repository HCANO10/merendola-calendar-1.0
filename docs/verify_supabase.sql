
-- VERIFICACIÓN COMPLETA DE SEGURIDAD
-- Ejecuta esto en SQL Editor de Supabase

-- 1. Verificar Funciones (Configuración y Permisos)
-- Debe verse search_path en proconfig, y acl restringido en proacl
select proname, proconfig, prosecdef, proacl 
from pg_proc 
where proname in ('create_team', 'join_team', 'handle_new_merendola');

-- 2. Verificar Constraints
-- Debe aparecer teams_invite_code_upper
select conname, conrelid::regclass, contype, consrc 
from pg_constraint 
where conname like '%invite_code%';

-- 3. Verificar Triggers
select tgname, sub.relname as table_name
from pg_trigger tg
join pg_class sub on tg.tgrelid = sub.oid
where tgname = 'on_merendola_created';

-- 4. Verificar Políticas Activas (Solo para confirmar existencia)
select schemaname, tablename, count(*) as total_policies
from pg_policies 
group by schemaname, tablename;

-- 5. Comprobar datos recientes (Debugging)
select count(*) as attendees_count from attendees;
