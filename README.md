# Shrayak — श्रायक: Shramik Sahayak (श्रमिक सहायक)
### Delhi Migrant Worker & Labour Rights AI Agent

> *"When Ram's contractor withheld his wages, he couldn't read the legal notice. He couldn't afford a lawyer. He didn't know his rights. Shrayak changed that."*

**Build With AI — Elastic × GDG Cloud New Delhi Buildathon**

[![Elastic](https://img.shields.io/badge/Powered%20by-Elastic%20Cloud-005571?style=flat-square&logo=elastic)](https://cloud.elastic.co)
[![Gemini](https://img.shields.io/badge/LLM-Google%20Gemini-4285F4?style=flat-square&logo=google)](https://aistudio.google.com)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2018+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📖 The Story of Ram

**Ram Kumar** is a 28-year-old mason from Sitapur, Uttar Pradesh. He came to Delhi on a contractor's promise of ₹700/day. After three months of hauling bricks in Rohini, he received only ₹450/day — below the legal minimum wage for unskilled workers (₹741/day as of October 2024). His contractor threatened to send him back home if he complained.

Ram owned a basic Android phone. He could not read English. He did not know about the Minimum Wages Act, 1948. He did not know he was owed a **displacement allowance** and **free return journey** under the Inter-State Migrant Workmen Act, 1979. He did not know the toll-free helpline **1800-11-2345** existed.

**With Shrayak, Ram types in Hindi:**
> *"मेरा ठेकेदार ₹450 दे रहा है। मुझे कितना मिलना चाहिए?"*

**Shrayak responds in seconds:**
> *"राम जी, दिल्ली में अकुशल श्रमिकों के लिए न्यूनतम वेतन ₹741 प्रतिदिन है (1 अक्टूबर 2024 से, Notification No. F.1(14)/MW/2024)। आपका ठेकेदार कानून का उल्लंघन कर रहा है। आप धारा 20, न्यूनतम वेतन अधिनियम, 1948 के तहत शिकायत दर्ज कर सकते हैं।*
>
> *📍 आपके नजदीकी श्रम कार्यालय:*
> *जिला श्रम कार्यालय, उत्तर पश्चिम दिल्ली — रोहिणी, सेक्टर-6 — 011-27051234*
>
> *📞 टोल-फ्री: 1800-11-2345"*

This is the power of **Shrayak** — grounded in real law, accessible in Hindi, and always pointing to the next actionable step.

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vanilla JS / HTML)                          │
│   Mobile-First WhatsApp-style Chat UI  │  Hindi/English Toggle               │
│   Quick-Question Chips  │  District Selector  │  PWA-ready                  │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ HTTPS (Helmet HSTS)
                     POST /api/chat — JSON body, 8kb max
                                 │
┌────────────────────────────────▼─────────────────────────────────────────────┐
│                    BACKEND (Node.js 18 / Express 4)                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                  5-LAYER SECURITY MIDDLEWARE CHAIN                   │    │
│  │  [1] Helmet → CSP, HSTS, X-Frame-Options, Referrer-Policy           │    │
│  │  [2] CORS → Strict origin allowlist (no wildcard)                    │    │
│  │  [3] Rate Limiter → 50 req / 15 min per IP (express-rate-limit)     │    │
│  │  [4] JSON Body Cap → 8kb limit (prevents token-stuffing)             │    │
│  │  [5] Input Sanitizer → XSS strip, prompt injection blocklist         │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                    RAG AGENT PIPELINE (agentLogic.js)                │    │
│  │                                                                      │    │
│  │  1. Intent Classification (keyword routing → ES category filter)     │    │
│  │  2. Gemini Embedding (text-embedding-004, 768-dim, RETRIEVAL_QUERY)  │    │
│  │  3. Elastic kNN Search (cosine similarity, top-5 docs, HNSW index)  │    │
│  │  4. Statute-grounded Prompt Assembly                                 │    │
│  │  5. Gemini Flash Generation (temperature=0.3, max 1024 tokens)       │    │
│  │  6. Citation Extraction (statute names from top-scored docs)         │    │
│  │  7. PII Strip → APM Telemetry Emission                               │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────┬────────────────────────┬────────────────────────┬─────────────────┘
           │                        │                        │
           ▼                        ▼                        ▼
┌─────────────────┐   ┌───────────────────────┐   ┌──────────────────────────┐
│  ELASTIC CLOUD  │   │     GOOGLE GEMINI      │   │    ELASTIC APM / LOGS    │
│                 │   │                        │   │                          │
│  Index:         │   │  text-embedding-004    │   │  PII-stripped spans      │
│  shrayak-docs   │   │  gemini-2.5-flash      │   │  Latency tracking        │
│                 │   │                        │   │  Query drop-off metrics  │
│  768-dim vectors│   │  Temperature: 0.3      │   │  Error rate dashboards   │
│  HNSW / cosine  │   │  Grounded to context   │   │  ECS-format JSON logs    │
│  ~20 documents  │   │  Cannot hallucinate    │   │                          │
│  (expandable)   │   │  statute figures       │   │  Kibana Dashboards →     │
│                 │   │                        │   │  APM latency analysis    │
│  Categories:    │   └───────────────────────┘   └──────────────────────────┘
│  - minimum_wage │
│  - labour_law   │
│  - eshram       │
│  - welfare      │
└─────────────────┘
```

---

## 🔍 Elastic Cloud Integration (Deep Dive)

### 1. Vector Database for RAG

Shrayak uses Elasticsearch as a **vector database** for the RAG pipeline:

```javascript
// Index mapping (elasticClient.js)
embedding: {
  type: 'dense_vector',
  dims: 768,              // Gemini text-embedding-004 output
  index: true,
  similarity: 'cosine',  // Cosine similarity for semantic matching
}
```

Every document chunk (wage circular, law excerpt, FAQ) is embedded using **Gemini `text-embedding-004`** and stored in the `shrayak-docs` index. At query time, the user's Hindi query is embedded with the `RETRIEVAL_QUERY` task type (Gemini optimizes query vs. document embeddings differently), and a **kNN search** retrieves the top-5 semantically similar legal documents.

### 2. Real-Time Data Ingestion

The system simulates ingesting **real-time wage data** — biannual Delhi minimum wage notifications:

```bash
npm run seed  # node backend/elasticClient.js --seed
```

This runs a seeding pipeline that:
1. Reads all structured documents from `backend/seedData/`
2. Embeds each document content via Gemini API
3. Bulk-indexes them into `shrayak-docs` with metadata (effective dates, statute refs)
4. Tags each document with its `ingestVersion` (date string) for rollback/audit

**When new wage circulars are issued** (every April and October), update `seedData/minimumWages.js` and re-run `npm run seed`. Documents are indexed by ID, so re-seeding is idempotent.

### 3. Observability with Elastic APM

Every RAG request emits a **PII-stripped telemetry span**:

```json
{
  "requestId": "uuid-v4",
  "querySafe": "न्यूनतम वेतन [MOBILE_REDACTED]",
  "intent": ["minimum_wage"],
  "retrievedDocs": 5,
  "topScore": 0.847,
  "latencyEmbeddingMs": 142,
  "latencyKnnMs": 38,
  "latencyLlmMs": 1820,
  "latencyTotalMs": 2012,
  "success": true,
  "piiDetected": true,
  "piiTypes": ["mobile_india"]
}
```

This data is ingested into Elastic APM / Kibana to build dashboards for:
- **Agent latency** by pipeline stage (embedding vs. kNN vs. LLM)
- **Query drop-off tracking** (which queries get fallback responses)
- **PII alert monitoring** (queries containing sensitive data patterns)
- **Retrieval quality** (top kNN score distribution over time)

---

## 🛡️ Security Posture

### What Sensitive Data Is Held?

| Data Type | Where Held | Retention |
|-----------|-----------|-----------|
| Geographic location (pin codes) | RAM only during request | Not persisted |
| User queries (potential PII) | RAM only — PII stripped before APM | Not logged raw |
| Aadhaar/phone numbers (if accidentally typed) | Stripped by `piiSanitizer.js` | Never logged |
| Delhi Labour Office directory | Static code file | Public data |
| Legal documents (wages, laws) | Elasticsearch index | Non-sensitive |

**No user session data, cookies, or queries are persisted to any database.**

### Where Does Untrusted Input Reach?

```
User → (1) HTTP Body → (2) Body Size Check → (3) JSON Parse
     → (4) Input Sanitizer → (5) LLM Prompt Construction
     → (6) Elasticsearch kNN (parameterized, not text injection)
     → (7) Gemini API (grounded prompt, system prompt non-overridable)
```

The LLM receives untrusted input **only as the "question" section of a structured prompt**. The system prompt is hardcoded in `agentLogic.js` and cannot be overridden. Elasticsearch queries use the **embedding vector** (not raw text), eliminating query injection risk.

### Which Edges Are Exposed?

| Edge | Exposure | Defence |
|------|---------|---------|
| `POST /api/chat` | Public internet | Rate limit + sanitization + body size cap |
| `GET /api/offices` | Public internet | Input validation + rate limit |
| `GET /api/health` | Public internet | Read-only, no sensitive data |
| Gemini API | Server-to-Gemini | API key in `.env`, never in frontend |
| Elastic Cloud | Server-to-Elastic | API Key auth over HTTPS, cloud ID |

### How Are They Defended?

| Threat | Mitigation | Code Location |
|--------|-----------|---------------|
| **Prompt Injection** | 15-pattern blocklist (OWASP LLM Top 10) | `inputSanitizer.js:PROMPT_INJECTION_PATTERNS` |
| **DDoS / API Abuse** | 50 req/15min per IP | `server.js:chatRateLimiter` |
| **XSS (backend)** | `xss` library strips all HTML tags | `inputSanitizer.js:sanitizeQuery()` |
| **Payload Stuffing** | `express.json({ limit: '8kb' })` | `server.js` |
| **PII Leakage to APM** | Aadhaar/PAN/phone regex strip | `piiSanitizer.js:stripPII()` |
| **Credential Exposure** | `.env` vars, `.gitignore` enforced | `.gitignore`, `.env.example` |
| **MITM** | Helmet HSTS (1yr, includeSubDomains) | `server.js:helmet()` |
| **Clickjacking** | `X-Frame-Options: DENY` via Helmet | `server.js:helmet()` |
| **CSRF** | No cookies, no sessions, stateless | Architecture decision |
| **Hallucinated Statutes** | LLM grounded to retrieved context only | `agentLogic.js:buildGroundedPrompt()` |
| **SQL/ES Injection** | kNN uses vector arrays, not text | `elasticClient.js:knnSearch()` |
| **CORS Abuse** | Strict allowlist, no wildcard | `server.js:cors()` |
| **XSS (frontend)** | `textContent` for user input, sanitized `innerHTML` for agent responses | `app.js:safeMarkdownToHtml()` |

**Compliance:** PII handling aligned with India's **Digital Personal Data Protection Act, 2023 (DPDPA)** — no data collection, no storage, no cross-border transfer of personal data.

---

## 📁 Project Structure

```
shrayak/
├── README.md                      ← This file
├── package.json                   ← Dependencies and scripts
├── .env.example                   ← Environment variable template (NEVER commit .env)
├── .gitignore
│
├── backend/
│   ├── server.js                  ← Express API edge (5-layer security)
│   ├── elasticClient.js           ← Elastic Cloud connection + indexing + kNN search
│   ├── agentLogic.js              ← RAG pipeline + Gemini + PII telemetry
│   ├── piiSanitizer.js            ← DPDPA-aligned PII stripping
│   ├── inputSanitizer.js          ← Prompt injection + XSS defense + middleware
│   ├── labourOffices.js           ← Delhi Labour Office directory + routing
│   └── seedData/
│       ├── minimumWages.js        ← Delhi minimum wages (Oct 2024 VDA revision)
│       ├── labourLaws.js          ← ISMW Act, BOCW, UWSSA, EPF, ESI, Maternity
│       └── eShramFAQs.js         ← e-Shram FAQs + Delhi welfare schemes
│
└── frontend/
    ├── index.html                 ← Semantic, accessible, mobile-first HTML
    ├── style.css                  ← WhatsApp-inspired dark UI (Glassmorphism)
    └── app.js                     ← Chat state, API integration, bilingual toggle
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- An [Elastic Cloud](https://cloud.elastic.co) deployment (Free trial available)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Elastic Cloud ID, API Key, and Gemini API Key
```

Required variables in `.env`:
```
ELASTIC_CLOUD_ID=your_cloud_id
ELASTIC_API_KEY=your_base64_api_key
GEMINI_API_KEY=your_gemini_key
```

### 3. Seed Elasticsearch with Legal Documents

```bash
npm run seed
```

This embeds and indexes all 20 legal documents (wages, laws, FAQs) into the `shrayak-docs` index. Takes ~2 minutes due to Gemini API embedding calls.

### 4. Start the Server

```bash
npm run dev        # Development with nodemon
# OR
npm start          # Production
```

### 5. Open the App

Navigate to `http://localhost:3000` — the Express server serves the frontend directly.

### 6. Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Chat test (Hindi query)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "दिल्ली में न्यूनतम वेतन कितना है?", "pinCode": "110085"}'

# Office routing
curl "http://localhost:3000/api/offices?pin=110085"
```

---

## 🌐 Elastic Cloud Setup Guide

### Creating the API Key

In Kibana → Stack Management → API Keys → Create API Key:

```json
{
  "shrayak-ingest": {
    "cluster": ["monitor"],
    "indices": [{
      "names": ["shrayak-*"],
      "privileges": ["create_index", "index", "read", "write"]
    }]
  }
}
```

### Expected Elasticsearch Index

After seeding, verify with:
```bash
# In Kibana Dev Tools:
GET shrayak-docs/_count
GET shrayak-docs/_search?size=1
```

Expected: ~20 documents across categories `minimum_wage`, `labour_law`, `eshram`.

### Elastic APM Setup (Optional but Recommended)

To enable full APM tracing in Kibana:
1. Kibana → Add Integrations → APM
2. Copy the APM Server URL and Secret Token
3. Add to `.env`:
   ```
   ELASTIC_APM_SERVER_URL=https://your-apm-url.apm.us-east-1.aws.elastic.co
   ELASTIC_APM_SECRET_TOKEN=your_token
   ```
4. Install APM agent: `npm install elastic-apm-node`
5. Add to top of `server.js`:
   ```javascript
   require('elastic-apm-node').start({
     serviceName: 'shrayak-api',
     secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
     serverUrl: process.env.ELASTIC_APM_SERVER_URL,
   });
   ```

---

## 📊 Kibana Dashboard — Observability

Build this Kibana dashboard from the ECS-format JSON logs emitted to stdout (configure Elastic Agent or Filebeat to ship them):

| Panel | Metric | Query |
|-------|--------|-------|
| Agent Latency (p50/p99) | `latencyTotalMs` | `service.name: "shrayak-agent"` |
| Retrieval Quality | `topScore` histogram | `message: "RAG_AGENT_REQUEST"` |
| PII Detection Rate | `piiDetected: true` count | `piiDetected: true` |
| Drop-off Rate | `_fallback: true` ratio | Server access logs |
| Top Intents | `intent` keyword agg | `message: "RAG_AGENT_REQUEST"` |

---

## 🗺️ Roadmap

- [ ] **Aadhaar-free e-Shram registration flow** (guided step-by-step)
- [ ] **Voice input** (Web Speech API for low-literacy users)
- [ ] **WhatsApp Business API integration** (send queries via WhatsApp)
- [ ] **Real-time wage circular ingestion** via Delhi Labour Dept API/scraping webhook
- [ ] **Multilingual support**: Bengali, Odia, Bhojpuri (key migrant worker languages)
- [ ] **Offline mode** (Service Worker + cached critical FAQ responses)
- [ ] **Complaint draft generator** (generates RTI/complaint letter in Hindi)

---

## 📜 Legal Data Sources

| Document | Source | Coverage |
|----------|--------|---------|
| Delhi Minimum Wages | Delhi Labour Dept Notification F.1(14)/MW/2024 | Oct 2024 VDA rates |
| ISMW Act, 1979 | Government of India — MoLE | Migrant worker rights |
| BOCW Act, 1996 | Delhi BOCW Welfare Board | Construction benefits |
| UWSSA, 2008 | MoLE / eshram.gov.in | Informal sector rights |
| Maternity Benefit Act | MoLE (amended 2017) | Women workers |
| EPF & ESI Acts | EPFO / ESIC | Social security |
| Child Labour Act | MoLE (amended 2016) | Child protection |

---

## 👥 Team

Built with ❤️ for the **Build With AI — Elastic × GDG Cloud New Delhi Buildathon 2025**.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) file.

> **Disclaimer:** Shrayak provides informational guidance based on publicly available law and government notifications. This is NOT legal advice. For serious legal matters, consult a qualified labour lawyer or visit your nearest District Labour Office.
