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

// Argon2id password hashing
export { 
  hashPassword, 
  verifyPassword, 
  argon2idConfig,
  type Argon2idConfig,
  type HashResult 
} from './argon2id';

// AEAD encryption (XChaCha20-Poly1305 via sodium-native, AES-256-GCM fallback)
export {
  encrypt,
  decrypt,
  generateKey,
  generateNonce,
  encryptAESGCM,
  decryptAESGCM,
  generateAESGCMKey,
  generateAESGCMIV,
  type AEADKey,
  type EncryptResult,
  type DecryptResult,
  type AESGCMKey,
  type AESGCMEncryptResult,
  type AESGCMDecryptResult,
} from './aead';

// Envelope encryption (DEK per record/tenant, wrapped by KEK)
export {
  encryptEnvelope,
  decryptEnvelope,
  generateDEK,
  wrapDEK,
  unwrapDEK,
  generateTenantKeys,
  encryptForTenant,
  decryptForTenant,
  rotateKEK,
  generateKEK,
  type EnvelopeConfig,
  type EnvelopeResult,
  type WrappedDEK,
  type TenantEncryptionKeys,
} from './envelope';

// Blind index for searchable encrypted fields
export {
  generateBlindIndex,
  verifyBlindIndex,
  generateCompositeBlindIndex,
  blindIndexForSearch,
  type BlindIndexConfig,
  type BlindIndexResult,
} from './blind-index';

// Timing-safe comparison
export {
  timingSafeEqualBuffer,
  timingSafeEqualString,
  timingSafeEqualHex,
  verifyHMAC,
  verifyWebhookSignature,
  safeCompare,
  safeCompareBuffer,
} from './timing-safe';

// Types
export type {
  EncryptionContext,
  TenantEncryptionKeys as TenantEncryptionKeysType,
  KeyRotationStatus,
  EncryptionAuditEntry,
  PlatformSecret,
} from './types';

// Version
export const VERSION = '1.0.0';