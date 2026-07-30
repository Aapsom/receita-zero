/**
 * Shared types for @aapson/crypto
 */

export interface EncryptionContext {
  /** Tenant/client identifier for multi-tenant isolation */
  tenantId?: string;
  /** Field name being encrypted (for blind index context) */
  field?: string;
  /** Record/table identifier */
  recordId?: string;
  /** Additional context for key derivation */
  context?: string;
}

/**
 * Per-tenant encryption keys
 * Used for client PSP credentials and other tenant-isolated data
 */
export interface TenantEncryptionKeys {
  /** Tenant identifier */
  tenantId: string;
  /** Wrapped DEK (encrypted by global KEK) */
  wrappedDek: {
    wrapped: Buffer;
    nonce: Buffer;
    tag: Buffer;
    kekVersion?: string;
  };
  /** When this DEK was created */
  createdAt: string;
  /** When this DEK was last rotated */
  rotatedAt?: string;
  /** KEK version used for wrapping */
  kekVersion: string;
}

/**
 * Key rotation status
 */
export interface KeyRotationStatus {
  /** Current KEK version */
  currentKekVersion: string;
  /** Previous KEK version (if rotating) */
  previousKekVersion?: string;
  /** Number of DEKs wrapped with current KEK */
  currentDeks: number;
  /** Number of DEKs wrapped with previous KEK (pending rotation) */
  pendingRotation: number;
  /** Rotation started at */
  rotationStartedAt?: string;
  /** Rotation completed at */
  rotationCompletedAt?: string;
}

/**
 * Encryption audit log entry
 */
export interface EncryptionAuditEntry {
  timestamp: string;
  operation: 'encrypt' | 'decrypt' | 'wrap' | 'unwrap' | 'rotate' | 'generate';
  tenantId?: string;
  field?: string;
  kekVersion: string;
  success: boolean;
  error?: string;
}

/**
 * Platform secret (our own secrets, not tenant data)
 * Stored in SOPS+age encrypted .env files, never in DB
 */
export interface PlatformSecret {
  name: string;
  value: string; // Plaintext at runtime, encrypted at rest
  description?: string;
  rotationSchedule?: string; // cron expression
  lastRotated?: string;
  expiresAt?: string;
}