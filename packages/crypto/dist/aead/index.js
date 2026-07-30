/**
 * AEAD Encryption - XChaCha20-Poly1305 via sodium-native
 *
 * For recoverable data (Pix keys, bank accounts, CPF, client PSP tokens).
 * Uses XChaCha20-Poly1305 (256-bit key, 192-bit nonce, 128-bit tag).
 *
 * Alternative: AES-256-GCM (Web Crypto API compatible) - see encryptAESGCM/decryptAESGCM
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import * as sodium from 'sodium-native';
// XChaCha20-Poly1305 constants
const XCHACHA20POLY1305_KEYBYTES = 32;
const XCHACHA20POLY1305_NONCEBYTES = 24;
const XCHACHA20POLY1305_TAGBYTES = 16;
/**
 * Generate a random 256-bit key for XChaCha20-Poly1305
 */
export function generateKey() {
    const key = Buffer.alloc(XCHACHA20POLY1305_KEYBYTES);
    sodium.randombytes_buf(key);
    return { key };
}
/**
 * Generate a random 192-bit nonce for XChaCha20-Poly1305
 */
export function generateNonce() {
    const nonce = Buffer.alloc(XCHACHA20POLY1305_NONCEBYTES);
    sodium.randombytes_buf(nonce);
    return nonce;
}
/**
 * Encrypt plaintext using XChaCha20-Poly1305
 *
 * @param plaintext - Data to encrypt
 * @param key - 32-byte key from generateKey()
 * @param nonce - Optional 24-byte nonce (generated if not provided)
 * @param associatedData - Optional AAD (not encrypted, but authenticated)
 * @returns EncryptResult with ciphertext, nonce, and tag
 */
export function encrypt(plaintext, key, nonce, associatedData) {
    const pt = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    const n = nonce || generateNonce();
    // Validate key length
    if (key.key.length !== XCHACHA20POLY1305_KEYBYTES) {
        throw new Error(`Invalid key length: expected ${XCHACHA20POLY1305_KEYBYTES}, got ${key.key.length}`);
    }
    if (n.length !== XCHACHA20POLY1305_NONCEBYTES) {
        throw new Error(`Invalid nonce length: expected ${XCHACHA20POLY1305_NONCEBYTES}, got ${n.length}`);
    }
    // sodium crypto_aead_xchacha20poly1305_ietf_encrypt
    // Returns ciphertext with tag appended
    const ciphertextWithTag = Buffer.alloc(pt.length + XCHACHA20POLY1305_TAGBYTES);
    const ad = associatedData || Buffer.alloc(0);
    sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(ciphertextWithTag, pt, ad, null, // no secret nonce
    n, key.key);
    // Split ciphertext and tag (tag is last 16 bytes)
    const actualCiphertext = ciphertextWithTag.subarray(0, pt.length);
    const tag = ciphertextWithTag.subarray(pt.length);
    return { ciphertext: actualCiphertext, nonce: n, tag };
}
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
export function decrypt(ciphertext, key, nonce, tag, associatedData) {
    // Validate lengths
    if (key.key.length !== XCHACHA20POLY1305_KEYBYTES) {
        throw new Error(`Invalid key length: expected ${XCHACHA20POLY1305_KEYBYTES}, got ${key.key.length}`);
    }
    if (nonce.length !== XCHACHA20POLY1305_NONCEBYTES) {
        throw new Error(`Invalid nonce length: expected ${XCHACHA20POLY1305_NONCEBYTES}, got ${nonce.length}`);
    }
    if (tag.length !== XCHACHA20POLY1305_TAGBYTES) {
        throw new Error(`Invalid tag length: expected ${XCHACHA20POLY1305_TAGBYTES}, got ${tag.length}`);
    }
    // Combine ciphertext + tag for sodium decrypt
    const ciphertextWithTag = Buffer.concat([ciphertext, tag]);
    const ad = associatedData || Buffer.alloc(0);
    const plaintext = Buffer.alloc(ciphertext.length);
    const success = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(plaintext, null, // no secret nonce
    ciphertextWithTag, ad, nonce, key.key);
    if (!success) {
        throw new Error('Decryption failed: authentication tag mismatch (data tampered or wrong key)');
    }
    return { plaintext };
}
/**
 * AES-256-GCM encryption (Web Crypto API compatible)
 * Use when you need compatibility with browser crypto.subtle
 */
const AES_GCM_KEYBYTES = 32;
const AES_GCM_IVBYTES = 12;
const AES_GCM_TAGBYTES = 16;
/**
 * Generate AES-256-GCM key
 */
export function generateAESGCMKey() {
    return { key: randomBytes(AES_GCM_KEYBYTES) };
}
/**
 * Generate AES-GCM IV (96-bit)
 */
export function generateAESGCMIV() {
    return randomBytes(AES_GCM_IVBYTES);
}
/**
 * Encrypt with AES-256-GCM
 */
export function encryptAESGCM(plaintext, key, iv, associatedData) {
    const pt = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    const i = iv || generateAESGCMIV();
    if (key.key.length !== AES_GCM_KEYBYTES) {
        throw new Error('AES-256-GCM key must be 32 bytes');
    }
    if (i.length !== AES_GCM_IVBYTES) {
        throw new Error('AES-GCM IV must be 12 bytes');
    }
    const cipher = createCipheriv('aes-256-gcm', key.key, i);
    if (associatedData) {
        cipher.setAAD(Buffer.isBuffer(associatedData) ? associatedData : Buffer.from(associatedData));
    }
    const ciphertext = Buffer.concat([cipher.update(pt), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext, iv: i, tag };
}
/**
 * Decrypt with AES-256-GCM
 */
export function decryptAESGCM(ciphertext, key, iv, tag, associatedData) {
    if (key.key.length !== AES_GCM_KEYBYTES) {
        throw new Error('AES-256-GCM key must be 32 bytes');
    }
    if (iv.length !== AES_GCM_IVBYTES) {
        throw new Error('AES-GCM IV must be 12 bytes');
    }
    if (tag.length !== AES_GCM_TAGBYTES) {
        throw new Error('AES-GCM tag must be 16 bytes');
    }
    const decipher = createDecipheriv('aes-256-gcm', key.key, iv);
    decipher.setAuthTag(tag);
    if (associatedData) {
        decipher.setAAD(Buffer.isBuffer(associatedData) ? associatedData : Buffer.from(associatedData));
    }
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return { plaintext };
}
