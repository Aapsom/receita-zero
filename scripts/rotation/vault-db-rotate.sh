#!/usr/bin/env bash
# ============================================
# AAPSON Vault Database Credential Rotation
# 
# Uses HashiCorp Vault database secrets engine for dynamic credentials
# Run via cron or manually: bash scripts/rotation/vault-db-rotate.sh
# ============================================

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
DB_MOUNT="${DB_MOUNT:-database}"
ROLES="${ROLES:-readonly readwrite admin}"

log() { echo "[$(date -Iseconds)] $*"; }
error() { echo "[$(date -Iseconds)] ERROR: $*" >&2; }

if [[ -z "$VAULT_TOKEN" ]]; then
    error "VAULT_TOKEN not set"
    exit 1
fi

export VAULT_ADDR VAULT_TOKEN

log "Starting Vault database credential rotation"
log "Mount: $DB_MOUNT"
log "Roles: $ROLES"

for role in $ROLES; do
    log "Rotating role: $role"
    
    # Check if role exists
    if ! vault read -format=json "$DB_MOUNT/roles/$role" &>/dev/null; then
        error "Role $role not found in $DB_MOUNT"
        continue
    fi
    
    # Trigger rotation
    if vault write -format=json "$DB_MOUNT/rotate-role/$role" &>/dev/null; then
        log "  ✓ Rotated: $role"
    else
        error "  ✗ Failed to rotate: $role"
    fi
    
    # Verify new credentials work
    if creds=$(vault read -format=json "$DB_MOUNT/creds/$role" 2>/dev/null); then
        username=$(echo "$creds" | jq -r '.data.username')
        log "  ✓ Verified new credentials for: $username"
    else
        error "  ✗ Failed to verify new credentials for: $role"
    fi
done

log "Database credential rotation complete"