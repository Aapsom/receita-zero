# 0002 — Sites self-contained em HTML único

Status: aceita

## Contexto
Vitrines precisam ser fáceis de entregar, mover e auditar, sem pipeline de build.

## Decisão
Cada site/deck é HTML self-contained (CSS/JS inline), verificável abrindo o arquivo; QA de links antes do deploy (QA-BASELINE.md).

## Consequências
+ Zero toolchain, entrega por arquivo único, sem dependência de CDN quebrando.
− Reuso de componentes por cópia; páginas maiores.
