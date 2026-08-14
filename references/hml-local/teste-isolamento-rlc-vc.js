#!/usr/bin/env node
/**
 * teste-isolamento-rlc-vc.js — prova que a RLS da VC isola user A de user B
 * no Postgres local (HML), usando a mesma regra da migration 0001 (auth.uid()).
 *
 * R$0, local. Requer o modelo aplicado (scripts/aplicar-modelo-vc-local.sh).
 * O teste conecta como role app_role (NAO-superuser) para a RLS valer de verdade
 * (igual ao Supabase, onde queries rodam com role 'authenticated', nao o dono).
 */
'use strict';
const { execSync } = require('child_process');

const UA = '11111111-1111-1111-1111-111111111111';
const UB = '22222222-2222-2222-2222-222222222222';

// Executa SQL como app_role (role nao-superuser, RLS vale) DENTRO do container.
// Usa STDIN (docker exec -i) para blocos multi-statement nao quebrarem no Windows.
function run(user, comando, captureNum) {
  const set = user ? `set my.user_id='${user}';` : `set my.user_id='';`;
  const cmd = `docker exec -i vc-hml-db psql -U app_role -d vc_hml -t -A -q --no-psqlrc`;
  const out = execSync(cmd, { input: set + '\n' + comando + '\n', encoding: 'utf8' });
  if (!captureNum) return out.trim();
  const nums = out.split('\n').map((l) => l.trim()).filter((l) => /^\d+$/.test(l));
  return nums.length ? nums[nums.length - 1] : out.trim();
}

function sql(user, comando) { return run(user, comando, true); }

function tenta(user, comando) {
  // INSERT unico (uma linha) — usa -c para o exit code do psql propagar o erro de RLS.
  const set = user ? `set my.user_id='${user}';` : `set my.user_id='';`;
  const cmd = `docker exec -i vc-hml-db psql -U app_role -d vc_hml -t -A -q --no-psqlrc -c "${set}${comando}"`;
  try {
    execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    return false;
  } catch (e) {
    const msg = String(e.stderr || '') + ' ' + String(e.stdout || '') + ' ' + String(e.message || '');
    return /permission denied|violates row-level security|policy|row/i.test(msg);
  }
}

let falhas = 0;
function ok(label, cond, extra) {
  console.log(`${cond ? '  ok  ' : 'FALHA'} ${label}${!cond && extra ? ' -> ' + extra : ''}`);
  if (!cond) falhas++;
}

console.log('== Isolamento RLS da VC (Postgres local, role app_role) ==');

// Limpa (idempotencia)
sql('', `TRUNCATE public.brief, public.foto, public.site, public.cliente RESTART IDENTITY CASCADE;`);

// A cria cliente + site + foto + brief
sql(UA, `
  INSERT INTO public.cliente (user_id, nome, nicho) VALUES ('${UA}','Cliente A','pet');
  INSERT INTO public.site (cliente_id, user_id, nicho, tier, status)
    SELECT id, '${UA}', 'pet', 'premium', 'publicado' FROM public.cliente WHERE user_id='${UA}';
  INSERT INTO public.foto (site_id, user_id, url)
    SELECT id, '${UA}', 'https://x/foto.jpg' FROM public.site WHERE user_id='${UA}';
  INSERT INTO public.brief (cliente_id, user_id, payload)
    SELECT id, '${UA}', '{"servicos":["banho"]}' FROM public.cliente WHERE user_id='${UA}';
`);
// B cria cliente
sql(UB, `INSERT INTO public.cliente (user_id, nome, nicho) VALUES ('${UB}','Cliente B','padaria');`);

const cliA = Number(sql(UA, `SELECT count(*) FROM public.cliente;`));
const cliB = Number(sql(UB, `SELECT count(*) FROM public.cliente;`));
ok('user A vê só os próprios clientes (1)', cliA === 1, `viu ${cliA}`);
ok('user B vê só os próprios clientes (1)', cliB === 1, `viu ${cliB}`);

const siteA = Number(sql(UA, `SELECT count(*) FROM public.site;`));
const siteB = Number(sql(UB, `SELECT count(*) FROM public.site;`));
ok('user A vê só seus sites (1)', siteA === 1, `viu ${siteA}`);
ok('user B vê 0 sites (não herda de A)', siteB === 0, `viu ${siteB}`);

const anonCli = Number(sql('', `SELECT count(*) FROM public.cliente;`));
const anonSite = Number(sql('', `SELECT count(*) FROM public.site;`));
ok('anon vê 0 clientes (RLS fail-closed)', anonCli === 0, `viu ${anonCli}`);
ok('anon vê 0 sites (RLS fail-closed)', anonSite === 0, `viu ${anonSite}`);

const bloqueado = tenta(UA, `INSERT INTO public.cliente (user_id, nome) VALUES ('${UB}','Trapaca');`);
ok('A NÃO injeta cliente com user_id de B (WITH CHECK bloqueia)', bloqueado);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nISOLAMENTO_RLS_OK');
process.exit(falhas ? 1 : 0);
