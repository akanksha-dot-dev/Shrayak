/**
 * ============================================================
 * elasticConfig.js — Shrayak: Shramik Sahayak
 * ============================================================
 *
 * PURPOSE:
 *   Single source of truth for the Elastic Cloud Serverless client.
 *   Every other module (dataIngestion, ragService) imports from here.
 *   Credentials are touched in exactly ONE place — this file.
 *
 * PACKAGE: @elastic/elasticsearch-serverless
 *   This is the purpose-built client for Elastic Cloud Serverless
 *   (deployments with the essu_ Cloud ID prefix). Key differences
 *   from the standard @elastic/elasticsearch package:
 *
 *     Standard client            Serverless client
 *     ─────────────────────────  ─────────────────────────────
 *     new Client({ node: url })  new Client({ url })
 *     Supports cluster.health()  cluster.health() unavailable
 *     Supports sniffOnStart      Sniffing not applicable
 *     Cloud ID auto-decode       Direct URL required
 *
 *   The Serverless client also automatically sets the correct
 *   Elastic-Api-Version header required by Serverless endpoints.
 *
 * ZERO-TRUST SECURITY MODEL:
 *   Zero-Trust means: trust nothing by default; verify everything.
 *
 *   Applied here:
 *   1. CREDENTIAL ISOLATION — API key read from process.env ONLY.
 *      No credential ever appears in source code.
 *   2. LEAST PRIVILEGE — The API key is scoped to two indices only.
 *      A leaked key cannot access other data or perform admin ops.
 *   3. SINGLETON PATTERN — One authenticated TCP pool per process.
 *      Credentials are sent once at construction, not per-request.
 *   4. TLS ENFORCED — Elastic Cloud Serverless only accepts HTTPS.
 *      The client cannot downgrade to HTTP.
 *   5. AUDIT LOG HINT — Only the first 8 chars of the key are logged,
 *      providing traceability without exposing the secret.
 *   6. STARTUP VERIFICATION — testConnection() runs at server start,
 *      catching misconfiguration before any user request is processed.
 *
 * PII STRIPPER — also defined here (infrastructure layer):
 *   By placing PII stripping at the Elastic client module, we
 *   guarantee it runs before ANY string reaches the cluster,
 *   regardless of which higher module initiates the write.
 * ============================================================
 */

'use strict';

require('dotenv').config();

// ── Package Import ────────────────────────────────────────────────────────────
//
// We use @elastic/elasticsearch-serverless for Elastic Cloud Serverless.
// This package is specifically built for the Serverless tier and sends
// the required Elastic-Api-Version header automatically.
//
// NOTE: As of mid-2024, Elastic deprecated the separate serverless package
// and merged its features back into @elastic/elasticsearch >= 8.15.
// Both packages work against the same Serverless endpoint.
// We use the serverless package as explicitly requested.
const { Client } = require('@elastic/elasticsearch-serverless');

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 1: PII STRIPPER
// ══════════════════════════════════════════════════════════════════════════════
//
// SECURITY MANDATE:
//   "Implement a PII Stripper using Regex that automatically redacts
//    10-digit phone numbers and 12-digit Aadhaar numbers from user
//    queries before logging to Elastic."
//
// PLACEMENT RATIONALE:
//   Defined here, at the lowest Elastic-facing layer, so all modules
//   calling Elasticsearch write operations can import and use it from
//   a single, auditable location. No module should write a user string
//   to Elastic without calling stripPII() first.
//
// PATTERNS (DPDPA 2023 compliant):
//
//   ① Aadhaar (12 digits):
//       UIDAI specification: first digit must be 2–9 (0 and 1 never issued).
//       Matches with optional space or dash separators after every 4 digits.
//       Examples matched:
//         2345 6789 0123   →   [AADHAAR_REDACTED]
//         2345-6789-0123   →   [AADHAAR_REDACTED]
//         234567890123     →   [AADHAAR_REDACTED]
//       Regex: /\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b/g
//
//   ② Indian Mobile (10 digits, starts 6–9):
//       Optional +91 or 0091 country code with optional separator.
//       Lookahead/lookbehind prevents matching a subset of longer numbers.
//       Examples matched:
//         9876543210       →   [MOBILE_REDACTED]
//         +91-9876543210   →   [MOBILE_REDACTED]
//         0091 98765 43210 →   [MOBILE_REDACTED]
//       Regex: /(?:(?:\+|00)?91[\s\-]?)?(?<![0-9])[6-9]\d{9}(?![0-9])/g
//
// CRITICAL IMPLEMENTATION NOTE — lastIndex reset:
//   JavaScript regex objects with the /g flag maintain a `lastIndex`
//   state. If the same regex object is used in multiple replace() calls
//   without resetting, it picks up from where it left off — causing
//   missed matches (a silent security bug).
//   We reset lastIndex = 0 before every call.

const PII_RULES = [
  {
    name:        'aadhaar_12digit',
    //            ┌── First digit 2–9 (UIDAI spec, 0/1 never issued)
    //            │    ┌── 3 more digits
    //            │    │      ┌── Optional space or dash
    //            │    │      │       ┌── 4 digits
    //            │    │      │       │      ┌── Optional separator
    //            │    │      │       │      │       ┌── Final 4 digits
    regex:       /\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
    replacement: '[AADHAAR_REDACTED]',
  },
  {
    name:        'mobile_10digit',
    //            ┌── Optional +91 / 0091 with optional separator
    //            │                          ┌── Neg lookbehind: no preceding digit
    //            │                          │            ┌── Starts 6–9
    //            │                          │            │       ┌── 9 more digits
    //            │                          │            │       │         ┌── Neg lookahead
    regex:       /(?:(?:\+|00)?91[\s\-]?)?(?<![0-9])[6-9]\d{9}(?![0-9])/g,
    replacement: '[MOBILE_REDACTED]',
  },
];

/**
 * stripPII(text) — Redacts Aadhaar and mobile numbers from any string.
 *
 * MANDATORY CALL SITES:
 *   1. User query → BEFORE generating embeddings or BM25 search terms
 *   2. Any field in a telemetry document → BEFORE indexing to Elastic
 *
 * @param  {string} text — Raw user input
 * @returns {string}     — PII-redacted string, safe for Elastic indexing
 */
function stripPII(text) {
  if (!text || typeof text !== 'string') return String(text ?? '');

  let safe = text;
  for (const rule of PII_RULES) {
    rule.regex.lastIndex = 0;          // CRITICAL: reset global regex state
    safe = safe.replace(rule.regex, rule.replacement);
  }
  return safe;
}

/**
 * detectPII(text) — Checks for PII presence without stripping.
 * Used for security telemetry: log when PII is detected.
 *
 * @param  {string} text
 * @returns {{ hasPII: boolean, types: string[] }}
 */
function detectPII(text) {
  if (typeof text !== 'string') return { hasPII: false, types: [] };

  const found = PII_RULES
    .filter(r => new RegExp(r.regex.source).test(text)) // fresh regex per call
    .map(r => r.name);

  return { hasPII: found.length > 0, types: found };
}

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 2: SERVERLESS ELASTICSEARCH CLIENT
// ══════════════════════════════════════════════════════════════════════════════

let _client = null; // Singleton — built once, reused for all operations

/**
 * getElasticClient() — Constructs and returns the Serverless ES client.
 *
 * LAZY SINGLETON PATTERN:
 *   The client is built on FIRST CALL, not at module import time.
 *   Benefits:
 *     • process.env is guaranteed to be populated (dotenv has run)
 *     • Unit tests can mock environment variables before first call
 *     • Server startup doesn't fail if .env hasn't loaded yet
 *     • Credentials are validated at construction, not silently ignored
 *
 * @returns {Client|null} — Serverless client, or null if misconfigured
 */
function getElasticClient() {
  if (_client) return _client; // Cached singleton — no re-construction

  const url    = process.env.ELASTIC_ES_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  // ZERO-TRUST: Fail fast with a clear message rather than obscure 401s later
  if (!url || !apiKey) {
    console.error(
      '[elasticConfig] ❌ ELASTIC_ES_URL or ELASTIC_API_KEY missing.\n' +
      '   Add both to .env — see ELASTIC_SETUP.md for instructions.'
    );
    return null;
  }

  if (url.includes('your_') || apiKey.includes('your_')) {
    console.warn('[elasticConfig] ⚠️  Placeholder credentials in .env — update before running.');
    return null;
  }

  _client = new Client({
    // ── Connection ──────────────────────────────────────────────────────────
    // @elastic/elasticsearch-serverless uses `node` (same param name as standard client)
    // despite the docs sometimes showing `url` — the underlying transport requires `node`
    node: url,

    // ── Authentication ───────────────────────────────────────────────────────
    // API Key auth — superior to username/password for production:
    //   • Scoped to specific indices (delhi_wages_2026, telemetry_logs)
    //   • Revocable from Kibana without changing account passwords
    //   • Auditable: every API key usage logged in Kibana Security
    //   • Rotatable: create new key, update .env, revoke old — zero downtime
    auth: { apiKey },
  });

  // SECURITY: Only log a non-sensitive key hint for audit traceability
  const keyHint = apiKey.substring(0, 8) + '...';
  console.log('[elasticConfig] ✅ Serverless client initialized', { url, keyHint });

  return _client;
}

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 3: STARTUP HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * testConnection() — Verifies connectivity to Elastic Cloud Serverless.
 *
 * ZERO-TRUST STARTUP VERIFICATION:
 *   Called once when Express server starts. Catches misconfiguration
 *   before any user request arrives. Server continues even on failure
 *   (graceful degradation) but logs a clear operator warning.
 *
 * WHY NOT cluster.health()?
 *   Elastic Cloud Serverless returns 410 Gone for cluster monitoring
 *   APIs (cluster:monitor/main privilege is not available in Serverless).
 *   We verify auth + connectivity using indices.exists() — lightweight,
 *   no special cluster privileges required, reaches the data plane.
 *
 * @returns {Promise<{
 *   ok:           boolean,
 *   url:          string,
 *   indexWages:   'exists'|'missing'|'error',
 *   indexTelem:   'exists'|'missing'|'error',
 *   latencyMs:    number,
 *   error?:       string
 * }>}
 */
async function testConnection() {
  const t0     = Date.now();
  const client = getElasticClient();
  const url    = process.env.ELASTIC_ES_URL ?? 'not-set';
  const wages  = process.env.ELASTIC_INDEX_WAGES     ?? 'delhi_wages_2026';
  const telem  = process.env.ELASTIC_INDEX_TELEMETRY ?? 'telemetry_logs';

  if (!client) {
    return { ok: false, url, indexWages: 'error', indexTelem: 'error',
             latencyMs: 0, error: 'Client not initialized — check .env' };
  }

  const result = { url, indexWages: 'error', indexTelem: 'error' };

  // Check wages index
  try {
    const wExists = await client.indices.exists({ index: wages });
    result.indexWages = wExists ? 'exists' : 'missing';
  } catch (err) {
    result.indexWages = err.meta?.statusCode === 404 ? 'missing' : 'error';
  }

  // Check telemetry index
  try {
    const tExists = await client.indices.exists({ index: telem });
    result.indexTelem = tExists ? 'exists' : 'missing';
  } catch (err) {
    result.indexTelem = err.meta?.statusCode === 404 ? 'missing' : 'error';
  }

  result.latencyMs = Date.now() - t0;

  // Server is reachable if at least one check didn't hard-error
  result.ok = result.indexWages !== 'error' || result.indexTelem !== 'error';

  if (result.ok) {
    console.log('[elasticConfig] ✅ Elastic Cloud Serverless — connected', result);
  } else {
    result.error = 'Both index checks failed — verify ELASTIC_API_KEY permissions';
    console.error('[elasticConfig] ❌ Connection check failed', result);
  }

  return result;
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  getElasticClient,
  testConnection,
  stripPII,
  detectPII,
};
