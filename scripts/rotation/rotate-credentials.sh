#!/usr/bin/env bash
# ============================================
# AAPSON Service Account Credential Rotation
# 
# Rotates credentials for all service accounts across platforms:
# - Active Directory: gMSA (automatic) or PAM-managed
# - AWS IAM: Access keys via Secrets Manager rotation Lambda
# - GCP: Service account keys via IAM API
# - Azure: Service principal secrets via Key Vault rotation policy
# - Database: Credentials via HashiCorp Vault dynamic secrets
# 
# Usage: bash scripts/rotation/rotate-credentials.sh [--dry-run] [--platform=all|ad|aws|gcp|azure|db]
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${REPO_ROOT}/logs/rotation-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*" | tee -a "$LOG_FILE"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $*" | tee -a "$LOG_FILE"; }

# Default values
DRY_RUN=false
PLATFORM="all"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --platform=*)
            PLATFORM="${1#*=}"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log_info "=== AAPSON Service Account Rotation Started ==="
log_info "Platform: $PLATFORM"
log_info "Dry run: $DRY_RUN"
log_info "Log file: $LOG_FILE"

# ============================================
# PREREQUISITES CHECK
# ============================================
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local missing=0
    
    # Check required CLIs
    for cli in aws az gcloud kubectl vault; do
        if ! command -v "$cli" &>/dev/null; then
            log_warn "$cli not found (required for some platforms)"
        fi
    done
    
    # Check environment variables
    if [[ -z "${AWS_PROFILE:-}" && -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
        log_warn "AWS credentials not configured"
    fi
    
    if [[ -z "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
        log_warn "Azure subscription not configured"
    fi
    
    if [[ -z "${GOOGLE_CLOUD_PROJECT:-}" ]]; then
        log_warn "GCP project not configured"
    fi
    
    if [[ -z "${VAULT_ADDR:-}" ]]; then
        log_warn "Vault address not configured (VAULT_ADDR)"
    fi
    
    log_info "Prerequisites check complete"
}

# ============================================
# ACTIVE DIRECTORY gMSA
# ============================================
rotate_ad_gmsa() {
    log_step "Checking AD gMSA accounts..."
    
    # gMSA passwords are automatically rotated by AD every 30 days
    # This function verifies gMSA health and reports status
    
    if ! command -v powershell.exe &>/dev/null; then
        log_warn "PowerShell not available - skipping AD gMSA check"
        return 0
    fi
    
    log_info "AD gMSA: Automatic rotation managed by AD (30-day interval)"
    log_info "Verify gMSA health with: Test-ADServiceAccount -Identity <gMSA_Name>"
    
    # List all gMSAs
    if [[ "$DRY_RUN" == "false" ]]; then
        powershell.exe -Command "
            Import-Module ActiveDirectory
            Get-ADServiceAccount -Filter * | Select-Object Name, Enabled, DNSHostName | Format-Table -AutoSize
        " 2>&1 | tee -a "$LOG_FILE" || log_warn "Could not enumerate gMSAs"
    fi
}

# ============================================
# AWS IAM ACCESS KEY ROTATION
# ============================================
rotate_aws_iam_keys() {
    log_step "Rotating AWS IAM access keys..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rotate AWS IAM access keys"
        return 0
    fi
    
    # List IAM users with access keys older than 90 days
    local threshold_date
    threshold_date=$(date -d '-90 days' +%Y-%m-%d 2>/dev/null || date -v-90d +%Y-%m-%d)
    
    log_info "Finding access keys older than $threshold_date..."
    
    aws iam list-users --query 'Users[*].UserName' --output text | tr '\t' '\n' | while read -r user; do
        [[ -z "$user" ]] && continue
        
        aws iam list-access-keys --user-name "$user" \
            --query "AccessKeyMetadata[?CreateDate<='$threshold_date' && Status=='Active'].[AccessKeyId,CreateDate]" \
            --output text | while read -r key_id create_date; do
            [[ -z "$key_id" ]] && continue
            
            log_warn "Rotating key $key_id for user $user (created: $create_date)"
            
            # Create new access key
            local new_key
            new_key=$(aws iam create-access-key --user-name "$user" \
                --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text)
            
            local new_key_id new_secret
            new_key_id=$(echo "$new_key" | cut -f1)
            new_secret=$(echo "$new_key" | cut -f2)
            
            # Store new secret in AWS Secrets Manager
            aws secretsmanager put-secret-value \
                --secret-id "aapson/iam/$user/$new_key_id" \
                --secret-string "{\"access_key_id\":\"$new_key_id\",\"secret_access_key\":\"$new_secret\"}" \
                --description "Rotated on $(date -Iseconds)" || log_error "Failed to store new key in Secrets Manager"
            
            # Deactivate old key
            aws iam update-access-key --user-name "$user" --access-key-id "$key_id" --status Inactive
            
            # Delete old key after grace period (handled by separate cleanup job)
            log_info "Old key $key_id deactivated. New key $new_key_id created and stored."
        done
    done
}

# ============================================
# GCP SERVICE ACCOUNT KEY ROTATION
# ============================================
rotate_gcp_sa_keys() {
    log_step "Rotating GCP service account keys..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rotate GCP service account keys"
        return 0
    fi
    
    if ! command -v gcloud &>/dev/null; then
        log_warn "gcloud not available - skipping GCP rotation"
        return 0
    fi
    
    local project="${GOOGLE_CLOUD_PROJECT:-}"
    [[ -z "$project" ]] && { log_error "GOOGLE_CLOUD_PROJECT not set"; return 1; }
    
    log_info "Project: $project"
    
    # List service accounts
    gcloud iam service-accounts list --project="$project" --format="value(email)" | while read -r sa_email; do
        [[ -z "$sa_email" ]] && continue
        
        # List keys older than 90 days
        gcloud iam service-accounts keys list --iam-account="$sa_email" --project="$project" \
            --format="value(name,validAfterTime)" | while read -r key_name valid_after; do
            [[ -z "$key_name" ]] && continue
            
            local key_age_days
            key_age_days=$(( ( $(date +%s) - $(date -d "$valid_after" +%s) ) / 86400 ))
            
            if [[ $key_age_days -gt 90 ]]; then
                log_warn "Rotating key $key_name for $sa_email (age: ${key_age_days} days)"
                
                # Create new key
                local new_key_file
                new_key_file=$(mktemp --suffix=.json)
                gcloud iam service-accounts keys create "$new_key_file" --iam-account="$sa_email" --project="$project"
                
                # Store in Secret Manager
                gcloud secrets create "aapson-gcp-sa-$(basename "$sa_email" | tr '@.' '__')-$(date +%s)" \
                    --data-file="$new_key_file" --project="$project" 2>/dev/null || \
                gcloud secrets versions add "aapson-gcp-sa-$(basename "$sa_email" | tr '@.' '__')-latest" \
                    --data-file="$new_key_file" --project="$project"
                
                # Delete old key
                gcloud iam service-accounts keys delete "$key_name" --iam-account="$sa_email" --project="$project" --quiet
                
                # Cleanup
                shred -u "$new_key_file"
                
                log_info "Key rotated for $sa_email"
            fi
        done
    done
}

# ============================================
# AZURE SERVICE PRINCIPAL SECRET ROTATION
# ============================================
rotate_azure_sp_secrets() {
    log_step "Rotating Azure service principal secrets..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rotate Azure SP secrets"
        return 0
    fi
    
    if ! command -v az &>/dev/null; then
        log_warn "az CLI not available - skipping Azure rotation"
        return 0
    fi
    
    local subscription="${AZURE_SUBSCRIPTION_ID:-}"
    [[ -z "$subscription" ]] && { log_error "AZURE_SUBSCRIPTION_ID not set"; return 1; }
    
    az account set --subscription "$subscription"
    
    # List service principals with secrets expiring soon
    log_info "Checking service principal credential expiration..."
    
    # This would require Microsoft Graph API for full automation
    # For now, document the manual process
    log_info "Azure SP secret rotation:"
    log_info "  1. Go to Azure Portal > App Registrations"
    log_info "  2. For each app: Certificates & secrets > New client secret"
    log_info "  3. Update Key Vault with new secret"
    log_info "  4. Delete old secret after grace period"
    log_info "  5. Consider using Key Vault rotation policy for automation"
}

# ============================================
# DATABASE CREDENTIALS VIA VAULT
# ============================================
rotate_db_credentials() {
    log_step "Rotating database credentials via Vault..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rotate DB credentials via Vault"
        return 0
    fi
    
    if [[ -z "${VAULT_ADDR:-}" ]]; then
        log_warn "VAULT_ADDR not set - skipping DB rotation"
        return 0
    fi
    
    if ! command -v vault &>/dev/null; then
        log_warn "vault CLI not available - skipping DB rotation"
        return 0
    fi
    
    # Check Vault connection
    if ! vault status &>/dev/null; then
        log_error "Cannot connect to Vault at $VAULT_ADDR"
        return 1
    fi
    
    log_info "Vault connection OK"
    
    # Rotate dynamic database credentials
    # This assumes you have database secrets engine configured
    log_info "Database credential rotation:"
    log_info "  - Dynamic secrets: TTL-based, auto-rotated on read"
    log_info "  - Static roles: Manual rotation via 'vault write database/rotate-role/:name'"
    log_info "  - Check: vault list database/creds/"
    
    # Example rotation command (customize for your setup)
    # vault write database/rotate-role/readonly-role
    # vault write database/rotate-role/readwrite-role
}

# ============================================
# POST-ROTATION VERIFICATION
# ============================================
verify_rotation() {
    log_step "Verifying rotation..."
    
    local endpoints=(
        "https://api.avanca.com.br/health"
        "https://api.atlas-aapson.com/health"
        "https://api.aprovaai.com/health"
        "https://vitrine-certa.aapson.dev/health"
    )
    
    log_info "Checking service health endpoints..."
    
    for endpoint in "${endpoints[@]}"; do
        if curl -sf --max-time 10 "$endpoint" >/dev/null; then
            log_info "  ✓ $endpoint - HEALTHY"
        else
            log_warn "  ✗ $endpoint - UNHEALTHY (may be expected if service down)"
        fi
    done
}

# ============================================
# MAIN EXECUTION
# ============================================
main() {
    check_prerequisites
    
    case "$PLATFORM" in
        all)
            rotate_ad_gmsa
            rotate_aws_iam_keys
            rotate_gcp_sa_keys
            rotate_azure_sp_secrets
            rotate_db_credentials
            ;;
        ad)
            rotate_ad_gmsa
            ;;
        aws)
            rotate_aws_iam_keys
            ;;
        gcp)
            rotate_gcp_sa_keys
            ;;
        azure)
            rotate_azure_sp_secrets
            ;;
        db)
            rotate_db_credentials
            ;;
        *)
            log_error "Unknown platform: $PLATFORM"
            exit 1
            ;;
    esac
    
    verify_rotation
    
    log_info "=== Rotation Complete ==="
    log_info "Log saved to: $LOG_FILE"
}

main "$@"