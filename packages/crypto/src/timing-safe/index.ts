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
export function timingSafeEqualBuffer(a: Buffer, b: Buffer): boolean {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    // Still do constant-time-ish work to avoid early return timing leak
    const len = Math.max(a?.length || 0, b?.length || 0);
    let result = len === 0 ? 1 : 0;
    for (let i = 0; i < len; i++) {
      const av = a?.[i] ?? 0;
      const bv = b?.[i] ?? 0;
      result &= av ^ bv;
    }
    return result === 0;
  }
  
  if (a.length !== b.length) {
    // Still compare all bytes of the longer buffer to avoid length timing
    const longer = a.length > b.length ? a : b;
    let result = 1; // lengths differ = false
    for (let i = 0; i < longer.length; i++) {
      result &= longer[i] ^ longer[i]; // always 0, but takes time
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Constant-time comparison of two strings (UTF-8)
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return timingSafeEqualBuffer(ab, bb);
}

/**
 * Constant-time comparison for hex strings
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const len = Math.max(a.length, b.length);
    let result = 1;
    for (let i = 0; i < len; i++) {
      const av = i < a.length ? a.charCodeAt(i) : 0;
      const bv = i < b.length ? b.charCodeAt(i) : 0;
      result &= av ^ bv;
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify HMAC signature (constant-time)
 * 
 * @param payload - Data that was signed
 * @param signature - Received signature
 * @param secret - HMAC secret key
 * @param encoding - Signature encoding ('hex' | 'base64' | 'utf8')
 * @returns true if valid
 */
export function verifyHMAC(
  payload: string | Buffer,
  signature: string,
  secret: string | Buffer,
  encoding: 'hex' | 'base64' | 'utf8' = 'hex'
): boolean {
  const { createHmac } = require('crypto');
  
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const key = Buffer.isBuffer(secret) ? secret : Buffer.from(secret, 'utf8');
  
  const expected = createHmac('sha256', key).update(data).digest(encoding);
  
  if (encoding === 'hex') {
    return timingSafeEqualHex(signature, expected);
  } else if (encoding === 'base64') {
    return timingSafeEqualString(signature, expected);
  } else {
    return timingSafeEqualString(signature, expected);
  }
}

/**
 * Verify webhook signature (supports common formats)
 * 
 * @param payload - Raw request body
 * @param signatureHeader - Signature header value
 * @param secret - Webhook secret
 * @returns true if valid
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signatureHeader: string,
  secret: string | Buffer
): boolean {
  // Format 1: "sha256=hex" (GitHub, Stripe, etc.)
  if (signatureHeader.startsWith('sha256=')) {
    const sig = signatureHeader.slice(7);
    return verifyHMAC(payload, sig, secret, 'hex');
  }
  
  // Format 2: "v1=hex,t=timestamp" (Slack, etc.)
  if (signatureHeader.startsWith('v1=')) {
    const parts = signatureHeader.split(',');
    const sigPart = parts[0].slice(3);
    return verifyHMAC(payload, sigPart, secret, 'hex');
  }
  
  // Format 3: Raw hex/base64
  return verifyHMAC(payload, signatureHeader, secret, 'hex');
}

/**
 * Safe string comparison for tokens/API keys
 * Use instead of === for any secret comparison
 */
export function safeCompare(a: string, b: string): boolean {
  return timingSafeEqualString(a, b);
}

/**
 * Safe buffer comparison for binary secrets
 */
export function safeCompareBuffer(a: Buffer, b: Buffer): boolean {
  return timingSafeEqualBuffer(a, b);
}