/**
 * Argon2id Password Hashing
 *
 * OWASP-recommended password hashing algorithm (2023+)
 *
 * Parameters (OWASP minimum as of 2024):
 * - Memory: 19,456 KiB (19 MiB) - m=19456
 * - Iterations: 2 - t=2
 * - Parallelism: 1 - p=1
 *
 * These parameters are calibrated for ~100ms hash time on modern CPUs
 * Adjust based on your hardware and threat model.
 *
 * NEVER use bcrypt, scrypt, or PBKDF2 for NEW password hashing.
 * Argon2id is the only algorithm that resists both GPU and side-channel attacks.
 */
/**
 * Argon2id configuration
 * OWASP recommended minimums (2024)
 */
export interface Argon2Config {
    /** Memory cost in KiB (default: 19456 = 19 MiB) */
    memoryCost?: number;
    /** Time cost (iterations) (default: 2) */
    timeCost?: number;
    /** Parallelism (default: 1) */
    parallelism?: number;
    /** Hash length in bytes (default: 32) */
    hashLength?: number;
    /** Salt length in bytes (default: 16) */
    saltLength?: number;
    /** Secret/pepper for additional security (optional) */
    secret?: Buffer;
    /** Associated data (optional) */
    associatedData?: Buffer;
}
export interface Argon2HashResult {
    /** Full encoded hash (PHC string format) */
    hash: string;
    /** Raw hash bytes (without encoding) */
    hashRaw: Buffer;
    /** Salt used */
    salt: Buffer;
    /** Parameters used */
    params: Required<Argon2Config>;
}
/**
 * Default OWASP-recommended configuration
 */
export declare const DEFAULT_ARGON2_CONFIG: Required<Argon2Config>;
/**
 * Hash a password with Argon2id
 *
 * @param password - Plaintext password
 * @param config - Argon2id configuration (uses OWASP defaults if omitted)
 * @returns Argon2HashResult with PHC-formatted hash
 */
export declare function hashPassword(password: string, config?: Argon2Config): Promise<Argon2HashResult>;
/**
 * Verify a password against an Argon2id hash
 *
 * @param password - Plaintext password to verify
 * @param hash - PHC-formatted hash from hashPassword
 * @param config - Optional config (extracted from hash if not provided)
 * @returns true if password matches
 */
export declare function verifyPassword(password: string, hash: string, config?: Argon2Config): Promise<boolean>;
/**
 * Check if a hash needs rehashing (parameters updated)
 *
 * @param hash - PHC-formatted hash
 * @param config - Current desired config
 * @returns true if rehash needed
 */
export declare function needsRehash(hash: string, config?: Argon2Config): boolean;
/**
 * Get pepper (secret) from environment for additional security
 * Pepper is a secret value added to ALL password hashes
 * Stored ONLY in environment, never in database
 *
 * @param envVar - Environment variable name (default: 'PASSWORD_PEPPER')
 * @returns Buffer or empty if not configured
 */
export declare function getPepper(envVar?: string): Buffer;
/**
 * Generate a new pepper (run once, store in secret manager)
 *
 * @returns Base64-encoded 32-byte pepper
 */
export declare function generatePepper(): string;
/**
 * Argon2id parameter recommendations by use case
 */
export declare const ARGON2_PRESETS: {
    /** OWASP 2024 minimum - suitable for most web apps */
    owasp2024: {
        memoryCost: number;
        timeCost: number;
        parallelism: number;
    };
    /** Higher security for sensitive systems (banking, auth providers) */
    highSecurity: {
        memoryCost: number;
        timeCost: number;
        parallelism: number;
    };
    /** Maximum security for critical systems */
    maximum: {
        memoryCost: number;
        timeCost: number;
        parallelism: number;
    };
    /** Fast for testing/CI only - NEVER use in production */
    testing: {
        memoryCost: number;
        timeCost: number;
        parallelism: number;
    };
};
/**
 * Calibrate Argon2 parameters for your hardware
 * Run once during setup to find optimal parameters for target time
 *
 * @param targetTimeMs - Target hash time in milliseconds (default: 100)
 * @param maxMemoryKiB - Maximum memory in KiB (default: 65536)
 * @returns Recommended config
 */
export declare function calibrateArgon2(targetTimeMs?: number, maxMemoryKiB?: number): Promise<Argon2Config>;
//# sourceMappingURL=index.d.ts.map