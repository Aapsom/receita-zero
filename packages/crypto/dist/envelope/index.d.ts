/**
 * Envelope Encryption
 *
 * Pattern: DEK (Data Encryption Key) per record/tenant, encrypted by KEK (Key Encryption Key)
 *
 * Architecture:
 * - KEK: Stored in ENV (DATA_KEK) or KMS (AWS KMS, GCP KMS, Azure Key Vault)
 * - DEK: Generated per record/tenant, encrypted by KEK, stored alongside ciphertext
 * - Use case: Multi-tenant SaaS where each tenant/client has isolated encryption keys
 *
 * For client PSP tokens (multi-tenant): DEK PER TENANT
 * For platform secrets: DEK PER RECORD, KEK from ENV/KMS
 */
import { type AEADKey } from '../aead';
export interface EnvelopeConfig {
    kekEnvVar?: string;
    kekKeyId?: string;
    algorithm?: 'aes-256-gcm';
}
export interface WrappedDEK {
    wrapped: Buffer;
    nonce: Buffer;
    tag: Buffer;
    kekVersion?: string;
}
export interface EnvelopeResult {
    ciphertext: Buffer;
    nonce: Buffer;
    tag: Buffer;
    wrappedDek: Buffer;
    wrappedDekNonce: Buffer;
    wrappedDekTag: Buffer;
    kekVersion?: string;
}
/**
 * Generate a new Data Encryption Key (DEK)
 */
export declare function generateDEK(): AEADKey;
/**
 * Encrypt a DEK with the KEK (wrap)
 */
export declare function wrapDEK(dek: AEADKey, config?: EnvelopeConfig): WrappedDEK;
/**
 * Decrypt a DEK with the KEK (unwrap)
 */
export declare function unwrapDEK(wrappedDek: WrappedDEK, config?: EnvelopeConfig): AEADKey;
/**
 * Full envelope encryption: encrypt data with DEK, wrap DEK with KEK
 */
export declare function encryptEnvelope(plaintext: Buffer | string, config?: EnvelopeConfig, associatedData?: Buffer): EnvelopeResult;
/**
 * Full envelope decryption: unwrap DEK with KEK, decrypt data with DEK
 */
export declare function decryptEnvelope(envelope: EnvelopeResult, config?: EnvelopeConfig, associatedData?: Buffer): Buffer;
/**
 * Multi-tenant pattern: encrypt for specific tenant
 * Each tenant has their own DEK, all DEKs wrapped by global KEK
 */
export interface TenantEncryptionKeys {
    tenantId: string;
    wrappedDek: WrappedDEK;
    kekVersion: string;
    createdAt: string;
    rotatedAt?: string;
}
/**
 * Generate encryption keys for a new tenant
 */
export declare function generateTenantKeys(tenantId: string, config?: EnvelopeConfig): TenantEncryptionKeys;
/**
 * Encrypt tenant-specific data (client PSP tokens, PII, etc.)
 */
export declare function encryptForTenant(plaintext: Buffer | string, tenantKeys: TenantEncryptionKeys, config?: EnvelopeConfig, aad?: Buffer): Omit<EnvelopeResult, 'wrappedDek' | 'wrappedDekNonce' | 'wrappedDekTag' | 'kekVersion'>;
/**
 * Decrypt tenant-specific data
 */
export declare function decryptForTenant(envelope: Omit<EnvelopeResult, 'wrappedDek' | 'wrappedDekNonce' | 'wrappedDekTag' | 'kekVersion'> & {
    tenantKeys: TenantEncryptionKeys;
}, config?: EnvelopeConfig, aad?: Buffer): Buffer;
/**
 * Rotate KEK: re-wrap all DEKs with new KEK
 * Call after updating DATA_KEK env var
 */
export declare function rotateKEK(wrappedDeks: WrappedDEK[], oldConfig: EnvelopeConfig, newConfig: EnvelopeConfig): WrappedDEK[];
//# sourceMappingURL=index.d.ts.map