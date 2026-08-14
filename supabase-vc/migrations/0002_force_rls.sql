-- 0002_force_rls.sql — HML local apenas.
-- No Supabase as queries rodam com role authenticated/anon (nao dona), entao a RLS
-- vale. Aqui testamos com o dono 'vc', que por padrao BYPASSA a RLS. Forcamos para
-- a RLS ser exercitada de verdade no teste de isolamento.
-- NAO aplicar em PRD (la o dono nao faz query de usuario).

ALTER TABLE public.cliente FORCE ROW LEVEL SECURITY;
ALTER TABLE public.site    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.foto    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.brief   FORCE ROW LEVEL SECURITY;
