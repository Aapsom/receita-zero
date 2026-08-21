# Vitrine Certa — App na tela de início (PWA)

> Diferencial de produto v5 (aprovado em 21/ago/2026). Documentação técnica de como
> os sites da Vitrine Certa viram "apps" instaláveis na home do cliente, sem custo de
> App Store/Play Store e sem backend novo (todo front-end estático).

## 1. O que é (em linguagem de PME)

O cliente do PME abre o site → toca em "Compartilhar" → "Adicionar à Tela de Início".
Vira um **ícone do comércio na home do celular** que abre em tela cheia, como um app de
verdade. É o maior ativo de retenção que um comércio local pode ter: o negócio aparece
todo dia na home de quem já foi cliente.

## 2. Resposta técnica (perguntas do CEO)

| Pergunta | Resposta |
|---|---|
| Tem no iOS? | **Sim.** Safari → Compartilhar → Adicionar à Tela de Início. Vira ícone que abre fullscreen. |
| Tem no Android? | **Sim, e melhor.** Chrome mostra banner "Adicionar à tela inicial" automático. Vira app no drawer, com ícone e splash. |
| Entra na App Store? | **Não.** PWA não entra em loja. Pra isso precisaria de TWA (Play) ou wrapper (iOS nem TWA permite). Pro PME local, a tela de início já basta. |
| Precisa de backend? | **Não.** É 100% front-end estático (mesmo pipeline GitHub Pages). |

## 3. Requisitos mínimos

| Plataforma | manifest.json | ícone | service worker |
|---|---|---|---|
| iOS (Safari) | ✅ básico | ✅ `apple-touch-icon` 180×180 | não obrigatório p/ instalar |
| Android (Chrome) | ✅ | ✅ | ✅ **obrigatório** p/ ser "instalável" + offline |

## 4. Arquivos a entregar (por nicho em `site-dfy/<nicho>/`)

1. **`manifest.webmanifest`** — nome, ícone, `display:standalone`, `start_url`, `theme_color`,
   `background_color`, `orientation:portrait`.
2. **`icon-192.png` / `icon-512.png` / `apple-touch-icon.png`** (180×180) — cor da marca do nicho.
3. **`sw.js`** — service worker mínimo: cache do shell (HTML/CSS/JS/icons) em
   `install`, `network-first` em `fetch` pro conteúdo (pra preço novo aparecer), fallback offline.
4. **`<link rel="manifest">` + `<link rel="apple-touch-icon">` + meta `apple-mobile-web-app-capable`**
   no `<head>` de cada `index.html`.
5. **Banner "Adicione na home"** (só Premium): escuta `beforeinstallprompt`, mostra CTA discreto
   no cardápio ("📲 Tenha esse cardápio no seu celular").

## 5. Estratégia de cache (honestidade)

- **Shell (HTML/CSS/JS/ícones):** `cache-first` — abre instantâneo, mesmo sem sinal.
- **Conteúdo (preço, cardápio, status):** `network-first` com TTL curto — preço novo aparece,
  mas se cair a net mostra o último cacheado (não quebra o balcão).
- **Pitfall:** se o dono trocar preço, o cliente pode ver o velho por até o TTL. Resolver com
  `skipWaiting` + aviso "atualize puxando pra baixo" ou versionar o cache por data.

## 6. Limitações (não vender como app nativo)

- iOS **não tem** push confiável e **não tem** banner automático (é manual, via Compartilhar).
- PWA **não entra** em loja — vender "ícone na tela início", nunca "app na loja".
- Câmera/GPS profundo funcionam via web, mas PME local raramente precisa.

## 7. Esforço por tier (ancorado na precificação v4)

| Tier | Entrega PWA | Esforço |
|---|---|---|
| Básico | manifest + ícone + meta Apple → instalável no iOS | baixo (1 arquivo + ícone) |
| Plus | + service worker (offline/splash) | médio |
| Premium | + banner `beforeinstallprompt` + atalho no cardápio | maior (já tem mecânica única p/ encaixar) |

## 8. QA

- `verify-syntax` não checa PWA; validar com Lighthouse (PWA audit) ou
  `npx @pwabuilder/pwabuilder` scan.
- Manual: abrir no celular → Compartilhar → Adicionar → abrir do ícone → conferir fullscreen/offline.
