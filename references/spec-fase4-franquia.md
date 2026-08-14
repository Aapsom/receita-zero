# Fase 4 — Franquia/Revenda da Vitrine Certa (spec)

> ZERO IA (regra AAPSON). Franquia = revenda determinística de sites + add-ons sob marca própria.

## Conceito
Revendedores (agências/franqueados) obtêm portal (M35 revenda.js) com white-label (M29) e
comissão sobre assinaturas (dry-run). O Avança já tem `extras[]` + `apurarMr`; a comissão é
apenas mais um add-on ou split de MRR (gate PRD).

## Binding (M35 revenda.js)
- Portal do revendedor: lista de PMEs sob sua marca, MRR agregado.
- Comissão: percentual determinístico sobre MRR (ex.: 20%), calculado em relatório.
- O Avança cobra e repassa comissão (gate: conta PRD + contrato real).

## Fora de escopo (gate)
- Revenda real pagante (requer Avança PRD + cliente real + contrato).
- Domínio próprio do revendedor (DNS real).
