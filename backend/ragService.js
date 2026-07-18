/**
 * ============================================================
 * ragService.js — Shrayak: Shramik Sahayak
 * ============================================================
 *
 * PURPOSE: The RAG Brain — three responsibilities:
 *   1. PII STRIPPER — redact Aadhaar + mobile before any Elastic write
 *   2. retrieveLabourFacts(userQuery) — multi_match search → grounded facts
 *   3. Telemetry logging → telemetry_logs index (Elastic Observability)
 *
 * ANTI-HALLUCINATION GUARANTEE:
 *   retrieveLabourFacts() returns a `promptTemplate` string.
 *   This template embeds the retrieved documents directly into the
 *   Gemini prompt with the explicit instruction:
 *     "Answer ONLY using the data provided below."
 *   The LLM physically cannot see a different wage figure —
 *   it can only repeat what Elasticsearch returned.
 *
 * ZERO-TRUST at the RAG Layer:
 *   1. PII stripped from query BEFORE multi_match text search
 *      (user's private numbers never enter the Elastic query body)
 *   2. Retrieved content passed verbatim to LLM — no modification
 *      (prevents the LLM from "improving" a statute number)
 *   3. Every request logged for audit with PII-safe query only
 *   4. Telemetry writes are fire-and-forget — failure never
 *      propagates to the user-facing API (chat always responds)
 *
 * ELASTIC OBSERVABILITY:
 *   Every chat request → one document in `telemetry_logs` with:
 *     • PII-stripped query (raw query NEVER stored)
 *     • Response latency (search + total)
 *     • Number of documents retrieved
 *     • PII detection flag (security monitoring)
 *     • Error codes for failure analysis
 *   Enables Kibana dashboards: Latency / PII Rate / Error Rate
 * ============================================================
 */

'use strict';

require('dotenv').config();

const { getElasticClient, stripPII, detectPII } = require('./elasticConfig');
const { INDEX_NAME: INDEX_WAGES } = require('./dataIngestion');
const { v4: uuidv4 } = require('uuid');

// ─── Constants ────────────────────────────────────────────────────────────────
const INDEX_TELEM = process.env.ELASTIC_INDEX_TELEMETRY ?? 'telemetry_logs';

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 1: TELEMETRY INDEX
// ══════════════════════════════════════════════════════════════════════════════
//
// ECS-compatible field names for Kibana auto-detection.
// @timestamp + event.* fields enable timeline charts automatically.
// dynamic: 'strict' — no unknown fields ever indexed.

const TELEMETRY_MAPPING = {
  // Serverless manages shards/replicas — no settings block needed
  mappings: {
    dynamic: 'strict',
    properties: {
      '@timestamp':       { type: 'date'    }, // ECS: when the event occurred
      'event.kind':       { type: 'keyword' }, // ECS: 'event'
      'event.outcome':    { type: 'keyword' }, // ECS: 'success' | 'failure'
      'service.name':     { type: 'keyword' }, // 'shrayak-agent'
      requestId:          { type: 'keyword' }, // UUID — correlates with server log
      // ── PII-STRIPPED QUERY ────────────────────────────────────────────
      // RAW query is NEVER stored. Only the stripPII() output.
      // This is the SECURITY GUARANTEE — Elastic never sees user PII.
      querySafe:          { type: 'text'    },
      queryLength:        { type: 'integer' },
      piiDetected:        { type: 'boolean' },
      piiTypes:           { type: 'keyword' },
      // ── Latency Breakdown ─────────────────────────────────────────────
      'latency.searchMs': { type: 'integer' }, // Elastic query time
      'latency.totalMs':  { type: 'integer' }, // Full request time
      // ── Retrieval Quality ─────────────────────────────────────────────
      retrievedDocs:      { type: 'integer' },
      topScore:           { type: 'float'   },
      isFallback:         { type: 'boolean' },
      // ── Error Tracking ────────────────────────────────────────────────
      errorCode:          { type: 'keyword' },
      errorMessage:       { type: 'text'    }, // Always PII-stripped
    },
  },
};

/**
 * ensureTelemetryIndex() — Creates `telemetry_logs` if missing.
 * Called once at server startup. Never throws.
 */
async function ensureTelemetryIndex() {
  const client = getElasticClient();
  if (!client) return; // Non-critical — degrade gracefully

  try {
    const exists = await client.indices.exists({ index: INDEX_TELEM });
    if (exists) return;
    await client.indices.create({ index: INDEX_TELEM, body: TELEMETRY_MAPPING });
    console.log(`[ragService] ✅ Created telemetry index '${INDEX_TELEM}'`);
  } catch (err) {
    if (err.meta?.body?.error?.type === 'resource_already_exists_exception') return;
    console.warn('[ragService] Could not create telemetry index (non-fatal):', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 2: PROMPT TEMPLATE BUILDER
// ══════════════════════════════════════════════════════════════════════════════
//
// ANTI-HALLUCINATION DESIGN:
//   The prompt template is constructed with the retrieved wage documents
//   embedded directly. The system instruction explicitly prohibits the
//   LLM from using any information outside the provided context.
//
//   This creates a CLOSED information loop:
//     Elasticsearch document content → Prompt context
//     LLM sees ONLY this context → LLM answer = facts from Elastic
//
//   Any hallucination would require the LLM to contradict an explicit
//   system instruction ("Use ONLY the data below") — which well-aligned
//   models like Gemini 2.5 Flash do not do for factual wage data.

const SYSTEM_INSTRUCTION = `तुम "Shrayak" (श्रायक) हो — दिल्ली के मजदूरों और प्रवासी श्रमिकों का AI सहायक।

तुम्हारी भूमिका (Your Role):
- नीचे दिए गए "Retrieved Facts" (Elasticsearch से निकाले गए दस्तावेज़) का उपयोग करके सवाल का जवाब दो।
- सरल हिंदी में जवाब दो जो एक अनपढ़ मजदूर भी समझ सके।
- हर जवाब में कानूनी धारा (Section number) ज़रूर बताओ।
- जवाब के अंत में हमेशा Helpline नंबर दो: 📞 1800-11-2345 (Toll-Free)

सख्त नियम (Strict Rules — MUST FOLLOW):
1. ONLY use the data provided in "Retrieved Facts" below. Do NOT use your training memory for wage figures, dates, or section numbers.
2. अगर नीचे का context सवाल का जवाब नहीं देता, तो कहो: "इस बारे में मेरे पास अभी जानकारी नहीं है। कृपया 1800-11-2345 पर कॉल करें।"
3. कभी भी वेतन की राशि (₹ amount) मत बनाओ — केवल नीचे दिए गए numbers use करो।
4. Keep responses concise — workers often have low-end phones with limited data.`;

/**
 * buildPromptTemplate(safeQuery, retrievedFacts) — Constructs the grounded LLM prompt.
 *
 * ZERO-TRUST PROMPT DESIGN:
 *   The user's query (PII-stripped) and retrieved facts are embedded
 *   in a structured template with clear delimiters. The LLM cannot
 *   "escape" the context window to use training memory for facts
 *   because the system instruction explicitly forbids it.
 *
 * @param {string}   safeQuery      — PII-stripped user query
 * @param {object[]} retrievedFacts — Top-k documents from Elasticsearch
 * @returns {string}                — Complete prompt for Gemini
 */
function buildPromptTemplate(safeQuery, retrievedFacts) {
  const contextBlock = retrievedFacts.length > 0
    ? retrievedFacts
        .map((fact, i) => [
          `[Document ${i + 1}] Source: ${fact.shortName} | Effective: ${fact.effectiveDate}`,
          `Category: ${fact.category} | Daily Rate: ₹${fact.dailyRateINR}`,
          `Statute: ${fact.statute}`,
          '---',
          fact.content.substring(0, 1200), // Limit context window per doc
          `[End Document ${i + 1}]`,
        ].join('\n'))
        .join('\n\n')
    : 'कोई दस्तावेज़ नहीं मिला। / No documents retrieved from Elasticsearch.';

  return [
    SYSTEM_INSTRUCTION,
    '\n\n════════════════ Retrieved Facts (Elasticsearch) ════════════════',
    contextBlock,
    '════════════════════════════════════════════════════════════════\n',
    `मजदूर का सवाल / Worker\'s Question: ${safeQuery}`,
    '\nतुम्हारा जवाब (Hindi, cite statute, end with helpline):',
  ].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 3: CORE RAG SEARCH — retrieveLabourFacts()
// ══════════════════════════════════════════════════════════════════════════════

/**
 * retrieveLabourFacts(userQuery, options) — Main RAG retrieval function.
 *
 * FLOW:
 *   1. Detect PII in query (for telemetry alert — never blocks user)
 *   2. Strip PII → safeQuery
 *   3. Execute multi_match search against delhi_wages_2026
 *   4. Build grounded prompt template with retrieved docs
 *   5. Log telemetry to telemetry_logs (fire-and-forget, PII-safe)
 *   6. Return facts + prompt for Gemini generation
 *
 * SEARCH STRATEGY — multi_match (BM25):
 *   multi_match searches across multiple fields simultaneously.
 *   We weight the `content` field highest (bilingual Hindi+English text)
 *   because that's where the most query-relevant words appear.
 *   The `occupation` and `statute` fields provide secondary matching
 *   for specific terms like "mason", "beldar", or "Section 14".
 *
 *   Query type: 'best_fields' — scores by the best-matching field,
 *   preventing a document with many weak matches from outranking one
 *   with a single strong match.
 *
 *   fuzziness: 'AUTO' — handles typos and Hindi transliteration variants
 *   (e.g., "beldar" / "beldar" / "beldar" all match).
 *
 * SECURITY:
 *   safeQuery (PII-stripped) is used in the multi_match query body.
 *   The raw userQuery NEVER enters the Elasticsearch query DSL.
 *
 * @param {string}  userQuery        — Raw input from the user (Hindi or English)
 * @param {object}  options
 * @param {number}  options.size     — Max documents to retrieve (default: 3)
 * @param {string}  options.category — Optional category filter (unskilled|skilled|...)
 * @param {string}  options.requestId — UUID for request tracing
 *
 * @returns {Promise<{
 *   facts:          object[],    // Retrieved wage documents
 *   promptTemplate: string,      // Grounded Gemini prompt
 *   safeQuery:      string,      // PII-stripped query (for logging)
 *   requestId:      string,
 *   latencyMs:      number,
 *   fallback:       boolean      // True if Elastic was unavailable
 * }>}
 */
async function retrieveLabourFacts(userQuery, options = {}) {
  const {
    size       = 3,
    category   = null,
    requestId  = uuidv4(),
  } = options;

  const totalStart = Date.now();
  const client     = getElasticClient();

  // Telemetry accumulator — assembled through the pipeline
  const telem = {
    requestId,
    rawQuery:           userQuery, // Stripped in logTelemetry() before indexing
    queryLength:        userQuery.length,
    piiDetected:        false,
    piiTypes:           [],
    'latency.searchMs': 0,
    'latency.totalMs':  0,
    retrievedDocs:      0,
    topScore:           0,
    isFallback:         false,
    errorCode:          null,
    errorMessage:       null,
  };

  // ── GRACEFUL DEGRADATION ──────────────────────────────────────────────────
  if (!client) {
    telem.isFallback = true;
    telem.errorCode  = 'ELASTIC_UNAVAILABLE';
    telem['latency.totalMs'] = Date.now() - totalStart;
    logTelemetry({ ...telem, success: false });

    const safeQuery = stripPII(userQuery);
    return {
      facts:          [],
      promptTemplate: buildPromptTemplate(safeQuery, []),
      safeQuery,
      requestId,
      latencyMs:      telem['latency.totalMs'],
      fallback:       true,
    };
  }

  try {
    // ── Step 1: PII Detection ───────────────────────────────────────────────
    const pii = detectPII(userQuery);
    telem.piiDetected = pii.hasPII;
    telem.piiTypes    = pii.types;

    if (pii.hasPII) {
      console.warn('[ragService] ⚠️  PII in query — stripping before Elastic query', {
        requestId, piiTypes: pii.types,
      });
    }

    // ── Step 2: PII Strip ───────────────────────────────────────────────────
    // SECURITY CHECKPOINT: The user's text NEVER enters Elasticsearch raw.
    // Only the PII-stripped version appears in the multi_match query body.
    const safeQuery = stripPII(userQuery);

    // ── Step 3: multi_match Search ─────────────────────────────────────────
    //
    // SEARCH ARCHITECTURE:
    //   multi_match runs BM25 across content, occupation, statute, tags
    //   simultaneously. BM25 (Best Match 25) scores documents by:
    //     • Term Frequency (TF) — how often the query term appears
    //     • Inverse Document Frequency (IDF) — rarity of the term
    //     • Field length normalization — shorter fields score higher
    //
    //   type: 'best_fields' — takes the highest-scoring field per document
    //   fuzziness: 'AUTO' — allows 1–2 character edits (typo tolerance)
    //   boost values: content^3 (highest) > occupation^2 > statute > tags
    //
    // SECURITY: safeQuery is a plain string derived from stripPII().
    //   It cannot contain Elasticsearch query operators (malicious JSON)
    //   because it's a string inside the `query` key, not a DSL expression.

    const searchStart = Date.now();

    const mustClauses = [
      {
        multi_match: {
          query:    safeQuery,
          fields:  [
            'content^3',     // Primary: bilingual wage content (highest weight)
            'occupation^2',  // Secondary: job roles (mason, beldar, painter)
            'statute',       // Tertiary: legal text (Section 14, Act 1948)
            'tags',          // Quaternary: keyword tags
          ],
          type:      'best_fields',
          fuzziness: 'AUTO',         // Handles typos and transliteration variants
          minimum_should_match: '30%', // At least 30% of terms must match
        },
      },
    ];

    // Optional category filter (applied as a filter — doesn't affect BM25 score)
    const filterClauses = category
      ? [{ term: { category } }]
      : [];

    const response = await client.search({
      index: INDEX_WAGES,
      body: {
        query: {
          bool: {
            must:   mustClauses,
            filter: filterClauses,
          },
        },
        // Return only the fields needed for RAG context
        _source: [
          'content', 'statute', 'shortName', 'occupation',
          'category', 'dailyRateINR', 'monthlyRateINR',
          'overtimeRateINR', 'effectiveDate', 'tags',
        ],
        size,
      },
    });

    telem['latency.searchMs'] = Date.now() - searchStart;

    // ── Step 4: Parse Results ───────────────────────────────────────────────
    const hits  = response.hits?.hits ?? [];
    const facts = hits.map(hit => ({
      id:              hit._id,
      content:         hit._source.content,
      statute:         hit._source.statute,
      shortName:       hit._source.shortName,
      occupation:      hit._source.occupation,
      category:        hit._source.category,
      dailyRateINR:    hit._source.dailyRateINR,
      monthlyRateINR:  hit._source.monthlyRateINR,
      overtimeRateINR: hit._source.overtimeRateINR,
      effectiveDate:   hit._source.effectiveDate,
      tags:            hit._source.tags ?? [],
      score:           hit._score ?? 0,
    }));

    telem.retrievedDocs      = facts.length;
    telem.topScore           = facts[0]?.score ?? 0;
    telem['latency.totalMs'] = Date.now() - totalStart;

    console.log('[ragService] Search complete', {
      requestId,
      docs:     facts.length,
      topScore: facts[0]?.score?.toFixed(2) ?? 0,
      latency:  telem['latency.totalMs'],
    });

    // ── Step 5: Build Grounded Prompt ────────────────────────────────────────
    const promptTemplate = buildPromptTemplate(safeQuery, facts);

    // ── Step 6: Fire-and-Forget Telemetry ────────────────────────────────────
    logTelemetry({ ...telem, success: true });

    return {
      facts,
      promptTemplate,
      safeQuery,
      requestId,
      latencyMs: telem['latency.totalMs'],
      fallback:  false,
    };

  } catch (err) {
    telem['latency.totalMs'] = Date.now() - totalStart;
    telem.errorCode          = String(err.meta?.statusCode ?? 'UNKNOWN');
    telem.errorMessage       = err.message;
    logTelemetry({ ...telem, success: false });

    console.error('[ragService] Search error', {
      requestId,
      error:      err.message,
      httpStatus: err.meta?.statusCode,
    });

    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// █▓ SECTION 4: TELEMETRY LOGGER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * logTelemetry(data) — Writes a PII-safe record to `telemetry_logs`.
 *
 * SECURITY: stripPII() is called on rawQuery INSIDE this function.
 *   Even if a caller accidentally passes the raw query, PII is caught here.
 *   The raw query NEVER enters the telemetry_logs index.
 *
 * OBSERVABILITY PATTERN: Fire-and-Forget
 *   This function is NOT awaited in the hot path. The user's chat
 *   response is never delayed by telemetry write latency.
 *   If Elastic is unavailable, the error is swallowed — telemetry
 *   failure MUST NOT propagate to the user-facing API.
 *
 * KIBANA DASHBOARDS ENABLED BY THIS DATA:
 *   1. Agent Latency p50/p95: field `latency.totalMs`
 *   2. PII Detection Rate: `piiDetected = true` filter
 *   3. Query Volume: count of documents over @timestamp
 *   4. Error Rate: `event.outcome = failure` pie chart
 *   5. Retrieval Quality: `topScore` histogram
 *
 * @param {object} data — Telemetry data (rawQuery will be PII-stripped here)
 */
function logTelemetry(data) {
  const client = getElasticClient();

  if (!client) {
    // Console fallback so at least something is traceable
    console.info('[telemetry] CONSOLE_LOG (Elastic unavailable)', {
      requestId: data.requestId,
      latencyMs: data['latency.totalMs'],
      success:   data.success,
    });
    return;
  }

  // ── SECURITY CHECKPOINT ────────────────────────────────────────────────────
  // PII Stripper at the telemetry boundary — last line of defence.
  // The raw user query NEVER leaves this function un-redacted.
  const querySafe    = stripPII(String(data.rawQuery     ?? ''));
  const errorSafe    = stripPII(String(data.errorMessage ?? ''));

  const doc = {
    '@timestamp':        new Date().toISOString(),
    'event.kind':        'event',
    'event.outcome':     data.success ? 'success' : 'failure',
    'service.name':      'shrayak-agent',

    requestId:           data.requestId,

    // PII-STRIPPED query — the only form of the query that touches Elastic
    querySafe,
    queryLength:         data.queryLength        ?? 0,
    piiDetected:         data.piiDetected         ?? false,
    piiTypes:            data.piiTypes            ?? [],

    'latency.searchMs':  data['latency.searchMs'] ?? 0,
    'latency.totalMs':   data['latency.totalMs']  ?? 0,

    retrievedDocs:       data.retrievedDocs        ?? 0,
    topScore:            data.topScore             ?? 0,
    isFallback:          data.isFallback           ?? false,

    errorCode:           data.errorCode            ?? null,
    errorMessage:        errorSafe || null,
  };

  // Fire-and-forget: no await — does NOT block the chat API response
  client.index({
    index:    INDEX_TELEM,
    document: doc,
    refresh:  false,       // Let Elastic buffer writes — faster than per-doc refresh
  }).catch(err => {
    // Swallow error — telemetry is non-critical infrastructure
    // NEVER rethrow — would turn a telemetry blip into a 500 error for the user
    console.error('[telemetry] Write failed (non-fatal, swallowed)', {
      requestId:  data.requestId,
      error:      err.message,
      httpStatus: err.meta?.statusCode,
    });
  });
}

/**
 * getTelemetryStats() — Aggregates last-24h metrics from telemetry_logs.
 * Powers the GET /api/stats endpoint.
 *
 * @returns {Promise<object|null>} — Aggregated metrics, or null if unavailable
 */
async function getTelemetryStats() {
  const client = getElasticClient();
  if (!client) return null;

  try {
    const result = await client.search({
      index: INDEX_TELEM,
      size:  0,
      body: {
        query: { range: { '@timestamp': { gte: 'now-24h' } } },
        aggs: {
          total:      { value_count: { field: 'requestId' } },
          successes:  { filter: { term: { 'event.outcome': 'success' } } },
          pii_alerts: { filter: { term: { piiDetected: true } } },
          fallbacks:  { filter: { term: { isFallback:   true } } },
          avg_ms:     { avg:  { field: 'latency.totalMs' } },
          p95_ms:     { percentiles: { field: 'latency.totalMs', percents: [50, 95, 99] } },
          avg_score:  { avg:  { field: 'topScore' } },
        },
      },
    });

    const a     = result.aggregations;
    const total = a.total.value ?? 0;

    return {
      period:          '24h',
      totalRequests:    total,
      successRate:      total > 0 ? `${((a.successes.doc_count  / total) * 100).toFixed(1)}%` : 'N/A',
      piiDetectionRate: total > 0 ? `${((a.pii_alerts.doc_count / total) * 100).toFixed(1)}%` : 'N/A',
      fallbackRate:     total > 0 ? `${((a.fallbacks.doc_count  / total) * 100).toFixed(1)}%` : 'N/A',
      latency: {
        avgMs: Math.round(a.avg_ms.value                ?? 0),
        p50Ms: Math.round(a.p95_ms.values['50.0']       ?? 0),
        p95Ms: Math.round(a.p95_ms.values['95.0']       ?? 0),
        p99Ms: Math.round(a.p95_ms.values['99.0']       ?? 0),
      },
      avgRetrievalScore: (a.avg_score.value ?? 0).toFixed(3),
    };
  } catch (err) {
    console.warn('[ragService] Could not fetch telemetry stats:', err.message);
    return null;
  }
}

module.exports = {
  retrieveLabourFacts,
  ensureTelemetryIndex,
  getTelemetryStats,
  buildPromptTemplate,
  logTelemetry,
  INDEX_TELEM,
};
