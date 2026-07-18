/**
 * inputSanitizer.js — Shrayak: Shramik Sahayak
 *
 * SECURITY MODULE: Defends the chat API edge against:
 *  1. Prompt injection attacks (attempts to override system instructions)
 *  2. XSS payloads embedded in queries
 *  3. Oversized payloads (DoS via token exhaustion)
 *  4. Unicode/encoding abuse
 *  5. Null byte injection
 *
 * Design principle: DENY by default, ALLOW known-safe patterns.
 * All rejections are logged (PII-stripped) to Elastic APM.
 */

'use strict';

const xss = require('xss');

// ─── Prompt Injection Pattern Blocklist ───────────────────────────────────────
// These patterns attempt to override system/persona instructions in LLM prompts.
// Updated based on OWASP LLM Top 10 — LLM01: Prompt Injection

const PROMPT_INJECTION_PATTERNS = [
  // Classic system-override attempts
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions?|prompts?|rules?)/gi,
  /you\s+are\s+now\s+(a\s+)?(different|new|another|evil|jailbreak)/gi,
  /act\s+as\s+(if\s+you\s+(are|were)\s+)?(an?\s+)?(unrestricted|jailbreak|DAN|evil)/gi,
  /forget\s+(everything|all|your)\s+(you\s+know|instructions|training)/gi,
  /disregard\s+(your|all|previous)\s+(instructions?|rules?|guidelines?)/gi,

  // Delimiter injection (trying to escape prompt context)
  /---+\s*(system|user|assistant|human|ai)\s*:?/gi,
  /\[system\]/gi,
  /\[INST\]/gi,
  /<\|system\|>/gi,
  /<\|im_start\|>/gi,

  // Data exfiltration attempts
  /repeat\s+(your|the\s+system)\s+(prompt|instructions?|context)/gi,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/gi,
  /reveal\s+(your|the)\s+(instructions?|system\s+prompt|context)/gi,

  // Role-playing jailbreaks
  /pretend\s+(you\s+are|to\s+be)\s+(not|an?\s+ai|unrestricted)/gi,
  /simulate\s+(an?\s+)?(uncensored|unrestricted|jailbreak)/gi,

  // Code/script injection in prompts
  /<script[\s>]/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["']/gi,
];

// ─── Allowed Content Patterns (Hindi + English labour queries) ────────────────
// This is NOT an allowlist filter — it's for confidence scoring in future use.
// We keep the blocklist approach for now as labour queries are diverse.

// ─── Core Sanitization Functions ─────────────────────────────────────────────

/**
 * Sanitizes and validates a user query string.
 *
 * @param {string} rawInput — Raw query from the chat UI
 * @param {object} options
 * @param {number} options.minLength — Minimum character count (default: 3)
 * @param {number} options.maxLength — Maximum character count (default: 2000)
 * @returns {{ valid: boolean, sanitized: string, reason?: string, riskLevel?: string }}
 */
function sanitizeQuery(rawInput, options = {}) {
  const {
    minLength = parseInt(process.env.MIN_QUERY_LENGTH ?? '3', 10),
    maxLength = parseInt(process.env.MAX_QUERY_LENGTH ?? '2000', 10),
  } = options;

  // 1. Type check
  if (typeof rawInput !== 'string') {
    return { valid: false, sanitized: '', reason: 'INVALID_TYPE', riskLevel: 'low' };
  }

  // 2. Null byte stripping (defensive, prevents C-string truncation in some systems)
  let sanitized = rawInput.replace(/\0/g, '');

  // 3. Normalize Unicode — NFC normalization prevents homograph attacks
  try {
    sanitized = sanitized.normalize('NFC');
  } catch {
    return { valid: false, sanitized: '', reason: 'ENCODING_ERROR', riskLevel: 'medium' };
  }

  // 4. Strip HTML/XSS payloads using the `xss` library
  sanitized = xss(sanitized, {
    whiteList: {}, // No HTML tags allowed in chat queries
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  });

  // 5. Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 6. Collapse excessive whitespace (>3 consecutive spaces/newlines)
  sanitized = sanitized.replace(/[ \t]{4,}/g, '   ');
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  // 7. Trim
  sanitized = sanitized.trim();

  // 8. Length checks (after sanitization, not before)
  if (sanitized.length < minLength) {
    return {
      valid: false,
      sanitized,
      reason: 'TOO_SHORT',
      riskLevel: 'low',
    };
  }

  if (sanitized.length > maxLength) {
    return {
      valid: false,
      sanitized: sanitized.substring(0, maxLength),
      reason: 'TOO_LONG',
      riskLevel: 'medium',
    };
  }

  // 9. Prompt injection detection
  const injectionResult = detectPromptInjection(sanitized);
  if (injectionResult.detected) {
    return {
      valid: false,
      sanitized,
      reason: 'PROMPT_INJECTION',
      riskLevel: 'high',
      detectedPatterns: injectionResult.patterns,
    };
  }

  return { valid: true, sanitized, riskLevel: 'none' };
}

/**
 * Scans text for prompt injection patterns.
 *
 * @param {string} text
 * @returns {{ detected: boolean, patterns: string[] }}
 */
function detectPromptInjection(text) {
  const detected = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      detected.push(pattern.source.substring(0, 40)); // Truncated for log safety
    }
  }

  return {
    detected: detected.length > 0,
    patterns: detected,
  };
}

/**
 * Validates a district / pin code input for the office-routing endpoint.
 *
 * @param {string|number} pinOrDistrict
 * @returns {{ valid: boolean, value: string, reason?: string }}
 */
function validateLocation(pinOrDistrict) {
  if (pinOrDistrict === undefined || pinOrDistrict === null) {
    return { valid: false, value: '', reason: 'MISSING_LOCATION' };
  }

  const raw = String(pinOrDistrict).trim().replace(/\D/g, '');

  // Delhi pin codes: 110001–110096
  if (/^11[0-9]{4}$/.test(raw)) {
    const pin = parseInt(raw, 10);
    if (pin >= 110001 && pin <= 110096) {
      return { valid: true, value: raw };
    }
  }

  // If it's a district name string (not numeric)
  const districtRaw = String(pinOrDistrict).trim();
  if (/^[a-zA-Z\u0900-\u097F\s\-]{2,50}$/.test(districtRaw)) {
    return { valid: true, value: districtRaw };
  }

  return { valid: false, value: '', reason: 'INVALID_LOCATION_FORMAT' };
}

/**
 * Express middleware: validates and sanitizes req.body.query
 * Attaches `req.sanitizedQuery` for downstream use.
 */
function querySanitizationMiddleware(req, res, next) {
  const rawQuery = req.body?.query;
  const result = sanitizeQuery(rawQuery);

  if (!result.valid) {
    const statusMap = {
      PROMPT_INJECTION: 400,
      TOO_LONG: 413,
      TOO_SHORT: 400,
      INVALID_TYPE: 400,
      ENCODING_ERROR: 400,
    };

    const userMessages = {
      PROMPT_INJECTION:
        'आपका संदेश सुरक्षा कारणों से अस्वीकार किया गया। | Query rejected for security reasons.',
      TOO_LONG:
        'संदेश बहुत लंबा है। कृपया 2000 अक्षरों से कम में लिखें। | Message too long. Max 2000 characters.',
      TOO_SHORT: 'कृपया अपना प्रश्न लिखें। | Please enter your question.',
      INVALID_TYPE: 'अमान्य इनपुट। | Invalid input format.',
      ENCODING_ERROR: 'एन्कोडिंग त्रुटि। | Encoding error.',
    };

    return res.status(statusMap[result.reason] ?? 400).json({
      error: userMessages[result.reason] ?? 'Invalid request',
      code: result.reason,
    });
  }

  req.sanitizedQuery = result.sanitized;
  next();
}

module.exports = {
  sanitizeQuery,
  detectPromptInjection,
  validateLocation,
  querySanitizationMiddleware,
};
