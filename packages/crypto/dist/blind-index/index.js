/**
 * Blind Index for Searchable Encrypted Fields
 *
 * Allows searching encrypted fields without decrypting them.
 * Uses HMAC-SHA256 with a dedicated blind index key.
 *
 * Security: The blind index key MUST be different from the encryption key.
 * Store blind index key separately (e.g., BLIND_INDEX_KEY env var).
 *
 * Usage:
 * - On insert: compute blind index of plaintext, store alongside ciphertext
 * - On search: compute blind index of search term, query by blind index
 * - Returns candidate rows, then decrypt to verify exact match
 */
import { createHmac, randomBytes } from 'crypto';
import { timingSafeEqualBuffer } from './timing-safe';
/**
 * Get blind index key from environment
 */
function getBlindIndexKey(envVar) {
    const keyB64 = process.env[envVar];
    if (!keyB64) {
        throw new Error(`Blind index key not configured: ${envVar} env var missing`);
    }
    const key = Buffer.from(keyB64, 'base64');
    if (key.length !== 32) {
        throw new Error(`Blind index key must be 32 bytes (base64), got ${key.length}`);
    }
    return key;
}
/**
 * Generate blind index for a plaintext value
 *
 * @param plaintext - Value to index (e.g., PIX key, CPF, email)
 * @param config - Blind index configuration
 * @returns BlindIndexResult with index, hex string, and full HMAC
 */
export function generateBlindIndex(plaintext, config = {}) {
    const key = getBlindIndexKey(config.keyEnvVar || 'BLIND_INDEX_KEY');
    const keyLength = config.keyLength || 32;
    const truncate = config.truncate || 16;
    const context = config.context || 'default';
    const data = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    // Domain separation: HMAC(key, context || ':' || data)
    const contextBuf = Buffer.from(context, 'utf8');
    const separator = Buffer.from(':', 'utf8');
    const hmacData = Buffer.concat([contextBuf, separator, data]);
    const fullHmac = createHmac('sha256', key).update(hmacData).digest();
    // Truncate for storage efficiency (16 bytes = 128-bit, sufficient for index)
    const index = fullHmac.subarray(0, truncate);
    return {
        index,
        indexHex: index.toString('hex'),
        fullHmac,
    };
}
/**
 * Verify a plaintext value matches a stored blind index
 *
 * @param plaintext - Value to check
 * @param storedIndexHex - Stored blind index (hex string)
 * @param config - Blind index configuration (must match generation)
 * @returns true if blind index matches
 */
export function verifyBlindIndex(plaintext, storedIndexHex, config = {}) {
    const result = generateBlindIndex(plaintext, config);
    const storedIndex = Buffer.from(storedIndexHex, 'hex');
    // Constant-time comparison
    return timingSafeEqualBuffer(result.index, storedIndex);
}
/**
 * Generate composite blind index (for multi-field search)
 *
 * @param fields - Object with field names and values
 * @param config - Base blind index config
 * @returns Composite blind index for the combined fields
 */
export function generateCompositeBlindIndex(fields, config = {}) {
    // Sort fields for deterministic ordering
    const sortedKeys = Object.keys(fields).sort();
    const parts = sortedKeys.map(k => {
        const val = fields[k];
        return `${k}=${Buffer.isBuffer(val) ? val.toString('utf8') : val}`;
    });
    const composite = parts.join('|');
    return generateBlindIndex(composite, { ...config, context: `${config.context || 'default'}-composite` });
}
/**
 * Generate blind index for search term (same as generateBlindIndex but semantic naming)
 */
export function blindIndexForSearch(searchTerm, config = {}) {
    return generateBlindIndex(searchTerm, config);
}
/**
 * Create a blind index key (run once, store in secret manager)
 *
 * @returns Base64-encoded 32-byte key
 */
export function generateBlindIndexKey() {
    return randomBytes(32).toString('base64');
}
/**
 * Rotate blind index key: recompute all indexes with new key
 * Must be run as batch job after updating BLIND_INDEX_KEY env var
 *
 * @param plaintexts - Array of plaintext values
 * @param oldConfig - Config with old key env var
 * @param newConfig - Config with new key env var
 * @returns Map of plaintext -> new blind index hex
 */
export function rotateBlindIndexKey(plaintexts, oldConfig, newConfig) {
    const results = new Map();
    for (const pt of plaintexts) {
        const ptStr = Buffer.isBuffer(pt) ? pt.toString('utf8') : pt;
        const newResult = generateBlindIndex(pt, newConfig);
        results.set(ptStr, newResult.indexHex);
    }
    return results;
}
