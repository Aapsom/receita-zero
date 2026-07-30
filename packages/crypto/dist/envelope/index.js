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
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { generateKey as generateAEADKey, encrypt as aeadEncrypt, decrypt as aeadDecrypt } from '../aead';
/**
 * Get KEK from environment
 */
function getKEK(envVar) {
    const kekB64 = process.env[envVar];
    if (!kekB64) {
        throw new Error(`KEK not configured: ${envVar} env var missing`);
    }
    const kek = Buffer.from(kekB64, 'base64');
    if (kek.length !== 32) {
        throw new Error(`KEK must be 32 bytes (base64 encoded), got ${kek.length}`);
    }
    return kek;
}
/**
 * Generate a new Data Encryption Key (DEK)
 */
export function generateDEK() {
    return generateAEADKey();
}
/**
 * Encrypt a DEK with the KEK (wrap)
 */
export function wrapDEK(dek, config = {}) {
    const kek = getKEK(config.kekEnvVar || 'DATA_KEK');
    const nonce = randomBytes(12); // 96-bit nonce for AES-GCM
    const cipher = createCipheriv('aes-256-gcm', kek, nonce);
    const wrapped = Buffer.concat([cipher.update(dek.key), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        wrapped,
        nonce,
        tag,
        kekVersion: process.env.DATA_KEK_VERSION || 'v1',
    };
}
/**
 * Decrypt a DEK with the KEK (unwrap)
 */
export function unwrapDEK(wrappedDek, config = {}) {
    const kek = getKEK(config.kekEnvVar || 'DATA_KEK');
    const decipher = createDecipheriv('aes-256-gcm', kek, wrappedDek.nonce);
    decipher.setAuthTag(wrappedDek.tag);
    const dekKey = Buffer.concat([decipher.update(wrappedDek.wrapped), decipher.final()]);
    return { key: dekKey };
}
/**
 * Full envelope encryption: encrypt data with DEK, wrap DEK with KEK
 */
export function encryptEnvelope(plaintext, config = {}, associatedData) {
    // 1. Generate DEK
    const dek = generateDEK();
    // 2. Encrypt plaintext with DEK
    const { ciphertext, nonce, tag } = aeadEncrypt(plaintext, dek, undefined, associatedData);
    // 3. Wrap DEK with KEK
    const wrappedDek = wrapDEK(dek, config);
    return {
        ciphertext,
        nonce,
        tag,
        wrappedDek: wrappedDek.wrapped,
        wrappedDekNonce: wrappedDek.nonce,
        wrappedDekTag: wrappedDek.tag,
        kekVersion: wrappedDek.kekVersion,
    };
}
/**
 * Full envelope decryption: unwrap DEK with KEK, decrypt data with DEK
 */
export function decryptEnvelope(envelope, config = {}, associatedData) {
    // 1. Unwrap DEK
    const wrappedDek = {
        wrapped: envelope.wrappedDek,
        nonce: envelope.wrappedDekNonce,
        tag: envelope.wrappedDekTag,
        kekVersion: envelope.kekVersion,
    };
    const dek = unwrapDEK(wrappedDek, config);
    // 2. Decrypt data with DEK
    const { plaintext } = aeadDecrypt(envelope.ciphertext, dek, envelope.nonce, envelope.tag, associatedData);
    return plaintext;
}
/**
 * Generate encryption keys for a new tenant
 */
export function generateTenantKeys(tenantId, config = { kekEnvVar: 'DATA_KEK' }) {
    const dek = generateDEK();
    const wrappedDek = wrapDEK(dek, config);
    return {
        tenantId,
        wrappedDek: { ...wrappedDek, kekVersion: config.kekEnvVar },
        kekVersion: config.kekEnvVar,
        createdAt: new Date().toISOString(),
    };
}
/**
 * Encrypt tenant-specific data (client PSP tokens, PII, etc.)
 */
export function encryptForTenant(plaintext, tenantKeys, config = { kekEnvVar: 'DATA_KEK' }, aad) {
    // Unwrap tenant's DEK
    const dek = unwrapDEK(tenantKeys.wrappedDek, config);
    // Encrypt with tenant's DEK
    const pt = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    const { ciphertext, nonce } = aeadEncrypt(pt, dek, undefined, aad);
    return { ciphertext, nonce };
}
/**
 * Decrypt tenant-specific data
 */
export function decryptForTenant(envelope, config = { kekEnvVar: 'DATA_KEK' }, aad) {
    const dek = unwrapDEK(envelope.tenantKeys.wrappedDek, config);
    return aeadDecrypt(envelope.ciphertext, dek, envelope.nonce, aad).plaintext;
}
/**
 * Rotate KEK: re-wrap all DEKs with new KEK
 * Call after updating DATA_KEK env var
 */
export function rotateKEK(wrappedDeks, oldConfig, newConfig) {
    return wrappedDeks.map(wrappedDek => {
        // Unwrap with old KEK
        const dek = unwrapDEK(wrappedDek, oldConfig);
        // Wrap with new KEK
        return wrapDEK(dek, newConfig);
    });
}
