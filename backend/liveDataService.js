/**
 * liveDataService.js — Shrayak: Shramik Sahayak
 * ============================================================
 *
 * PURPOSE:
 *   Manages all real-time live data streams for the Shrayak platform.
 *   Four data sources, all backed by Elastic Cloud:
 *
 *   1. WORKER STATS      — Elastic aggregation on delhi_workers index
 *                          (total, bocwRegistered, underpaid, avgWage)
 *                          Refreshes every 30 seconds.
 *
 *   2. LIVE WAGES        — Fetches current official minimum wages from
 *                          the delhi_wages_2026 Elastic index.
 *                          Refreshes every 15 minutes.
 *
 *   3. LABOUR NEWS FEED  — Fetches govt labour circulars and news from
 *                          PIB (Press Information Bureau) RSS feed.
 *                          Parsed and indexed into delhi_news_feed.
 *                          Refreshes every 5 minutes.
 *
 *   4. REGISTRATION CTR  — Rolling eShram registration count via
 *                          Elastic count API on delhi_workers.
 *                          Returns live total registrations.
 *
 * ELASTIC INDICES USED:
 *   - delhi_workers       (existing) — aggregation source
 *   - delhi_wages_2026    (existing) — wage lookup
 *   - delhi_news_feed     (new)      — news articles time-series
 *
 * CACHING:
 *   All results are cached in-memory with TTLs to prevent Elastic
 *   overload. Cache is refreshed on a schedule, not per-request.
 */

'use strict';

require('dotenv').config();
const https = require('https');
const { getElasticClient } = require('./elasticConfig');

// ── Index Names ───────────────────────────────────────────────────────────────
const WORKER_INDEX  = 'delhi_workers';
const WAGES_INDEX   = 'delhi_wages_2026';
const NEWS_INDEX    = 'delhi_news_feed';

// ── In-Memory Cache ───────────────────────────────────────────────────────────
const cache = {
  stats:   { data: null, expiry: 0, ttl: 30_000      },   // 30 seconds
  wages:   { data: null, expiry: 0, ttl: 15 * 60_000 },   // 15 minutes
  news:    { data: null, expiry: 0, ttl:  5 * 60_000 },   // 5 minutes
};

// ── Delhi Min Wage Rates (official July 2026) — fallback if Elastic unavail ──
const WAGE_FALLBACK = {
  fetchedAt: new Date().toISOString(),
  source: 'Static fallback (Delhi Govt Notification Jul 2026)',
  live: false,
  rates: [
    { category: 'unskilled',    labelHindi: 'अकुशल',     daily: 743,  monthly: 19318 },
    { category: 'semi-skilled', labelHindi: 'अर्ध-कुशल', daily: 817,  monthly: 21242 },
    { category: 'skilled',      labelHindi: 'कुशल',       daily: 899,  monthly: 23374 },
    { category: 'highly-skilled', labelHindi: 'अत्यधिक कुशल', daily: 988, monthly: 25688 },
  ],
};

// ── PIB RSS Feed URL (Press Information Bureau — Ministry of Labour) ──────────
const PIB_RSS_URL   = 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3';
const MOL_NEWS_URL  = 'https://labour.delhi.gov.in/'; // fallback static items

// ── Helper: Simple HTTPS GET ──────────────────────────────────────────────────
function httpsGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

// ── Helper: Parse basic RSS XML (no external deps) ───────────────────────────
function parseRssItems(xml, maxItems = 6) {
  const items = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  const tagRx  = (t) => new RegExp(`<${t}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${t}>|<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'i');

  let m;
  while ((m = itemRx.exec(xml)) !== null && items.length < maxItems) {
    const block = m[1];
    const extract = (tag) => {
      const r = tagRx(tag).exec(block);
      return r ? (r[1] || r[2] || '').trim() : '';
    };
    const title = extract('title');
    const link  = extract('link');
    const desc  = extract('description');
    const date  = extract('pubDate');
    if (title) {
      items.push({ title, link, description: desc.replace(/<[^>]+>/g, '').trim(), publishedAt: date || new Date().toISOString() });
    }
  }
  return items;
}

// ── Ensure News Feed Index ────────────────────────────────────────────────────
async function ensureNewsIndex(client) {
  try {
    const exists = await client.indices.exists({ index: NEWS_INDEX });
    if (!exists) {
      await client.indices.create({
        index: NEWS_INDEX,
        body: {
          mappings: {
            properties: {
              title:       { type: 'text', fields: { keyword: { type: 'keyword' } } },
              description: { type: 'text' },
              link:        { type: 'keyword' },
              publishedAt: { type: 'date' },
              source:      { type: 'keyword' },
              '@indexed_at': { type: 'date' },
            },
          },
          settings: { number_of_shards: 1, number_of_replicas: 0 },
        },
      });
      console.log(`[liveData] Created index '${NEWS_INDEX}'`);
    }
  } catch (err) {
    console.warn('[liveData] News index ensure failed (non-fatal):', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. WORKER STATS — Elastic aggregations
// ══════════════════════════════════════════════════════════════════════════════
async function getWorkerStats() {
  const now = Date.now();
  if (cache.stats.data && now < cache.stats.expiry) return cache.stats.data;

  const client = getElasticClient();
  if (!client) {
    const fallback = { totalWorkers: 7, bocwRegistered: 2, underpaidCount: 4, avgWage: 811, live: false, fetchedAt: new Date().toISOString() };
    cache.stats = { data: fallback, expiry: now + cache.stats.ttl, ttl: cache.stats.ttl };
    return fallback;
  }

  try {
    // Fetch minimum wage rates first (for compliance check)
    const wageData = await getWageRates();
    const wageMap  = {};
    wageData.rates.forEach(r => { wageMap[r.category] = r.daily; });

    // Elastic aggregation: total docs, bocwRegistered=true, wage stats
    const res = await client.search({
      index: WORKER_INDEX,
      body: {
        size: 0,
        aggs: {
          total:          { value_count: { field: 'uan' } },
          bocw_registered:{ filter: { term: { bocwRegistered: true } } },
          avg_wage:       { avg: { field: 'dailyWagePaid' } },
          by_skill:       { terms: { field: 'skillCategory', size: 10 },
            aggs: { wage_stats: { stats: { field: 'dailyWagePaid' } } }
          },
        },
      },
    });

    const aggs  = res.aggregations ?? {};
    const total = aggs.total?.value ?? 0;
    const bocw  = aggs.bocw_registered?.doc_count ?? 0;
    const avg   = Math.round(aggs.avg_wage?.value ?? 0);

    // Compute underpaid: workers whose dailyWagePaid is below their category minimum
    // We do this with a scripted filter query
    const underpaidRes = await client.count({
      index: WORKER_INDEX,
      body: {
        query: {
          bool: {
            should: [
              { bool: { filter: [{ term: { skillCategory: 'unskilled' } },    { range: { dailyWagePaid: { lt: wageMap.unskilled    ?? 743 } } }] } },
              { bool: { filter: [{ term: { skillCategory: 'semi-skilled' } },  { range: { dailyWagePaid: { lt: wageMap['semi-skilled'] ?? 817 } } }] } },
              { bool: { filter: [{ term: { skillCategory: 'skilled' } },       { range: { dailyWagePaid: { lt: wageMap.skilled      ?? 899 } } }] } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    });

    const underpaid = underpaidRes.count ?? 0;

    const result = {
      totalWorkers:   total,
      bocwRegistered: bocw,
      underpaidCount: underpaid,
      avgWage:        avg,
      live:           true,
      fetchedAt:      new Date().toISOString(),
    };

    cache.stats = { data: result, expiry: now + cache.stats.ttl, ttl: cache.stats.ttl };
    return result;
  } catch (err) {
    console.warn('[liveData] Worker stats fetch failed:', err.message);
    const fallback = { totalWorkers: 7, bocwRegistered: 2, underpaidCount: 4, avgWage: 811, live: false, fetchedAt: new Date().toISOString() };
    cache.stats = { data: fallback, expiry: now + 10_000, ttl: cache.stats.ttl };
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. LIVE WAGE RATES — from Elastic or static fallback
// ══════════════════════════════════════════════════════════════════════════════
async function getWageRates() {
  const now = Date.now();
  if (cache.wages.data && now < cache.wages.expiry) return cache.wages.data;

  const client = getElasticClient();
  if (!client) {
    cache.wages = { data: WAGE_FALLBACK, expiry: now + cache.wages.ttl, ttl: cache.wages.ttl };
    return WAGE_FALLBACK;
  }

  try {
    // Search the wages index for the latest category-level records
    const res = await client.search({
      index: WAGES_INDEX,
      body: {
        size: 10,
        query: { match_all: {} },
        sort: [{ '@indexed_at': { order: 'desc' } }],
      },
    });

    const hits = res.hits?.hits ?? [];
    if (!hits.length) throw new Error('Empty wages index');

    // Deduplicate by skill_category — keep highest daily_rate
    const byCategory = {};
    hits.forEach(h => {
      const src = h._source ?? {};
      const cat = (src.skill_category ?? src.category ?? '').toLowerCase().replace(/ /g, '-');
      const daily = parseFloat(src.daily_rate ?? src.daily ?? 0);
      const monthly = parseFloat(src.monthly_rate ?? src.monthly ?? 0);
      if (!byCategory[cat] || daily > byCategory[cat].daily) {
        byCategory[cat] = { category: cat, labelHindi: src.category_hindi ?? src.label_hindi ?? cat, daily, monthly };
      }
    });

    const rates = Object.values(byCategory).sort((a, b) => a.daily - b.daily);
    if (!rates.length) throw new Error('No valid wage records');

    const result = { fetchedAt: new Date().toISOString(), source: 'Elastic delhi_wages_2026 (Live)', live: true, rates };
    cache.wages = { data: result, expiry: now + cache.wages.ttl, ttl: cache.wages.ttl };
    return result;
  } catch (err) {
    console.warn('[liveData] Wage rates fetch failed, using fallback:', err.message);
    cache.wages = { data: WAGE_FALLBACK, expiry: now + 60_000, ttl: cache.wages.ttl };
    return WAGE_FALLBACK;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. LABOUR NEWS FEED — PIB RSS + Elastic indexing
// ══════════════════════════════════════════════════════════════════════════════

// Static curated fallback news items (when RSS unavailable)
const NEWS_FALLBACK = [
  {
    title: 'Delhi Govt Revises Minimum Wages for July 2026',
    description: 'The Delhi government has notified revised minimum wages effective July 1, 2026. Unskilled workers now get ₹743/day, semi-skilled ₹817/day, and skilled workers ₹899/day.',
    link: 'https://labour.delhi.gov.in/',
    publishedAt: '2026-07-01T00:00:00Z',
    source: 'Delhi Labour Dept',
  },
  {
    title: 'BOCW Welfare Board Announces Construction Worker Benefits',
    description: 'Delhi BOCW Board has announced enhanced welfare benefits including ₹3 lakh accident insurance and educational scholarships for registered workers\' children.',
    link: 'https://bocwdelhi.org/',
    publishedAt: '2026-06-20T00:00:00Z',
    source: 'BOCW Delhi',
  },
  {
    title: 'e-Shram Portal: Over 30 Crore Workers Registered Nationally',
    description: 'The Ministry of Labour & Employment reports that e-Shram portal has crossed 30 crore registrations. Workers can register at eshram.gov.in for social security benefits.',
    link: 'https://eshram.gov.in/',
    publishedAt: '2026-06-15T00:00:00Z',
    source: 'Ministry of Labour',
  },
  {
    title: 'Factories Act Amendment: Overtime Rate Increased to 2x',
    description: 'Under the amended Factories Act, workers are entitled to twice the ordinary rate of wages for all overtime hours. Employers must maintain overtime registers.',
    link: 'https://labour.delhi.gov.in/',
    publishedAt: '2026-06-01T00:00:00Z',
    source: 'Delhi Labour Dept',
  },
  {
    title: 'New Helpline 1800-11-2345 for Migrant Worker Grievances',
    description: 'Delhi Labour Department has launched a dedicated toll-free helpline for migrant workers to register complaints about wage theft, unsafe conditions, and denial of benefits.',
    link: 'https://labour.delhi.gov.in/',
    publishedAt: '2026-05-28T00:00:00Z',
    source: 'Delhi Labour Dept',
  },
  {
    title: 'Maternity Benefit Act: 26 Weeks Paid Leave Mandatory',
    description: 'All women workers are entitled to 26 weeks of paid maternity leave. Employers found non-compliant face ₹2 lakh fine under the Maternity Benefit (Amendment) Act 2017.',
    link: 'https://labour.gov.in/',
    publishedAt: '2026-05-15T00:00:00Z',
    source: 'Ministry of Labour',
  },
];

async function getNewsItems() {
  const now = Date.now();
  if (cache.news.data && now < cache.news.expiry) return cache.news.data;

  const client = getElasticClient();

  // Step 1: Try fetching from PIB RSS
  let freshItems = [];
  try {
    const xml = await httpsGet(PIB_RSS_URL, 6000);
    const parsed = parseRssItems(xml, 6);
    if (parsed.length > 0) {
      freshItems = parsed.map(item => ({ ...item, source: 'PIB / MoLE' }));
      console.log(`[liveData] Fetched ${freshItems.length} news items from PIB RSS`);

      // Step 2: Index fresh items into Elastic for persistence
      if (client) {
        await ensureNewsIndex(client);
        for (const item of freshItems) {
          try {
            await client.index({
              index: NEWS_INDEX,
              id: Buffer.from(item.link || item.title).toString('base64').substring(0, 64),
              document: { ...item, '@indexed_at': new Date().toISOString() },
            });
          } catch { /* non-fatal */ }
        }
      }
    }
  } catch (rssErr) {
    console.warn('[liveData] PIB RSS fetch failed:', rssErr.message);
  }

  // Step 3: If no fresh RSS items, try Elastic cache
  if (!freshItems.length && client) {
    try {
      const res = await client.search({
        index: NEWS_INDEX,
        body: {
          size: 6,
          query: { match_all: {} },
          sort: [{ '@indexed_at': { order: 'desc' } }],
        },
      });
      const hits = res.hits?.hits ?? [];
      if (hits.length) {
        freshItems = hits.map(h => h._source);
        console.log(`[liveData] Retrieved ${freshItems.length} news items from Elastic`);
      }
    } catch (esErr) {
      console.warn('[liveData] Elastic news fetch failed:', esErr.message);
    }
  }

  // Step 4: Ultimate fallback
  const items = freshItems.length ? freshItems : NEWS_FALLBACK;
  const result = { items, live: freshItems.length > 0, fetchedAt: new Date().toISOString() };
  cache.news = { data: result, expiry: now + cache.news.ttl, ttl: cache.news.ttl };
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. eShram REGISTRATION COUNTER
// ══════════════════════════════════════════════════════════════════════════════
async function getRegistrationCount() {
  const client = getElasticClient();
  if (!client) return { count: 7, live: false, fetchedAt: new Date().toISOString() };

  try {
    const res = await client.count({ index: WORKER_INDEX });
    return { count: res.count ?? 7, live: true, fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.warn('[liveData] Registration count failed:', err.message);
    return { count: 7, live: false, fetchedAt: new Date().toISOString() };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STARTUP — Bootstrap all caches on server start
// ══════════════════════════════════════════════════════════════════════════════
async function initLiveData() {
  const client = getElasticClient();
  if (client) await ensureNewsIndex(client);

  // Prime all caches in parallel (failures are non-fatal)
  const results = await Promise.allSettled([
    getWageRates(),
    getWorkerStats(),
    getNewsItems(),
  ]);
  const successes = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[liveData] Initialised: ${successes}/3 data streams ready`);
}

module.exports = {
  getWorkerStats,
  getWageRates,
  getNewsItems,
  getRegistrationCount,
  initLiveData,
};
