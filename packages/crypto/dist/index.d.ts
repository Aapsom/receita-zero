/**
 * @aapson/crypto - Shared cryptographic primitives for AAPSON products
 *
 * Security Standards (per CEO decision 28/jul/2026):
 * - Passwords: Argon2id (m=19456KiB, t=2, p=1) + pepper in ENV
 * - Recoverable data (Pix keys, bank accounts, CPF, client PSP credentials):
 *   XChaCha20-Poly1305 (sodium-native) or AES-256-GCM with envelope encryption
 *   (DEK per record encrypted by KEK in ENV/KMS) + HMAC-SHA256 blind index for search
 * - Platform secrets (our MP token, service keys, webhook secrets):
 *   SOPS+age encrypted ENV; evaluate Infisical self-hosted
 * - Client PSP credentials (multi-tenant): AEAD + envelope with DEK PER TENANT
 *   (global KEK in ENV); decrypt only in memory at use; UI masks (APP_USR-****1234); never log
 * - Token comparisons: crypto.timingSafeEqual (constant-time)
 * - Supabase: prefer Supabase Vault/pgsodium when product runs there
 */
export { hashPassword, verifyPassword, argon2idConfig, type Argon2idConfig, type HashResult } from './argon2id';
export { encrypt, decrypt, generateKey, generateNonce, encryptAESGCM, decryptAESGCM, generateAESGCMKey, generateAESGCMIV, type AEADKey, type EncryptResult, type DecryptResult, type AESGCMKey, type AESGCMEncryptResult, type AESGCMDecryptResult, } from './aead';
export { encryptEnvelope, decryptEnvelope, generateDEK, wrapDEK, unwrapDEK, generateTenantKeys, encryptForTenant, decryptForTenant, rotateKEK, generateKEK, type EnvelopeConfig, type EnvelopeResult, type WrappedDEK, type TenantEncryptionKeys, } from './envelope';
export { generateBlindIndex, verifyBlindIndex, generateCompositeBlindIndex, blindIndexForSearch, type BlindIndexConfig, type BlindIndexResult, } from './blind-index';
export { timingSafeEqualBuffer, timingSafeEqualString, timingSafeEqualHex, verifyHMAC, verifyWebhookSignature, safeCompare, safeCompareBuffer, } from './timing-safe';
export type { EncryptionContext, TenantEncryptionKeys as TenantEncryptionKeysType, KeyRotationStatus, EncryptionAuditEntry, PlatformSecret, } from './types';
export declare const VERSION = "1.0.0";
//# sourceMappingURL=index.d.ts.map