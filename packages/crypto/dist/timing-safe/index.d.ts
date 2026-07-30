/**
 * Timing-Safe Comparison
 *
 * Constant-time comparison to prevent timing attacks on secrets.
 * Use for: HMAC verification, token comparison, signature validation, password hashes.
 *
 * NEVER use === or == for comparing secrets, tokens, HMACs, or passwords.
 * Even small timing differences can be exploited.
 */
import { Buffer } from 'buffer';
/**
 * Constant-time comparison of two Buffers
 * Returns true if equal, false otherwise
 *
 * @param a - First buffer
 * @param b - Second buffer
 * @returns true if equal length and all bytes match
 */
export declare function timingSafeEqualBuffer(a: Buffer, b: Buffer): boolean;
/**
 * Constant-time comparison of two strings (UTF-8)
 */
export declare function timingSafeEqualString(a: string, b: string): boolean;
/**
 * Constant-time comparison for hex strings
 */
export declare function timingSafeEqualHex(a: string, b: string): boolean;
/**
 * Verify HMAC signature (constant-time)
 *
 * @param payload - Data that was signed
 * @param signature - Received signature
 * @param secret - HMAC secret key
 * @param encoding - Signature encoding ('hex' | 'base64' | 'utf8')
 * @returns true if valid
 */
export declare function verifyHMAC(payload: string | Buffer, signature: string, secret: string | Buffer, encoding?: 'hex' | 'base64' | 'utf8'): boolean;
/**
 * Verify webhook signature (supports common formats)
 *
 * @param payload - Raw request body
 * @param signatureHeader - Signature header value
 * @param secret - Webhook secret
 * @returns true if valid
 */
export declare function verifyWebhookSignature(payload: string | Buffer, signatureHeader: string, secret: string | Buffer): boolean;
/**
 * Safe string comparison for tokens/API keys
 * Use instead of === for any secret comparison
 */
export declare function safeCompare(a: string, b: string): boolean;
/**
 * Safe buffer comparison for binary secrets
 */
export declare function safeCompareBuffer(a: Buffer, b: Buffer): boolean;
//# sourceMappingURL=index.d.ts.map