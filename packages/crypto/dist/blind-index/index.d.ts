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
export interface BlindIndexConfig {
    /** ENV var for blind index key (default: 'BLIND_INDEX_KEY') */
    keyEnvVar?: string;
    /** HMAC output length in bytes (default: 32, full SHA-256) */
    keyLength?: number;
    /** Truncate to N bytes for smaller index (default: 16, 128-bit) */
    truncate?: number;
    /** Domain separation context (e.g., 'pix-key', 'cpf', 'email') */
    context?: string;
}
export interface BlindIndexResult {
    index: Buffer;
    indexHex: string;
    fullHmac: Buffer;
}
/**
 * Generate blind index for a plaintext value
 *
 * @param plaintext - Value to index (e.g., PIX key, CPF, email)
 * @param config - Blind index configuration
 * @returns BlindIndexResult with index, hex string, and full HMAC
 */
export declare function generateBlindIndex(plaintext: string | Buffer, config?: BlindIndexConfig): BlindIndexResult;
/**
 * Verify a plaintext value matches a stored blind index
 *
 * @param plaintext - Value to check
 * @param storedIndexHex - Stored blind index (hex string)
 * @param config - Blind index configuration (must match generation)
 * @returns true if blind index matches
 */
export declare function verifyBlindIndex(plaintext: string | Buffer, storedIndexHex: string, config?: BlindIndexConfig): boolean;
/**
 * Generate composite blind index (for multi-field search)
 *
 * @param fields - Object with field names and values
 * @param config - Base blind index config
 * @returns Composite blind index for the combined fields
 */
export declare function generateCompositeBlindIndex(fields: Record<string, string | Buffer>, config?: BlindIndexConfig): BlindIndexResult;
/**
 * Generate blind index for search term (same as generateBlindIndex but semantic naming)
 */
export declare function blindIndexForSearch(searchTerm: string | Buffer, config?: BlindIndexConfig): BlindIndexResult;
/**
 * Create a blind index key (run once, store in secret manager)
 *
 * @returns Base64-encoded 32-byte key
 */
export declare function generateBlindIndexKey(): string;
/**
 * Rotate blind index key: recompute all indexes with new key
 * Must be run as batch job after updating BLIND_INDEX_KEY env var
 *
 * @param plaintexts - Array of plaintext values
 * @param oldConfig - Config with old key env var
 * @param newConfig - Config with new key env var
 * @returns Map of plaintext -> new blind index hex
 */
export declare function rotateBlindIndexKey(plaintexts: (string | Buffer)[], oldConfig: BlindIndexConfig, newConfig: BlindIndexConfig): Map<string, string>;
//# sourceMappingURL=index.d.ts.map