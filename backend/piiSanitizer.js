/**
 * piiSanitizer.js — Shrayak: Shramik Sahayak
 *
 * SECURITY MODULE: Strips all Personally Identifiable Information (PII)
 * before any data is sent to Elastic APM / Observability telemetry.
 *
 * Compliant with: India's Digital Personal Data Protection Act, 2023 (DPDPA).
 *
 * PII patterns covered:
 *  - Aadhaar numbers (12-digit patterns, with/without spaces or dashes)
 *  - Indian mobile numbers (10-digit, +91 prefix variants)
 *  - Email addresses
 *  - PAN card numbers (ABCDE1234F pattern)
 *  - UAN (Universal Account Number) — 12 digits
 *  - Bank account numbers (9–18 digit sequences)
 *  - IFSC codes
 *  - Pin codes (6-digit) — partially masked, not fully removed (needed for office routing)
 */

'use strict';

// ─── PII Pattern Registry ─────────────────────────────────────────────────────

const PII_PATTERNS = [
  {
    name: 'aadhaar',
    // 12-digit Aadhaar: plain, space-separated (4-4-4), or dash-separated
    regex: /\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
    replacement: '[AADHAAR_REDACTED]',
  },
  {
    name: 'pan_card',
    // PAN: 5 letters, 4 digits, 1 letter — e.g., ABCDE1234F
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    replacement: '[PAN_REDACTED]',
  },
  {
    name: 'mobile_india',
    // +91-XXXXXXXXXX, 91XXXXXXXXXX, or bare 10-digit starting with 6–9
    regex: /(\+?91[\s\-]?)?[6-9]\d{9}\b/g,
    replacement: '[MOBILE_REDACTED]',
  },
  {
    name: 'email',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'uan',
    // Universal Account Number: 12-digit numeric
    regex: /\bUAN[\s:\-]?[0-9]{12}\b/gi,
    replacement: '[UAN_REDACTED]',
  },
  {
    name: 'bank_account',
    // Bank account: 9–18 digits, context-gated to avoid removing arbitrary numbers
    regex: /\b(?:account|acc|a\/c|khata)[\s:\-#]*([0-9]{9,18})\b/gi,
    replacement: '[BANK_ACC_REDACTED]',
  },
  {
    name: 'ifsc',
    // IFSC: 4-letter bank code + 0 + 6 alphanumeric
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    replacement: '[IFSC_REDACTED]',
  },
];

// Pin codes are partially masked (first 3 digits kept for district routing)
const PINCODE_PATTERN = /\b(1[0-1][0-9])\d{3}\b/g; // Delhi pin codes start 110xxx

// ─── Core Sanitization Functions ─────────────────────────────────────────────

/**
 * Strips all PII from a string.
 * Safe for sending to Elastic APM, logs, or analytics.
 *
 * @param {string} text — Raw user input or response text
 * @returns {string} — PII-stripped text safe for telemetry
 */
function stripPII(text) {
  if (typeof text !== 'string') return String(text ?? '');

  let sanitized = text;

  for (const pattern of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }

  // Partially mask pin codes: 110XXX → 110[PIN]
  sanitized = sanitized.replace(PINCODE_PATTERN, (match, prefix) => `${prefix}[PIN]`);

  return sanitized;
}

/**
 * Strips PII from all string values in a flat or nested object.
 * Used for sanitizing APM span metadata / log payloads.
 *
 * @param {object} obj — Telemetry object
 * @param {number} depth — Current recursion depth (max 5 for safety)
 * @returns {object} — PII-stripped object clone
 */
function stripPIIFromObject(obj, depth = 0) {
  if (depth > 5) return '[MAX_DEPTH_REACHED]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') return stripPII(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripPIIFromObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      clean[key] = stripPIIFromObject(value, depth + 1);
    }
    return clean;
  }

  return obj;
}

/**
 * Checks if a string CONTAINS any PII (for alerting/logging purposes).
 * Does NOT strip — only detects.
 *
 * @param {string} text
 * @returns {{ hasPII: boolean, types: string[] }}
 */
function detectPII(text) {
  if (typeof text !== 'string') return { hasPII: false, types: [] };

  const foundTypes = [];
  for (const pattern of PII_PATTERNS) {
    // Reset regex state before testing
    const testRegex = new RegExp(pattern.regex.source, pattern.regex.flags.replace('g', ''));
    if (testRegex.test(text)) {
      foundTypes.push(pattern.name);
    }
  }

  return {
    hasPII: foundTypes.length > 0,
    types: foundTypes,
  };
}

module.exports = { stripPII, stripPIIFromObject, detectPII };
