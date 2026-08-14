# HML local do modelo de NEGÓCIO da VC (Postgres puro)

O Supabase free tem só 2 vagas (Avança PRD + VC PRD). Para testar o modelo de
dados da VC (`cliente`/`site`/`foto`/`brief` + RLS `auth.uid()`) sem queimar
vaga e sem criar conta, usamos **Postgres local em Docker**.

## Subir

```bash
bash scripts/aplicar-modelo-vc-local.sh
```

Isso:
1. Sobe `vc-hml-db` (Postgres 16) em `127.0.0.1:5433`
2. Aplica `0000_auth-shim.sql` (emula `auth.users` + `auth.uid()` + cria role `app_role`)
3. Aplica `0001_negocio.sql` (modelo real da VC, RLS por usuário)
4. Aplica `0002_force_rls.sql` (força RLS — ver abaixo)
5. Cria 2 usuários de teste

## Testar isolamento RLS (a prova real)

```bash
node references/hml-local/teste-isolamento-rlc-vc.js
```

Saída esperada: `ISOLAMENTO_RLS_OK` (exit 0).

## Causa-raiz que este HML resolve

O dono do banco no Postgres (`POSTGRES_USER=vc`) é **superuser** e **bypassa a
RLS**, mesmo com `FORCE ROW LEVEL SECURITY`. No Supabase isso não acontece porque
as queries rodam com a role `authenticated` (não dona). AQUI, para exercitar a
RLS de verdade, o teste conecta como `app_role` (role `NOSUPERUSER`) — igual ao
Supabase. Sem isso, a RLS parece "não funcionar" mas é só o bypass do dono.

## Parar

```bash
docker rm -f vc-hml-db && docker volume rm supabase-vc_vc-db-data
```

## Não vai pra PRD

- `0000_auth-shim.sql` e `0002_force_rls.sql` são **HML-only** (o PRD usa o
  `auth.uid()` real do Supabase + role `authenticated`). Não aplicar no
  projeto `hoqygcswsmzxnkethygi`.
- `0001_negocio.sql` é o modelo canônico — esse sim vai pro PRD quando o 1º
  cliente real entrar.
