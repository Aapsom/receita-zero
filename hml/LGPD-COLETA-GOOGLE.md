# Base Legal — Coleta de Dados via Google OAuth (Vitrine Certa / HML→PRD)

**Responsável:** AAPSON · **Produto:** Vitrine Certa (projeto Supabase `hoqygcswsmzxnkethygi`)
**Data de registro:** 2026-08-11
**Status:** 🟡 Condicional — válido para HML demo; exige revisão antes de PRD real.

## 1. Dados coletados
Ao habilitar o provider **Google** (Authentication → Providers), a Vitrine Certa passa a receber,
do Google (conforme escopo `profile` + `email`), os seguintes dados do usuário:
- E-mail (obrigatório)
- Nome de exibição (display name)
- Avatar (URL da foto, opcional)
- `sub` / Google ID (identificador do provedor)

Esses dados ficam no `auth.users` do projeto Supabase VC e, no signup, são propagados para o
perfil da aplicação (tabela `assinaturas` / metadados de usuário).

## 2. Base legal (LGPD — Lei 13.709/2018)
- **Art. 7º, I — consentimento:** o login com Google ocorre mediante ação positiva do titular
  (botão "Entrar com Google" + tela de consentimento do próprio Google). O titular autoriza a
  transferência dos dados listados acima para a Vitrine Certa.
- **Art. 7º, V — execução de contrato:** os dados são necessários para provisionar a conta e o
  acesso ao painel de assinaturas contratado.
- **Finalidade (Art. 6º, I):** autenticação e personalização da conta. Nenhum dado do Google é
  usado para finalidade diversa (ex.: marketing não solicitado) sem novo consentimento.

## 3. Transparência (Art. 9º / Art. 37)
- A política de privacidade (`hml/lgpd.html`) deve mencionar expressamente o login via terceiro
  (Google) e quais dados são recebidos. ✅ já linkado em todo o footer do HML.
- O titular é informado no momento do login (tela de consentimento do Google) e no `lgpd.html`.

## 4. Direitos do titular (Art. 18)
- Acesso, correção, anonimização ou eliminação: via `dashboard.html` (logout/eliminação de conta)
  ou solicitação em `suporte.html`. O titular pode revogar o acesso Google a qualquer momento nas
  configurações de conta do Google.

## 5. Segurança (Art. 46)
- A anon key do Supabase é pública por design (frontend). Dados sensíveis protegidos por RLS
  (Row Level Security) no Postgres. **A service_role key NUNCA está no frontend.**
- Tokens OAuth trafegam via fluxo PKCE padrão do Supabase Auth.

## 6. Pendências antes de PRD real
- [ ] Revisão do `lgpd.html` para citar explicitamente "Google" como provedor de login.
- [ ] Confirmar que o e-mail de boas-vindas / confirmação (se "Confirm email" ligado) cita a origem.
- [ ] Registro desta base legal na `08-Juridico` do vault AAPSON (cópia arquivada).
- [ ] Teste de fluxo Google ponta a pena (login real com conta Google de teste).

## 7. Referências
- Supabase Auth → Google provider: https://supabase.com/docs/guides/auth/social-login/auth-google
- LGPD: http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
