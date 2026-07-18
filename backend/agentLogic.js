/**
 * agentLogic.js — Shrayak: Shramik Sahayak
 *
 * THE RAG AGENT PIPELINE
 *
 * Flow:
 *  1. Receive sanitized Hindi/English query
 *  2. Embed query using Gemini text-embedding-004 (RETRIEVAL_QUERY task)
 *  3. kNN search in Elasticsearch for top-5 relevant law/wage documents
 *  4. Build a grounded, statute-citing prompt
 *  5. Call Gemini Flash for bilingual response (Hindi primary, English secondary)
 *  6. PII-strip the query before telemetry
 *  7. Emit APM span with latency, query type, and retrieval quality metrics
 *
 * Security:
 *  - PII stripped BEFORE any telemetry emission
 *  - Prompt injection detection already done upstream (inputSanitizer.js)
 *  - LLM is grounded to retrieved context — cannot hallucinate freely
 *  - System prompt is hardcoded and cannot be overridden by user input
 */

'use strict';

require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const { knnSearch, generateEmbedding } = require('./elasticClient');
const { stripPII, detectPII } = require('./piiSanitizer');
const { getOfficeByPin, getOfficesByDistrict, formatOfficeForChat } = require('./labourOffices');

// ─── Logger ───────────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'shrayak-agent', version: '1.0.0' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// ─── Gemini LLM Setup ─────────────────────────────────────────────────────────

let geminiClient = null;
let chatModel = null;

function getChatModel() {
  if (chatModel) return chatModel;

  const apiKey = process.env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.startsWith('placeholder');

  if (isPlaceholder) {
    logger.warn('GEMINI_API_KEY not configured. Chat will use fallback responses. Add your key to .env.');
    return null;
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  chatModel = geminiClient.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: 1024,
    },
  });

  return chatModel;
}

// ─── System Prompt (Hardcoded — Cannot be overridden by user) ─────────────────

const SYSTEM_PROMPT = `You are "Shrayak" (श्रायक), a trusted AI assistant helping migrant workers and daily wage labourers in Delhi understand their legal rights.

YOUR MISSION:
- Explain labour rights, minimum wages, e-Shram registration, and welfare benefits in simple, plain Hindi.
- Always cite the specific law, section number, or government notification from which the information comes.
- Be empathetic, patient, and use simple Hindi (not overly formal/legal language).
- Always recommend the user contact their nearest Labour Office or helpline if the matter is serious.

STRICT RULES:
1. ONLY answer questions about labour rights, wages, e-Shram, government welfare schemes, workplace rights, and related topics.
2. If asked about anything unrelated (entertainment, general knowledge, etc.), politely redirect to your purpose.
3. ALWAYS cite the statute or source at the end of your answer.
4. NEVER make up laws or invent specific figures — only use the provided context.
5. If the context does not contain enough information, say so clearly and direct the user to the Labour Department helpline: 1800-11-2345.
6. Respond PRIMARILY in Hindi, but include key terms and statute names in English too.
7. Keep responses concise — workers often have low-end phones and limited data.

FORMAT:
- Use simple numbered lists where helpful.
- Include the statute citation at the bottom as: "📜 कानूनी आधार: [statute name, section]"
- End with a relevant helpline if applicable.`;

// ─── Query Intent Classification ─────────────────────────────────────────────

/**
 * Lightweight intent classifier to route queries to relevant document categories.
 * Avoids unnecessary LLM calls for simple routing.
 *
 * @param {string} query
 * @returns {string[]} — Elasticsearch categories to prioritize
 */
function classifyQueryIntent(query) {
  const q = query.toLowerCase();

  const patterns = [
    { keywords: ['न्यूनतम वेतन', 'minimum wage', 'mujhe kitna milna chahiye', 'kitna paisa', 'wage', 'salary', 'वेतन', 'तनख्वाह'], category: 'minimum_wage' },
    { keywords: ['eshram', 'ई-श्रम', 'e-shram', 'e shram', 'UAN', 'पंजीकरण', 'register', 'card'], category: 'eshram' },
    { keywords: ['migrant', 'प्रवासी', 'inter-state', 'contractor', 'ठेकेदार', 'recruitment', 'ISMW', 'दूसरे राज्य'], category: 'labour_law' },
    { keywords: ['construction', 'निर्माण', 'BOCW', 'builder', 'site', 'cement', 'मिस्त्री'], category: 'labour_law' },
    { keywords: ['maternity', 'प्रसूति', 'pregnancy', 'गर्भावस्था', 'maternity leave', 'मातृत्व'], category: 'labour_law' },
    { keywords: ['PF', 'provident fund', 'भविष्य निधि', 'EPF', 'ESI', 'insurance', 'बीमा'], category: 'labour_law' },
    { keywords: ['child labour', 'बाल श्रम', 'bal shram', 'childline', '1098'], category: 'labour_law' },
    { keywords: ['complaint', 'शिकायत', 'grievance', 'file', 'court', 'न्यायालय'], category: 'labour_law' },
    { keywords: ['welfare', 'benefit', 'scheme', 'योजना', 'लाभ', 'pension', 'पेंशन'], category: 'eshram' },
  ];

  const matchedCategories = new Set();

  for (const pattern of patterns) {
    if (pattern.keywords.some((kw) => q.includes(kw.toLowerCase()))) {
      matchedCategories.add(pattern.category);
    }
  }

  // Default: search all categories if no specific intent detected
  return matchedCategories.size > 0 ? Array.from(matchedCategories) : [];
}

/**
 * Extracts a pin code or district name from the query for office routing.
 *
 * @param {string} query
 * @returns {{ type: 'pin'|'district'|null, value: string|null }}
 */
function extractLocationFromQuery(query) {
  // Delhi pin code pattern: 110xxx
  const pinMatch = query.match(/\b(11[0-9]{4})\b/);
  if (pinMatch) return { type: 'pin', value: pinMatch[1] };

  // Known district names
  const districts = [
    'central', 'south', 'north', 'east', 'west',
    'northwest', 'north west', 'southeast', 'south east', 'southwest', 'south west',
    'rohini', 'dwarka', 'janakpuri', 'lajpat', 'patparganj', 'civil lines',
    'मध्य', 'दक्षिण', 'उत्तर', 'पूर्वी', 'पश्चिम', 'रोहिणी', 'द्वारका',
  ];

  const qLower = query.toLowerCase();
  for (const district of districts) {
    if (qLower.includes(district.toLowerCase())) {
      return { type: 'district', value: district };
    }
  }

  return { type: null, value: null };
}

// ─── Context Builder ──────────────────────────────────────────────────────────

/**
 * Builds the grounded RAG prompt from retrieved documents.
 *
 * @param {string} userQuery — Sanitized user query
 * @param {Array} retrievedDocs — Top-k documents from Elasticsearch
 * @param {object|null} officeInfo — Nearest office (if location detected)
 * @returns {string} — Full prompt to send to Gemini
 */
function buildGroundedPrompt(userQuery, retrievedDocs, officeInfo) {
  // Format retrieved context with statute citations
  const contextBlocks = retrievedDocs
    .map((doc, i) => {
      return [
        `[दस्तावेज़ ${i + 1} | Document ${i + 1}]`,
        `स्रोत (Source): ${doc.shortName ?? doc.statute}`,
        `श्रेणी (Category): ${doc.category}`,
        `---`,
        doc.content.substring(0, 1500), // Truncate to stay within context window
        `[अंत | End of Document ${i + 1}]`,
      ].join('\n');
    })
    .join('\n\n');

  const officeBlock = officeInfo
    ? `\n\n[निकटतम श्रम कार्यालय | Nearest Labour Office]\n${formatOfficeForChat(officeInfo)}`
    : '';

  return [
    `${SYSTEM_PROMPT}`,
    `\n\n=== संदर्भ दस्तावेज़ (Retrieved Legal Context from Elasticsearch) ===\n`,
    contextBlocks,
    officeBlock,
    `\n\n=== उपयोगकर्ता का प्रश्न (User Question) ===`,
    userQuery,
    `\n=== आपका उत्तर (Your Answer — primarily in Hindi, cite statutes) ===`,
  ].join('\n');
}

// ─── APM / Observability Telemetry ───────────────────────────────────────────

/**
 * Emits a structured telemetry event for this RAG request.
 * PII is stripped BEFORE emission.
 *
 * @param {object} telemetry
 */
function emitTelemetry(telemetry) {
  // SECURITY: Strip PII from all string fields before logging
  const safe = {
    requestId: telemetry.requestId,
    // Strip PII from the query — log only PII-safe version
    querySafe: stripPII(telemetry.query ?? ''),
    queryLength: (telemetry.query ?? '').length,
    intent: telemetry.intent,
    retrievedDocs: telemetry.retrievedDocs,
    topScore: telemetry.topScore,
    hasLocation: telemetry.hasLocation,
    // Timing metrics (for Elastic APM latency analysis)
    latencyEmbeddingMs: telemetry.latencyEmbeddingMs,
    latencyKnnMs: telemetry.latencyKnnMs,
    latencyLlmMs: telemetry.latencyLlmMs,
    latencyTotalMs: telemetry.latencyTotalMs,
    // Success/failure tracking
    success: telemetry.success,
    errorCode: telemetry.errorCode,
    // PII detection alert (for security monitoring in Elastic SIEM)
    piiDetected: telemetry.piiDetected,
    piiTypes: telemetry.piiTypes,
  };

  logger.info('RAG_AGENT_REQUEST', safe);
}

// ─── Main RAG Pipeline ────────────────────────────────────────────────────────

/**
 * The full RAG pipeline: from sanitized user query to grounded LLM response.
 *
 * @param {string} sanitizedQuery — Pre-sanitized query (from inputSanitizer)
 * @param {object} options
 * @param {string} options.pinCode — User's pin code for office routing (optional)
 * @param {string} options.district — User's district name (optional)
 * @param {string} options.language — Preferred language: 'hi' | 'en' (default: 'hi')
 * @returns {Promise<{
 *   response: string,
 *   citations: string[],
 *   nearestOffice: object|null,
 *   requestId: string,
 *   latencyMs: number
 * }>}
 */
async function buildRAGResponse(sanitizedQuery, options = {}) {
  const requestId = uuidv4();
  const startTime = Date.now();
  const telemetry = { requestId, query: sanitizedQuery, success: false };

  // PII Detection (for security alerting, not blocking)
  const piiResult = detectPII(sanitizedQuery);
  telemetry.piiDetected = piiResult.hasPII;
  telemetry.piiTypes = piiResult.types;

  if (piiResult.hasPII) {
    logger.warn('PII detected in query — will be stripped before telemetry', {
      requestId,
      piiTypes: piiResult.types,
    });
  }

  try {
    // ── Step 1: Classify Intent ─────────────────────────────────────────────
    const intent = classifyQueryIntent(sanitizedQuery);
    telemetry.intent = intent;

    // ── Step 2: Embed Query ────────────────────────────────────────────────
    const embedStart = Date.now();
    // Query embedding uses RETRIEVAL_QUERY task for optimal matching
    telemetry.latencyEmbeddingMs = Date.now() - embedStart;

    // ── Step 3: kNN Search in Elasticsearch ───────────────────────────────
    const knnStart = Date.now();
    const retrievedDocs = await knnSearch(sanitizedQuery, {
      k: 5,
      numCandidates: 50,
      categories: intent.length > 0 ? intent : undefined,
    });
    telemetry.latencyKnnMs = Date.now() - knnStart;
    telemetry.retrievedDocs = retrievedDocs.length;
    telemetry.topScore = retrievedDocs[0]?.score ?? 0;

    logger.debug('kNN retrieval complete', {
      requestId,
      docsRetrieved: retrievedDocs.length,
      topScore: telemetry.topScore,
      topDoc: retrievedDocs[0]?.id,
    });

    // ── Step 4: Office Routing ─────────────────────────────────────────────
    let officeInfo = null;
    const locationFromQuery = extractLocationFromQuery(sanitizedQuery);
    const pin = options.pinCode ?? (locationFromQuery.type === 'pin' ? locationFromQuery.value : null);
    const district = options.district ?? (locationFromQuery.type === 'district' ? locationFromQuery.value : null);

    if (pin) {
      officeInfo = getOfficeByPin(pin);
    } else if (district) {
      const offices = getOfficesByDistrict(district);
      officeInfo = offices[0] ?? null;
    }
    telemetry.hasLocation = !!officeInfo;

    // ── Step 5: Build Grounded Prompt ──────────────────────────────────────
    const groundedPrompt = buildGroundedPrompt(sanitizedQuery, retrievedDocs, officeInfo);

    // ── Step 6: LLM Generation ────────────────────────────────────────────
    const llmStart = Date.now();
    const model = getChatModel();
    if (!model) {
      throw Object.assign(
        new Error('Gemini not configured'),
        { code: 'NO_LLM_CONFIGURED' }
      );
    }
    const result = await model.generateContent(groundedPrompt);
    telemetry.latencyLlmMs = Date.now() - llmStart;

    const responseText = result.response?.text();
    if (!responseText) {
      throw new Error('Gemini returned empty response');
    }

    // ── Step 7: Extract Citations from Retrieved Docs ─────────────────────
    const citations = retrievedDocs
      .filter((doc) => doc.score > 0.5) // Only cite documents with meaningful relevance
      .map((doc) => doc.shortName ?? doc.statute)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i) // Deduplicate
      .slice(0, 3); // Max 3 citations for readability

    // ── Step 8: Emit PII-safe telemetry ──────────────────────────────────
    telemetry.latencyTotalMs = Date.now() - startTime;
    telemetry.success = true;
    emitTelemetry(telemetry);

    return {
      response: responseText,
      citations,
      nearestOffice: officeInfo,
      requestId,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    telemetry.latencyTotalMs = Date.now() - startTime;
    telemetry.success = false;
    telemetry.errorCode = error.code ?? error.message?.substring(0, 50);
    emitTelemetry(telemetry);

    logger.error('RAG pipeline error', {
      requestId,
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * Generates a simple, non-RAG response for greetings and off-topic queries.
 * Used to handle cases where retrieved docs have very low relevance scores.
 *
 * @param {string} query
 * @returns {string} — Fallback message in Hindi
 */
function getFallbackResponse(query) {
  return `नमस्ते! मैं श्रायक हूँ — दिल्ली के मजदूरों का AI सहायक।

मैं आपकी इन विषयों में मदद कर सकता हूँ:
1. 💰 न्यूनतम वेतन (Minimum Wages)
2. 📋 ई-श्रम पंजीकरण (e-Shram Registration)
3. ⚖️ श्रम कानून और अधिकार (Labour Laws & Rights)
4. 🏛️ नजदीकी श्रम कार्यालय (Nearest Labour Office)
5. 👶 BOCW, ESI, PF लाभ (Construction & Social Security Benefits)

कृपया अपना प्रश्न हिंदी या अंग्रेजी में पूछें।
📞 सहायता: 1800-11-2345 (Toll-Free)`;
}

module.exports = {
  buildRAGResponse,
  getFallbackResponse,
  classifyQueryIntent,
  extractLocationFromQuery,
};
