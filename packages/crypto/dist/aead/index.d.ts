/**
 * AEAD Encryption - XChaCha20-Poly1305 via sodium-native
 *
 * For recoverable data (Pix keys, bank accounts, CPF, client PSP tokens).
 * Uses XChaCha20-Poly1305 (256-bit key, 192-bit nonce, 128-bit tag).
 *
 * Alternative: AES-256-GCM (Web Crypto API compatible) - see encryptAESGCM/decryptAESGCM
 */
export interface AEADKey {
    key: Buffer;
}
export interface EncryptResult {
    ciphertext: Buffer;
    nonce: Buffer;
    tag: Buffer;
}
export interface DecryptResult {
    plaintext: Buffer;
}
/**
 * Generate a random 256-bit key for XChaCha20-Poly1305
 */
export declare function generateKey(): AEADKey;
/**
 * Generate a random 192-bit nonce for XChaCha20-Poly1305
 */
export declare function generateNonce(): Buffer;
/**
 * Encrypt plaintext using XChaCha20-Poly1305
 *
 * @param plaintext - Data to encrypt
 * @param key - 32-byte key from generateKey()
 * @param nonce - Optional 24-byte nonce (generated if not provided)
 * @param associatedData - Optional AAD (not encrypted, but authenticated)
 * @returns EncryptResult with ciphertext, nonce, and tag
 */
export declare function encrypt(plaintext: Buffer | string, key: AEADKey, nonce?: Buffer, associatedData?: Buffer): EncryptResult;
/**
 * Decrypt ciphertext using XChaCha20-Poly1305
 *
 * @param ciphertext - Encrypted data (without tag)
 * @param key - 32-byte key
 * @param nonce - 24-byte nonce used for encryption
 * @param tag - 16-byte authentication tag
 * @param associatedData - Optional AAD used during encryption
 * @returns Decrypted plaintext
 * @throws Error if authentication fails
 */
export declare function decrypt(ciphertext: Buffer, key: AEADKey, nonce: Buffer, tag: Buffer, associatedData?: Buffer): DecryptResult;
export interface AESGCMKey {
    key: Buffer;
}
export interface AESGCMEncryptResult {
    ciphertext: Buffer;
    iv: Buffer;
    tag: Buffer;
}
export interface AESGCMDecryptResult {
    plaintext: Buffer;
}
/**
 * Generate AES-256-GCM key
 */
export declare function generateAESGCMKey(): AESGCMKey;
/**
 * Generate AES-GCM IV (96-bit)
 */
export declare function generateAESGCMIV(): Buffer;
/**
 * Encrypt with AES-256-GCM
 */
export declare function encryptAESGCM(plaintext: Buffer | string, key: AESGCMKey, iv?: Buffer, associatedData?: Buffer): AESGCMEncryptResult;
/**
 * Decrypt with AES-256-GCM
 */
export declare function decryptAESGCM(ciphertext: Buffer, key: AESGCMKey, iv: Buffer, tag: Buffer, associatedData?: Buffer): AESGCMDecryptResult;
//# sourceMappingURL=index.d.ts.map