#!/usr/bin/env bash
# scripts/aplicar-modelo-vc-local.sh — sobe Postgres + aplica modelo da VC (HML).
# R$0, local, não cria conta Supabase. Requer Docker instalado.
#
# Em Postgres o dono do banco e superuser e BYPASSA a RLS. Para testar a RLS de
# verdade (como o Supabase faz com a role 'authenticated'), criamos a role
# app_role (nao-superuser) e o teste conecta como ela.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="$DIR/supabase-vc/migrations"
WIN_MIG=$(cygpath -w "$MIG" 2>/dev/null || echo "$MIG")

PGPASSWORD=vc_hml
export PGPASSWORD

echo "== Subindo Postgres (docker compose) =="
docker compose -f "$WIN_MIG/../docker-compose.yml" up -d

for i in $(seq 1 20); do
  if docker exec vc-hml-db pg_isready -U vc -d vc_hml >/dev/null 2>&1; then break; fi
  sleep 1
done

PSQL="docker exec -i vc-hml-db psql -U vc -d vc_hml -v ON_ERROR_STOP=1"

echo "== Aplicando 0000_auth-shim.sql (cria auth.* + app_role) =="
$PSQL < "$WIN_MIG/0000_auth-shim.sql"

echo "== Aplicando 0001_negocio.sql =="
$PSQL < "$WIN_MIG/0001_negocio.sql"

echo "== Aplicando 0002_force_rls.sql =="
$PSQL < "$WIN_MIG/0002_force_rls.sql"

echo "== Criando 2 usuários de teste (isolamento RLS) =="
$PSQL <<'SQL'
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'user-a@teste.com'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@teste.com')
ON CONFLICT (id) DO NOTHING;
SQL

echo "== Verificação =="
echo "Tabelas:"; $PSQL -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
echo "RLS ligada:"; $PSQL -t -c "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname;"
echo "MODELO_VC_LOCAL_OK"
