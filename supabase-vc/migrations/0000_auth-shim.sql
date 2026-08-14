-- 0000_auth-shim.sql — emula auth.users + auth.uid() para Postgres puro (HML local).
-- O 0001_negocio.sql referencia auth.users(id) e auth.uid(); aqui recriamos o
-- mínimo para a migration rodar e a RLS ser testável de verdade.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text
);

-- auth.uid() lê o user_id da sessão atual (setado via SET my.user_id).
-- Espelha o comportamento do Supabase: auth.uid() = usuário logado.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT nullif(current_setting('my.user_id', true), '')::uuid
$$;

-- Conveniência: trocar de "usuário logado" numa sessão.
CREATE OR REPLACE FUNCTION auth.set_user(u uuid)
RETURNS void
LANGUAGE sql
AS $$
    SELECT set_config('my.user_id', u::text, false)
$$;

-- No Postgres, o dono do banco (POSTGRES_USER) e' SUPERUSER e BYPASSA a RLS, mesmo
-- com FORCE ROW LEVEL SECURITY. Para exercitar a RLS de verdade (como o Supabase
-- faz com a role 'authenticated'), criamos uma role NAO-superuser que faz as queries.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
    CREATE ROLE app_role LOGIN PASSWORD 'app_pass' NOSUPERUSER;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_role;

