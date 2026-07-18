/**
 * elasticClient.js — Shrayak: Shramik Sahayak
 *
 * ELASTIC CLOUD INTEGRATION MODULE
 *
 * Responsibilities:
 *  1. Establish a robust, authenticated connection to Elastic Cloud
 *  2. Create the shrayak-docs index with dense_vector mapping (768 dims)
 *  3. Bulk-ingest all seed documents (wages, laws, e-Shram FAQs)
 *  4. Expose knnSearch() for the RAG pipeline
 *  5. Expose APM-aware logging helpers
 *
 * Connection: Cloud ID + API Key (Zero-Trust, no username/password)
 * Embedding dimensions: 768 (Gemini text-embedding-004)
 * Similarity: cosine (kNN / HNSW)
 *
 * Run seeding: node backend/elasticClient.js --seed
 */

'use strict';

require('dotenv').config();

const { Client } = require('@elastic/elasticsearch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const { MINIMUM_WAGE_DOCUMENTS } = require('./seedData/minimumWages');
const { LABOUR_LAW_DOCUMENTS } = require('./seedData/labourLaws');
const { ESHRAM_FAQ_DOCUMENTS } = require('./seedData/eShramFAQs');

// ─── Logger Setup (ECS-compatible for Elastic Observability) ──────────────────

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json() // ECS-compatible JSON for Elastic log ingestion
  ),
  defaultMeta: { service: 'shrayak-elastic-client', version: '1.0.0' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// ─── Elasticsearch Client ─────────────────────────────────────────────────────

let esClient = null;

/**
 * Returns a singleton Elasticsearch client connected to Elastic Cloud.
 * Uses API Key authentication (preferred over Basic Auth for Zero-Trust).
 *
 * @returns {Client} Elasticsearch client instance
 */
function getElasticClient() {
  if (esClient) return esClient;

  const cloudId = process.env.ELASTIC_CLOUD_ID;
  const apiKey = process.env.ELASTIC_API_KEY;

  // Detect placeholder / missing credentials — graceful degradation
  const isPlaceholder = !cloudId || !apiKey ||
    cloudId.startsWith('placeholder') || apiKey.startsWith('placeholder');

  if (isPlaceholder) {
    logger.warn(
      'Elasticsearch credentials not configured. RAG disabled — chat will use fallback responses. ' +
      'Add real ELASTIC_CLOUD_ID + ELASTIC_API_KEY to .env to enable full RAG.'
    );
    return null; // Caller must handle null gracefully
  }

  esClient = new Client({
    cloud: { id: cloudId },
    auth: { apiKey },
    requestTimeout: 30000,
    compression: true,
    maxRetries: 3,
  });

  logger.info('Elasticsearch client initialized', {
    cloudIdPrefix: cloudId.split(':')[0],
    index: process.env.ELASTIC_INDEX_DOCS ?? 'shrayak-docs',
  });

  return esClient;
}

// ─── Index Configuration ──────────────────────────────────────────────────────

const INDEX_NAME = process.env.ELASTIC_INDEX_DOCS ?? 'shrayak-docs';

/**
 * Index mapping for shrayak-docs.
 * Uses dense_vector with cosine similarity for kNN search.
 * Gemini text-embedding-004 outputs 768-dimensional vectors.
 */
const INDEX_MAPPING = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      category: { type: 'keyword' },
      subCategory: { type: 'keyword' },
      source: { type: 'keyword' },
      statute: { type: 'text', analyzer: 'standard' },
      shortName: { type: 'keyword' },
      effectiveDate: { type: 'date', format: 'yyyy-MM-dd' },
      language: { type: 'keyword' },
      content: {
        type: 'text',
        analyzer: 'standard',
        // Also stored as-is for retrieval in RAG context
        fields: {
          keyword: { type: 'keyword', ignore_above: 8192 },
        },
      },
      tags: { type: 'keyword' },
      // Dense vector field for kNN semantic search
      embedding: {
        type: 'dense_vector',
        dims: 768,
        index: true,
        similarity: 'cosine',
      },
      // Metadata for APM/observability
      ingestedAt: { type: 'date' },
      ingestVersion: { type: 'keyword' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    // HNSW parameters for kNN index — tuned for quality vs speed
    'index.knn': true,
  },
};

// ─── Index Lifecycle Management ───────────────────────────────────────────────

/**
 * Creates the shrayak-docs index if it does not already exist.
 * Idempotent — safe to call on every startup.
 *
 * @returns {Promise<void>}
 */
async function ensureIndexExists() {
  const client = getElasticClient();
  if (!client) {
    logger.warn('ensureIndexExists: Elasticsearch client not available (no credentials).');
    return;
  }

  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) {
    logger.info('Index already exists, skipping creation', { index: INDEX_NAME });
    return;
  }

  await client.indices.create({
    index: INDEX_NAME,
    body: INDEX_MAPPING,
  });

  logger.info('Index created successfully', {
    index: INDEX_NAME,
    shards: INDEX_MAPPING.settings.number_of_shards,
    vectorDims: 768,
  });
}

// ─── Embedding Helper ─────────────────────────────────────────────────────────

let genAI = null;
let embeddingModel = null;

function getEmbeddingModel() {
  if (embeddingModel) return embeddingModel;

  const apiKey = process.env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.startsWith('placeholder');
  if (isPlaceholder) return null;

  genAI = new GoogleGenerativeAI(apiKey);
  embeddingModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
  });

  return embeddingModel;
}

/**
 * Generates a 768-dimensional embedding for a given text using Gemini.
 *
 * @param {string} text — The text to embed
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType — Gemini task type
 * @returns {Promise<number[]>} — 768-dim float array
 */
async function generateEmbedding(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const model = getEmbeddingModel();

  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType,
    // Truncate to 2048 tokens max (Gemini embedding limit)
  });

  const values = result.embedding?.values;

  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(
      `Embedding generation failed: expected 768 dims, got ${values?.length ?? 'undefined'}`
    );
  }

  return values;
}

// ─── Document Ingestion ───────────────────────────────────────────────────────

/**
 * Ingests a single document into Elasticsearch with its embedding.
 *
 * @param {object} doc — Document from seed data files
 * @param {string} ingestVersion — Tagging string for this ingestion run
 * @returns {Promise<void>}
 */
async function ingestDocument(doc, ingestVersion) {
  const client = getElasticClient();

  // Generate embedding from the document content
  const embedding = await generateEmbedding(doc.content, 'RETRIEVAL_DOCUMENT');

  const elasticDoc = {
    ...doc,
    embedding,
    ingestedAt: new Date().toISOString(),
    ingestVersion,
  };

  await client.index({
    index: INDEX_NAME,
    id: doc.id,
    document: elasticDoc,
    refresh: false, // Batch refresh at end for performance
  });

  logger.debug('Document indexed', {
    docId: doc.id,
    category: doc.category,
    contentLength: doc.content.length,
  });
}

/**
 * Full seeding pipeline — ingests all documents from all seed data files.
 * Designed to be idempotent (document IDs prevent duplicates).
 *
 * Run with: node backend/elasticClient.js --seed
 *
 * @returns {Promise<{ success: number, failed: number, total: number }>}
 */
async function ingestDocuments() {
  const allDocuments = [
    ...MINIMUM_WAGE_DOCUMENTS,
    ...LABOUR_LAW_DOCUMENTS,
    ...ESHRAM_FAQ_DOCUMENTS,
  ];

  const ingestVersion = new Date().toISOString().split('T')[0]; // e.g., "2024-10-01"
  let success = 0;
  let failed = 0;

  logger.info('Starting document ingestion', {
    totalDocuments: allDocuments.length,
    ingestVersion,
    index: INDEX_NAME,
  });

  // Process with concurrency limit to avoid rate-limiting on Gemini API
  const CONCURRENCY = 3;
  for (let i = 0; i < allDocuments.length; i += CONCURRENCY) {
    const batch = allDocuments.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((doc) => ingestDocument(doc, ingestVersion))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const doc = batch[j];

      if (result.status === 'fulfilled') {
        success++;
        logger.info(`✅ Ingested [${i + j + 1}/${allDocuments.length}]: ${doc.id}`);
      } else {
        failed++;
        logger.error(`❌ Failed to ingest: ${doc.id}`, {
          error: result.reason?.message,
          docId: doc.id,
        });
      }
    }

    // Small delay between batches to respect Gemini rate limits
    if (i + CONCURRENCY < allDocuments.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Force refresh index so documents are immediately searchable
  await getElasticClient().indices.refresh({ index: INDEX_NAME });

  const summary = { success, failed, total: allDocuments.length };
  logger.info('Ingestion complete', summary);
  return summary;
}

// ─── kNN Search ───────────────────────────────────────────────────────────────

/**
 * Performs a semantic kNN search in Elasticsearch using a query embedding.
 * Returns the top-k most relevant documents for RAG context.
 *
 * @param {string} queryText — The user's query (Hindi or English)
 * @param {object} options
 * @param {number} options.k — Number of results to return (default: 5)
 * @param {number} options.numCandidates — HNSW candidate pool size (default: 50)
 * @param {string[]} options.categories — Filter by category (optional)
 * @returns {Promise<Array<{ id, content, statute, category, score }>>}
 */
async function knnSearch(queryText, options = {}) {
  const { k = 5, numCandidates = 50, categories } = options;
  const client = getElasticClient();

  if (!client) {
    logger.warn('knnSearch: Elasticsearch not configured — returning empty results.');
    return [];
  }

  // Generate query embedding using RETRIEVAL_QUERY task type
  // (Gemini optimizes differently for query vs document embeddings)
  const queryEmbedding = await generateEmbedding(queryText, 'RETRIEVAL_QUERY');

  // Build kNN query — optionally filtered by category
  const knnQuery = {
    field: 'embedding',
    query_vector: queryEmbedding,
    k,
    num_candidates: numCandidates,
    ...(categories && categories.length > 0
      ? {
          filter: {
            terms: { category: categories },
          },
        }
      : {}),
  };

  const response = await client.search({
    index: INDEX_NAME,
    knn: knnQuery,
    // Return only the fields needed for RAG context (not the embedding vector)
    _source: ['id', 'content', 'statute', 'shortName', 'category', 'subCategory', 'source', 'effectiveDate', 'tags'],
    size: k,
  });

  const hits = response.hits?.hits ?? [];

  return hits.map((hit) => ({
    id: hit._id,
    content: hit._source.content,
    statute: hit._source.statute,
    shortName: hit._source.shortName ?? hit._source.statute,
    category: hit._source.category,
    subCategory: hit._source.subCategory,
    source: hit._source.source,
    effectiveDate: hit._source.effectiveDate,
    score: hit._score,
  }));
}

// ─── Health Check ─────────────────────────────────────────────────────────────

/**
 * Checks Elasticsearch cluster health.
 * Used by the /api/health endpoint.
 *
 * @returns {Promise<{ status: string, indexExists: boolean, docCount: number }>}
 */
async function healthCheck() {
  try {
    const client = getElasticClient();
    if (!client) {
      return { status: 'unconfigured', indexExists: false, docCount: 0,
               note: 'Add ELASTIC_CLOUD_ID + ELASTIC_API_KEY to .env to enable RAG.' };
    }
    const [clusterHealth, indexStats] = await Promise.all([
      client.cluster.health({ timeout: '5s' }),
      client.count({ index: INDEX_NAME }).catch(() => ({ count: -1 })),
    ]);

    return {
      status: clusterHealth.status, // 'green', 'yellow', 'red'
      indexExists: true,
      docCount: indexStats.count,
      clusterName: clusterHealth.cluster_name,
    };
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return { status: 'no_index', indexExists: false, docCount: 0 };
    }
    logger.error('Elasticsearch health check failed', { error: error.message });
    return { status: 'error', indexExists: false, docCount: 0, error: error.message };
  }
}

// ─── CLI Entry Point (for seeding) ───────────────────────────────────────────

if (require.main === module && process.argv.includes('--seed')) {
  (async () => {
    try {
      logger.info('=== Shrayak Data Seeding Pipeline ===');
      logger.info('Step 1: Ensuring Elasticsearch index exists...');
      await ensureIndexExists();

      logger.info('Step 2: Starting document ingestion...');
      const result = await ingestDocuments();

      logger.info('=== Seeding Complete ===', result);
      process.exit(result.failed > 0 ? 1 : 0);
    } catch (error) {
      logger.error('Fatal error during seeding', { error: error.message, stack: error.stack });
      process.exit(1);
    }
  })();
}

module.exports = {
  getElasticClient,
  ensureIndexExists,
  ingestDocuments,
  knnSearch,
  generateEmbedding,
  healthCheck,
  INDEX_NAME,
};
