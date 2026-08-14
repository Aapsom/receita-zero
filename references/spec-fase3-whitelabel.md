# Fase 3 — White-label da Vitrine Certa (spec)

> ZERO IA (regra AAPSON). White-label = troca determinística de marca (nome/cor/logo),
> não geração de conteúdo por ML.

## Conceito
Parceiros (ex.: agências, franquias) revendem a Vitrine Certa com a PRÓPRIA marca, e o Avança
cobre a assinatura white-label (add-on `white_label` já previsto em mr.ts).

## Binding (M29 white-label.js)
- Dicionário de tema: `{ nome, cor_primaria, logo }`.
- Aplicado por variável de ambiente/tema por tenant (sem banco aqui).
- O Avança já tem `extras[]` + `apurarMr`; white-label é só mais um add-on cobrado lá.

## Fora de escopo (gate)
- Domínio próprio do parceiro (requer DNS real).
- Revenda real com parceiro pagante (requer Avança PRD + cliente real).
