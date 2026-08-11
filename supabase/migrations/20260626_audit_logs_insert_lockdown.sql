-- Lockdown de inserts en audit_logs.
--
-- Problema: la policy anterior permitia que cualquier usuario autenticado
-- insertara registros con su propio user_id mediante llamadas directas a la
-- REST API de Supabase, pudiendo falsificar la pista de auditoria.
--
-- Solucion: eliminar la policy de insert para el rol `authenticated`.
-- Los audit logs SOLO deben escribirse desde el servidor con el service role
-- (getSupabaseAdminClient -> createAuditLog), que bypasea RLS. Sin policy de
-- insert y con RLS habilitado, los inserts desde clientes autenticados quedan
-- denegados por defecto.

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;

-- (Intencional: no se crea una nueva policy de insert.
--  El service role escribe los logs y no esta sujeto a RLS.)
