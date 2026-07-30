#!/bin/bash
# Atualiza o grafo do codebase para GitHub Pages

echo "Exportando grafo do codebase..."
codebase-memory-mcp cli get_architecture --project "C-c-Users-kauea-dev-receita-zero" --json > graph.json

echo "Commitando atualização..."
git add graph.json graph.html
git commit -m "Update codebase graph $(date +%Y-%m-%d)"
git push

echo "✅ Grafo atualizado no GitHub Pages: https://Receitazero.github.io/receita-zero/graph.html"