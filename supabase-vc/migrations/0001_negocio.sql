-- ============================================================================
-- Vitrine Certa — Migration 0001: Modelo de NEGÓCIO
-- ============================================================================
-- Projeto Supabase: hoqygcswsmzxnkethygi
-- Data: 2026-08-11
-- Escopo: clientes, sites, fotos, briefs (dados de NEGÓCIO da VC)
--
-- PRINCÍPIO ARQUITETURAL (decisão CEO):
--   VC  = dados de NEGÓCIO (clientes, sites, fotos, briefs, dados do PME)
--   Avança = COBRANÇA (assinaturas, cobranças, retry, conciliação)
--
--   Esta migration NÃO cria tabelas de cobrança. A tabela `assinaturas`
--   que já existe no projeto VC é espelho de leitura — quem escreve status
--   de pagamento é sempre o webhook do Avança, nunca código da VC.
--
--   Mult-usuário (auth.uid()), NÃO multi-tenant.
--   RLS habilitada em TODAS as tabelas + policies por usuário dono.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela: cliente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        text NOT NULL,
    email       text,
    whatsapp    text,
    nicho       text,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só vê/edita seus próprios clientes
DROP POLICY IF EXISTS "cliente_owner_read"   ON public.cliente;
DROP POLICY IF EXISTS "cliente_owner_insert" ON public.cliente;
DROP POLICY IF EXISTS "cliente_owner_update" ON public.cliente;
DROP POLICY IF EXISTS "cliente_owner_delete" ON public.cliente;

CREATE POLICY "cliente_owner_read"   ON public.cliente
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cliente_owner_insert" ON public.cliente
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cliente_owner_update" ON public.cliente
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cliente_owner_delete" ON public.cliente
    FOR DELETE USING (auth.uid() = user_id);

-- Índice: filtrar clientes de um usuário
CREATE INDEX IF NOT EXISTS idx_cliente_user_id ON public.cliente(user_id);

-- ----------------------------------------------------------------------------
-- 2. Tabela: site
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id      uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nicho           text,
    tier            text NOT NULL DEFAULT 'basico'
                        CHECK (tier IN ('basico', 'plus', 'premium')),
    url_publicada   text,
    status          text NOT NULL DEFAULT 'rascunho'
                        CHECK (status IN ('rascunho', 'publicado', 'pausado')),
    publicado_em    timestamptz,
    criado_em        timestamptz NOT NULL DEFAULT now(),
    atualizado_em    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_owner_read"   ON public.site;
DROP POLICY IF EXISTS "site_owner_insert" ON public.site;
DROP POLICY IF EXISTS "site_owner_update" ON public.site;
DROP POLICY IF EXISTS "site_owner_delete" ON public.site;

CREATE POLICY "site_owner_read"   ON public.site
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "site_owner_insert" ON public.site
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "site_owner_update" ON public.site
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "site_owner_delete" ON public.site
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_site_cliente_id ON public.site(cliente_id);
CREATE INDEX IF NOT EXISTS idx_site_user_id    ON public.site(user_id);

-- ----------------------------------------------------------------------------
-- 3. Tabela: foto
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foto (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     uuid NOT NULL REFERENCES public.site(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url         text NOT NULL,
    alt         text,
    origem      text NOT NULL DEFAULT 'manual'
                    CHECK (origem IN ('manual', 'maps', 'instagram', 'ia', 'upload')),
    ordem       integer NOT NULL DEFAULT 0,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.foto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foto_owner_read"   ON public.foto;
DROP POLICY IF EXISTS "foto_owner_insert" ON public.foto;
DROP POLICY IF EXISTS "foto_owner_update" ON public.foto;
DROP POLICY IF EXISTS "foto_owner_delete" ON public.foto;

CREATE POLICY "foto_owner_read"   ON public.foto
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "foto_owner_insert" ON public.foto
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "foto_owner_update" ON public.foto
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "foto_owner_delete" ON public.foto
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_foto_site_id ON public.foto(site_id);
CREATE INDEX IF NOT EXISTS idx_foto_user_id ON public.foto(user_id);

-- ----------------------------------------------------------------------------
-- 4. Tabela: brief
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brief (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brief ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brief_owner_read"   ON public.brief;
DROP POLICY IF EXISTS "brief_owner_insert" ON public.brief;
DROP POLICY IF EXISTS "brief_owner_update" ON public.brief;
DROP POLICY IF EXISTS "brief_owner_delete" ON public.brief;

CREATE POLICY "brief_owner_read"   ON public.brief
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brief_owner_insert" ON public.brief
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brief_owner_update" ON public.brief
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brief_owner_delete" ON public.brief
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brief_cliente_id ON public.brief(cliente_id);
CREATE INDEX IF NOT EXISTS idx_brief_user_id    ON public.brief(user_id);

-- ----------------------------------------------------------------------------
-- 5. Trigger de atualização automática (atualizado_em em `site`)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vc_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_site_atualizado_em ON public.site;
CREATE TRIGGER trg_site_atualizado_em
    BEFORE UPDATE ON public.site
    FOR EACH ROW
    EXECUTE FUNCTION public.vc_set_atualizado_em();

-- ----------------------------------------------------------------------------
-- 6. Comentários de documentação
-- ----------------------------------------------------------------------------
COMMENT ON TABLE  public.cliente IS 'Cliente PME da VC — dono do negócio. Mult-usuário via auth.uid().';
COMMENT ON TABLE  public.site    IS 'Site criado para um cliente. Tier basico/plus/premium. Status rascunho/publicado/pausado.';
COMMENT ON TABLE  public.foto    IS 'Foto usada num site. Origem: manual, maps, instagram, ia, upload.';
COMMENT ON TABLE  public.brief   IS 'Brief preenchido pelo cliente — payload flexível em JSONB.';

-- ============================================================================
-- FIM — NÃO criar tabelas de cobrança/assinatura/pagamento aqui.
-- A tabela `assinaturas` existente no projeto é espelho de leitura do Avança.
-- ============================================================================
