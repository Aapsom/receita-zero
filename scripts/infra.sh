#!/usr/bin/env bash
# ============================================
# AAPSON Infra Runner (Windows/MSYS compatible)
# Usage: bash scripts/infra.sh <target>
# Targets: check | rag-sync | rag-rebuild | rag-status | status | clean
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VAULT_ROOT="${VAULT_ROOT:-/c/Users/kauea/OneDrive/Documentos/AAPSOM.MD/OBSIDIAN/AAPSOM.MD}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ============================================
# SECRET SCANNER (extended with AAPSON patterns)
# ============================================
check_secrets() {
    log_info "Scanning for secrets..."
    
    local exit_code=0
    local patterns=(
        # Generic high-entropy
        'AKIA[0-9A-Z]{16}'                          # AWS Access Key ID
        'ghp_[A-Za-z0-9_]{36,}'                     # GitHub PAT
        'gho_[A-Za-z0-9_]{36,}'                     # GitHub OAuth
        'ghu_[A-Za-z0-9_]{36,}'                     # GitHub User
        'ghs_[A-Za-z0-9_]{36,}'                     # GitHub Server
        'ghr_[A-Za-z0-9_]{36,}'                     # GitHub Refresh
        'sk_live_[A-Za-z0-9]{24,}'                  # Stripe secret
        'rk_live_[A-Za-z0-9]{24,}'                  # Stripe restricted
        'pk_live_[A-Za-z0-9]{24,}'                  # Stripe publishable
        'xox[baprs]-[A-Za-z0-9-]{10,}'              # Slack tokens
        'APP_USR-[A-Za-z0-9_-]{20,}'                # MercadoPago access token
        'DATA_KEK=[A-Za-z0-9+/=]{44}'               # Data encryption key
        'PASSWORD_PEPPER=[A-Za-z0-9+/=]{32,}'       # Argon2id pepper
        'BLIND_INDEX_KEY=[A-Za-z0-9+/=]{44}'        # Blind index key
        'MP_ACCESS_TOKEN=[A-Za-z0-9_-]{20,}'        # MercadoPago access token
        'MP_WEBHOOK_SECRET=[A-Za-z0-9_-]{20,}'      # MercadoPago webhook secret
        'STRIPE_SECRET_KEY=[A-Za-z0-9_-]{20,}'      # Stripe secret
        'STRIPE_WEBHOOK_SECRET=[A-Za-z0-9_-]{20,}'  # Stripe webhook
        'SUPABASE_SERVICE_ROLE_KEY=[A-Za-z0-9_-]{20,}' # Supabase service role
        'SUPABASE_ANON_KEY=[A-Za-z0-9_-]{20,}'      # Supabase anon key
        'VERCEL_TOKEN=[A-Za-z0-9_-]{20,}'           # Vercel token
        '[A-Fa-f0-9]{32}'                            # 32-char hex (PIX key EVP, etc.)
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'  # JWT
    )
    
    # Files to scan (exclude node_modules, .git, build outputs)
    local scan_files
    scan_files=$(find "$REPO_ROOT" -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/.next/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.vercel/*" \
        ! -name "*.log" \
        ! -name "*.lock" \
        ! -name "pnpm-lock.yaml" \
        ! -name "package-lock.json" \
        ! -name "yarn.lock" \
        ! -name "*.sarif" \
        ! -name "*.json" \
        ! -name "*.min.js" \
        ! -name "*.min.css" \
        -print 2>/dev/null || true)
    
    if [[ -z "$scan_files" ]]; then
        log_info "No files to scan"
        return 0
    fi
    
    local found_secrets=0
    
    for pattern in "${patterns[@]}"; do
        local matches
        matches=$(echo "$scan_files" | xargs grep -l -E "$pattern" 2>/dev/null | head -20 || true)
        
        if [[ -n "$matches" ]]; then
            log_error "SECRET PATTERN MATCH: $pattern"
            echo "$matches" | while IFS= read -r file; do
                if [[ -n "$file" ]]; then
                    log_error "  Found in: $file"
                    # Show context (without exposing the secret fully)
                    grep -n -E "$pattern" "$file" | head -3 | sed 's/^/    /'
                fi
            done
            found_secrets=1
            exit_code=1
        fi
    done
    
    # Also scan for common assignment patterns
    local assignment_patterns=(
        'KEY\s*=\s*["'\''][A-Za-z0-9+/=_-]{20,}["'\'']'
        'SECRET\s*=\s*["'\''][A-Za-z0-9+/=_-]{20,}["'\'']'
        'TOKEN\s*=\s*["'\''][A-Za-z0-9+/=_-]{20,}["'\'']'
        'PASSWORD\s*=\s*["'\''][^"'\'']{8,}["'\'']'
    )
    
    for pattern in "${assignment_patterns[@]}"; do
        local matches
        matches=$(echo "$scan_files" | xargs grep -l -E -i "$pattern" 2>/dev/null | head -10 || true)
        
        if [[ -n "$matches" ]]; then
            log_warn "POTENTIAL SECRET ASSIGNMENT: $pattern"
            echo "$matches" | while IFS= read -r file; do
                if [[ -n "$file" ]]; then
                    log_warn "  Check: $file"
                    grep -n -E -i "$pattern" "$file" | head -2 | sed 's/^/    /'
                fi
            done
        fi
    done
    
    if [[ $found_secrets -eq 0 ]]; then
        log_info "No secrets detected"
    fi
    
    return $exit_code
}

# ============================================
# RAG OPERATIONS (LlamaIndex + Ollama)
# ============================================
rag_sync() {
    log_info "Syncing vault to RAG index..."
    
    # Check if .venv exists
    if [[ ! -f "$REPO_ROOT/.venv/Scripts/python.exe" ]]; then
        log_error "RAG venv not found. Run: python -m venv .venv && .venv/Scripts/pip install -r requirements-rag.txt"
        return 1
    fi
    
    # Check Ollama
    if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
        log_error "Ollama not running. Start with: ollama serve"
        return 1
    fi
    
    # Check models
    local models
    models=$(curl -sf http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    if ! echo "$models" | grep -q "gemma3:12b"; then
        log_warn "gemma3:12b not pulled. Run: ollama pull gemma3:12b"
    fi
    if ! echo "$models" | grep -q "nomic-embed-text"; then
        log_warn "nomic-embed-text not pulled. Run: ollama pull nomic-embed-text"
    fi
    
    # Run sync
    "$REPO_ROOT/.venv/Scripts/python.exe" -m scripts.vault_rag_sync \
        --vault "$VAULT_ROOT" \
        --domains fscd,produto,agentes,referencias,financas \
        --incremental
}

rag_rebuild() {
    log_info "Rebuilding RAG index from scratch..."
    
    if [[ ! -f "$REPO_ROOT/.venv/Scripts/python.exe" ]]; then
        log_error "RAG venv not found"
        return 1
    fi
    
    "$REPO_ROOT/.venv/Scripts/python.exe" -m scripts.vault_rag_sync \
        --vault "$VAULT_ROOT" \
        --domains fscd,produto,agentes,referencias,financas \
        --full-rebuild
}

rag_status() {
    log_info "RAG Index Status:"
    
    if [[ ! -d "$VAULT_ROOT/Infra/rag_v2/storage" ]]; then
        log_warn "No RAG index found at $VAULT_ROOT/Infra/rag_v2/storage"
        return 0
    fi
    
    for domain in fscd produto agentes referencias financas; do
        local index_dir="$VAULT_ROOT/Infra/rag_v2/storage/$domain"
        if [[ -d "$index_dir" ]]; then
            local doc_count
            doc_count=$(find "$index_dir" -name "*.json" -type f | wc -l)
            log_info "  $domain: $doc_count documents"
        else
            log_warn "  $domain: NOT INDEXED"
        fi
    done
    
    # Check Ollama
    if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
        log_info "  Ollama: RUNNING"
        curl -sf http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/    Model: /'
    else
        log_warn "  Ollama: NOT RUNNING"
    fi
}

# ============================================
# GENERAL STATUS
# ============================================
status() {
    log_info "=== AAPSON INFRA STATUS ==="
    
    # Git status
    cd "$REPO_ROOT"
    local branch
    branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local dirty
    if git status --porcelain 2>/dev/null | grep -q .; then
        dirty="DIRTY"
    else
        dirty="CLEAN"
    fi
    log_info "Git: branch=$branch status=$dirty"
    
    # Vault path
    if [[ -d "$VAULT_ROOT" ]]; then
        log_info "Vault: FOUND at $VAULT_ROOT"
    else
        log_warn "Vault: NOT FOUND at $VAULT_ROOT"
    fi
    
    # RAG
    rag_status
    
    # Ollama
    if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
        log_info "Ollama: RUNNING"
    else
        log_warn "Ollama: NOT RUNNING"
    fi
    
    # Node
    if command -v node >/dev/null 2>&1; then
        log_info "Node: $(node --version)"
    else
        log_warn "Node: NOT INSTALLED"
    fi
    
    # Python venv
    if [[ -f "$REPO_ROOT/.venv/Scripts/python.exe" ]]; then
        log_info "RAG venv: EXISTS"
    else
        log_warn "RAG venv: MISSING"
    fi
}

# ============================================
# CLEAN
# ============================================
clean() {
    log_info "Cleaning build artifacts..."
    cd "$REPO_ROOT"
    
    # Python cache
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    # Node cache (optional - be careful)
    # rm -rf node_modules/.cache 2>/dev/null || true
    
    log_info "Clean complete"
}

# ============================================
# MAIN
# ============================================
main() {
    local target="${1:-}"
    
    case "$target" in
        check)
            check_secrets
            ;;
        rag-sync)
            rag_sync
            ;;
        rag-rebuild)
            rag_rebuild
            ;;
        rag-status)
            rag_status
            ;;
        status)
            status
            ;;
        clean)
            clean
            ;;
        "")
            log_error "Usage: $0 {check|rag-sync|rag-rebuild|rag-status|status|clean}"
            exit 1
            ;;
        *)
            log_error "Unknown target: $target"
            exit 1
            ;;
    esac
}

main "$@"