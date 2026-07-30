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

import { randomBytes, timingSafeEqual } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let argon2: any;

try {
  argon2 = require('argon2');
} catch {
  // Fallback for environments without native argon2
  console.warn('argon2 native module not available, using fallback (NOT FOR PRODUCTION)');
}

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
export const DEFAULT_ARGON2_CONFIG: Required<Argon2Config> = {
  memoryCost: 19456,   // 19 MiB
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
  secret: Buffer.alloc(0),
  associatedData: Buffer.alloc(0),
};

/**
 * Hash a password with Argon2id
 * 
 * @param password - Plaintext password
 * @param config - Argon2id configuration (uses OWASP defaults if omitted)
 * @returns Argon2HashResult with PHC-formatted hash
 */
export async function hashPassword(
  password: string,
  config: Argon2Config = {}
): Promise<Argon2HashResult> {
  if (!argon2) {
    throw new Error('argon2 module not available. Install with: npm install argon2');
  }
  
  const params: Required<Argon2Config> = {
    ...DEFAULT_ARGON2_CONFIG,
    ...config,
  };
  
  const salt = randomBytes(params.saltLength);
  
  const options: any = {
    type: argon2.argon2id,
    memoryCost: params.memoryCost,
    timeCost: params.timeCost,
    parallelism: params.parallelism,
    hashLength: params.hashLength,
    salt,
  };
  
  if (params.secret && params.secret.length > 0) {
    options.secret = params.secret;
  }
  if (params.associatedData && params.associatedData.length > 0) {
    options.associatedData = params.associatedData;
  }
  
  const hash = await argon2.hash(password, options);
  
  // Extract raw hash from PHC string (last segment after $)
  const hashParts = hash.split('$');
  const hashRaw = Buffer.from(hashParts[hashParts.length - 1], 'base64');
  
  return {
    hash,
    hashRaw,
    salt,
    params,
  };
}

/**
 * Verify a password against an Argon2id hash
 * 
 * @param password - Plaintext password to verify
 * @param hash - PHC-formatted hash from hashPassword
 * @param config - Optional config (extracted from hash if not provided)
 * @returns true if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string,
  config?: Argon2Config
): Promise<boolean> {
  if (!argon2) {
    throw new Error('argon2 module not available');
  }
  
  try {
    // argon2.verify extracts params from PHC string automatically
    const options: any = {};
    if (config?.secret) options.secret = config.secret;
    if (config?.associatedData) options.associatedData = config.associatedData;
    
    return await argon2.verify(hash, password, options);
  } catch {
    return false;
  }
}

/**
 * Check if a hash needs rehashing (parameters updated)
 * 
 * @param hash - PHC-formatted hash
 * @param config - Current desired config
 * @returns true if rehash needed
 */
export function needsRehash(hash: string, config: Argon2Config = {}): boolean {
  if (!argon2) {
    return true; // Can't verify, assume needs rehash
  }
  
  try {
    const options: any = {};
    if (config.secret) options.secret = config.secret;
    if (config.associatedData) options.associatedData = config.associatedData;
    
    return argon2.needsRehash(hash, options);
  } catch {
    return true;
  }
}

/**
 * Get pepper (secret) from environment for additional security
 * Pepper is a secret value added to ALL password hashes
 * Stored ONLY in environment, never in database
 * 
 * @param envVar - Environment variable name (default: 'PASSWORD_PEPPER')
 * @returns Buffer or empty if not configured
 */
export function getPepper(envVar: string = 'PASSWORD_PEPPER'): Buffer {
  const pepper = process.env[envVar];
  if (!pepper) {
    return Buffer.alloc(0);
  }
  return Buffer.from(pepper, 'base64');
}

/**
 * Generate a new pepper (run once, store in secret manager)
 * 
 * @returns Base64-encoded 32-byte pepper
 */
export function generatePepper(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Argon2id parameter recommendations by use case
 */
export const ARGON2_PRESETS = {
  /** OWASP 2024 minimum - suitable for most web apps */
  owasp2024: {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  },
  /** Higher security for sensitive systems (banking, auth providers) */
  highSecurity: {
    memoryCost: 65536,  // 64 MiB
    timeCost: 3,
    parallelism: 2,
  },
  /** Maximum security for critical systems */
  maximum: {
    memoryCost: 262144, // 256 MiB
    timeCost: 4,
    parallelism: 4,
  },
  /** Fast for testing/CI only - NEVER use in production */
  testing: {
    memoryCost: 1024,   // 1 MiB
    timeCost: 1,
    parallelism: 1,
  },
};

/**
 * Calibrate Argon2 parameters for your hardware
 * Run once during setup to find optimal parameters for target time
 * 
 * @param targetTimeMs - Target hash time in milliseconds (default: 100)
 * @param maxMemoryKiB - Maximum memory in KiB (default: 65536)
 * @returns Recommended config
 */
export async function calibrateArgon2(
  targetTimeMs: number = 100,
  maxMemoryKiB: number = 65536
): Promise<Argon2Config> {
  if (!argon2) {
    throw new Error('argon2 module not available');
  }
  
  // Use argon2's built-in calibration
  const calibration = await argon2.calibrate({
    timeCost: targetTimeMs,
    memoryCost: maxMemoryKiB,
    parallelism: 1,
  });
  
  return {
    memoryCost: calibration.memoryCost,
    timeCost: calibration.timeCost,
    parallelism: calibration.parallelism,
  };
}