/**
 * Shrayak — app.js
 * Professional Frontend Application Logic
 */
'use strict';

// ══════════════════════════════════════════════════════════════════
// STATE & CONFIG
// ══════════════════════════════════════════════════════════════════
const API = '';

const state = {
  persona:          null,
  aqiData:          null,
  loading:          false,
  rateLimitedUntil: 0,
  language:         'hi',
};

// ══════════════════════════════════════════════════════════════════
// DOM — resolved after DOMContentLoaded
// ══════════════════════════════════════════════════════════════════
let D = {};

function resolveDOM() {
  const g = id => document.getElementById(id);
  D = {
    // Language
    langHiBtn:    g('lang-hi-btn'),
    langEnBtn:    g('lang-en-btn'),
    // Worker Registry
    workerInput:  g('worker-search-input'),
    workerBtn:    g('worker-search-btn'),
    workerResult: g('worker-result'),
    // Sidebar persona
    personaCards: g('persona-cards'),
    // Geo
    pinInput:     g('pin-input'),
    pinBtn:       g('pin-search-btn'),
    geoResult:    g('geo-result'),
    // Security
    telemDot:     g('telem-dot'),
    telemStatus:  g('telemetry-status'),
    statTotal:    g('stat-total'),
    statPII:      g('stat-pii'),
    statLatency:  g('stat-latency'),
    statSuccess:  g('stat-success'),
    // Chat
    chatAvatar:   g('chat-avatar'),
    chatName:     g('chat-persona-name'),
    chatSub:      g('chat-persona-sub'),
    starters:     g('starter-questions'),
    messages:     g('chat-messages'),
    chatInput:    g('chat-input'),
    charCount:    g('char-count'),
    sendBtn:      g('send-btn'),
    // Elastic
    elasticDot:   g('elastic-dot'),
    // Mobile
    menuBtn:      g('mobile-menu-btn'),
    sidebar:      document.querySelector('.sidebar'),
    sbOverlay:    g('sb-overlay'),
    // Toast
    toast:        g('toast'),
  };
}

// ══════════════════════════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════════════════════════
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}

function fmt(text) {
  if (!text) return '';
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\n/g, '<br>');
  s = s.replace(/(^|<br>)\s*[-•]\s+/g, '$1&nbsp;&nbsp;• ');
  return s;
}

function now() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

let _toastTimer;
function toast(msg) {
  D.toast.textContent = msg;
  D.toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => D.toast.classList.remove('show'), 3200);
}

function scrollBottom() {
  requestAnimationFrame(() => { D.messages.scrollTop = D.messages.scrollHeight; });
}

function autoResize() {
  D.chatInput.style.height = 'auto';
  D.chatInput.style.height = Math.min(D.chatInput.scrollHeight, 140) + 'px';
}

// ══════════════════════════════════════════════════════════════════
// PERSONA MANAGER
// ══════════════════════════════════════════════════════════════════
const Personas = {
  list: [],

  async init() {
    try {
      const r = await fetch(`${API}/api/personas`);
      const j = await r.json();
      this.list = j.personas ?? [];
    } catch {
      this.list = fallbackPersonas();
    }
    this.render();
  },

  render() {
    D.personaCards.innerHTML = '';
    this.list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'persona-card';
      card.id = `pc-${p.id}`;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Select ${p.name}`);
      card.style.setProperty('--p-color', p.color);

      // derive pill style from color
      const hex = p.color;
      card.innerHTML = `
        <div class="persona-avi">${p.avatar}</div>
        <div class="persona-info">
          <div class="persona-name">${esc(p.name)}</div>
          <div class="persona-name-hi">${esc(p.nameHindi)}</div>
          <div class="persona-job">${esc(p.occupation)}</div>
        </div>
        <div class="persona-pill" style="
          background:${hex}18;
          color:${hex};
          border-color:${hex}30;
        ">${p.aqiSensitive ? '🌫️ AQI' : p.geoFocused ? '📍 Geo' : '⏱️ OT'}</div>
      `;
      card.addEventListener('click', () => this.select(p.id));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.select(p.id); }
      });
      D.personaCards.appendChild(card);
    });
  },

  select(id) {
    const p = this.list.find(x => x.id === id);
    if (!p) return;
    state.persona = p;

    // Clear previous conversation
    D.messages.innerHTML = '';

    // Card states
    document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(`pc-${id}`);
    if (el) el.classList.add('active');

    // Chat bar
    const isEn = state.language === 'en';
    D.chatAvatar.textContent = p.avatar;
    D.chatAvatar.style.borderColor = p.color;
    D.chatName.textContent = isEn ? `${p.name} — ${p.occupation}` : `${p.nameHindi} — ${p.occupationHindi}`;
    D.chatSub.textContent  = isEn ? `${p.origin} | ${p.occupation}` : `${p.originHindi} | ${p.occupationHindi}`;

    // Starter questions
    this.renderStarters(p);

    // Welcome message
    const welcome = isEn ? (p.welcomeMessageEn ?? p.welcomeMessage) : p.welcomeMessage;
    addBotMsg(welcome, [], null, true);

    // Close mobile sidebar
    D.sidebar.classList.remove('open');
    D.sbOverlay.classList.remove('show');

    toast(isEn ? `${p.avatar} ${p.name} selected` : `${p.avatar} ${p.nameHindi} चुना गया`);
  },

  renderStarters(p) {
    D.starters.innerHTML = '';
    const isEn = state.language === 'en';
    const questions = isEn ? (p.starterQuestionsEn ?? p.starterQuestions) : p.starterQuestions;
    (questions ?? []).forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'starter-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => { D.chatInput.value = q; sendMsg(q); });
      D.starters.appendChild(btn);
    });
  },
};

// ══════════════════════════════════════════════════════════════════
// WORKER REGISTRY MANAGER
// ══════════════════════════════════════════════════════════════════
const WorkerRegistry = {
  async search(query) {
    if (!query) {
      this.error('Please enter a name or UAN code');
      return;
    }
    this.loading(true);
    try {
      const r = await fetch(`${API}/api/workers?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) { this.error(d.error ?? 'Search failed'); return; }
      this.render(d.workers ?? []);
    } catch {
      this.error('Network error — please try again');
    } finally {
      this.loading(false);
    }
  },

  render(workers) {
    if (!workers.length) {
      D.workerResult.innerHTML = `
        <div class="geo-empty">
          <div class="geo-empty-icon">❓</div>
          <p>No worker matches found</p>
        </div>`;
      return;
    }
    D.workerResult.innerHTML = workers.map(w => {
      // Use live wage rates from Elastic (falls back to built-ins if unavailable)
      const minRate = LiveWages.getMin(w.skillCategory);

      const isCompliant = w.dailyWagePaid >= minRate;
      const diff = Math.round(minRate - w.dailyWagePaid);
      const statusBadge = isCompliant
        ? `<span class="wage-badge wage-badge--compliant">🟢 Compliant</span>`
        : `<span class="wage-badge wage-badge--underpaid">🔴 Underpaid by ₹${diff}/day</span>`;

      return `
        <div class="geo-office-card" style="border-color:${isCompliant ? 'var(--b2)' : 'rgba(239,68,68,.25)'}">
          <div class="geo-rank-row">
            <span class="geo-rank-label">${esc(w.skillCategory.toUpperCase())}</span>
            ${statusBadge}
          </div>
          <div class="geo-office-name">${esc(w.nameHindi)} (${esc(w.name)})</div>
          <div class="geo-detail"><strong>UAN:</strong> ${esc(w.uan)}</div>
          <div class="geo-detail"><strong>Occupation:</strong> ${esc(w.occupationHindi)}</div>
          <div class="geo-detail"><strong>Daily Wage:</strong> ₹${w.dailyWagePaid}/day
            <span style="color:var(--t3)"> (Min: ₹${minRate} — <em>Live</em>)</span>
          </div>
          <div class="geo-detail"><strong>Employer:</strong> ${esc(w.currentEmployer)}</div>
          <div class="geo-detail"><strong>BOCW Registered:</strong> ${w.bocwRegistered ? '✅ Yes' : '❌ No'}</div>
          <div class="geo-detail"><strong>State of Origin:</strong> ${esc(w.stateOfOriginHindi)}</div>
        </div>
      `;
    }).join('');
  },

  loading(on) {
    D.workerBtn.disabled = on;
    if (on) {
      D.workerResult.innerHTML = `
        <div class="geo-empty">
          <div class="geo-empty-icon">🔍</div>
          <p>Searching eShram index...</p>
        </div>`;
    }
  },

  error(msg) {
    D.workerResult.innerHTML = `
      <div class="geo-empty">
        <div class="geo-empty-icon">⚠️</div>
        <p style="color:var(--red)">${esc(msg)}</p>
      </div>`;
  }
};



// ══════════════════════════════════════════════════════════════════
// GEO MANAGER
// ══════════════════════════════════════════════════════════════════
const Geo = {
  async searchByPin(pin) {
    if (!pin || !/^1[0-9]{5}$/.test(pin)) {
      geoError('Please enter a valid 6-digit Delhi pin code (e.g. 110001)');
      return;
    }
    geoLoading(true);
    try {
      const r = await fetch(`${API}/api/offices/geo?pin=${encodeURIComponent(pin)}`);
      const d = await r.json();
      if (!r.ok) { geoError(d.error ?? 'Office not found'); return; }
      this.render(d.offices ?? []);
    } catch {
      geoError('Network error — please try again');
    } finally {
      geoLoading(false);
    }
  },

  render(offices) {
    if (!offices.length) {
      D.geoResult.innerHTML = `<div class="geo-empty"><div class="geo-empty-icon">❓</div><p>No office found for this pin code</p></div>`;
      return;
    }
    D.geoResult.innerHTML = offices.map((o, i) => `
      <div class="geo-office-card">
        <div class="geo-rank-row">
          <span class="geo-rank-label">${i === 0 ? '🏆 Nearest' : `#${o.rank} Closest`}</span>
          <span class="geo-dist-badge">📍 ${o.distanceKm} km</span>
        </div>
        <div class="geo-office-name">${esc(o.officeName)}</div>
        <div class="geo-detail">${esc(o.addressHindi ?? o.address ?? '')}</div>
        <div class="geo-detail">📞 <strong>${esc(o.phone ?? '')}${o.helpline ? ` · ${o.helpline}` : ''}</strong></div>
        <div class="geo-detail">🕐 ${esc(o.timings ?? '')}</div>
        <div class="geo-detail">🚇 ${esc(o.nearestMetro ?? '')}</div>
        ${o.note ? `<div class="geo-detail" style="color:var(--elastic);margin-top:4px">ℹ️ ${esc(o.note)}</div>` : ''}
        <a class="geo-map-link" href="${esc(o.mapUrl ?? '#')}" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          View on Google Maps
        </a>
      </div>
    `).join('');
  },
};

function geoLoading(on) {
  D.pinBtn.disabled = on;
  if (on) {
    D.geoResult.innerHTML = `<div class="geo-empty"><div class="geo-empty-icon">🔍</div><p>Running Elastic geo_distance query…</p></div>`;
  }
}

function geoError(msg) {
  D.geoResult.innerHTML = `<div class="geo-empty"><div class="geo-empty-icon">⚠️</div><p style="color:var(--red)">${esc(msg)}</p></div>`;
}

// ══════════════════════════════════════════════════════════════════
// STATS MANAGER
// ══════════════════════════════════════════════════════════════════
const Stats = {
  async init() {
    await this.fetch();
    setInterval(() => this.fetch(), 30_000);
  },

  async fetch() {
    try {
      const r = await fetch(`${API}/api/stats`);
      if (r.status === 503) { D.telemStatus.textContent = 'Elastic offline'; return; }
      const d = await r.json();
      if (d.error) { D.telemStatus.textContent = 'Stats unavailable'; return; }
      D.telemStatus.textContent = `24h · ${d.totalRequests ?? 0} reqs`;
      D.telemDot.classList.add('sec-dot--green');
      D.statTotal.textContent   = d.totalRequests ?? '--';
      D.statPII.textContent     = d.piiDetectionRate ?? '--';
      D.statLatency.textContent = d.latency?.avgMs ? `${d.latency.avgMs}ms` : '--';
      D.statSuccess.textContent = d.successRate ?? '--';
    } catch {
      D.telemStatus.textContent = 'Offline';
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════════
async function healthCheck() {
  try {
    const r = await fetch(`${API}/api/health`);
    const d = await r.json();
    const ok = d.services?.elasticsearch?.connected ?? false;
    D.elasticDot.className = `status-dot${ok ? '' : ' offline'}`;
  } catch {
    D.elasticDot.className = 'status-dot offline';
  }
}

// ══════════════════════════════════════════════════════════════════
// LIVE STATS MANAGER — Real-time Elastic aggregations
// ══════════════════════════════════════════════════════════════════
const LiveStats = {
  _lastData: null,

  async init() {
    await this.fetch();
    setInterval(() => this.fetch(), 30_000); // refresh every 30s
  },

  async fetch() {
    try {
      const r = await fetch(`${API}/api/live-stats`);
      if (!r.ok) return;
      const d = await r.json();
      this._lastData = d;
      this.render(d);
    } catch { /* keep last state */ }
  },

  animateNum(el, newVal) {
    const prev = el.textContent;
    if (prev === newVal) return;
    el.classList.remove('updated');
    void el.offsetWidth; // reflow
    el.classList.add('updated');
    el.textContent = newVal;
  },

  render(d) {
    const total   = document.getElementById('stat-total-workers');
    const bocw    = document.getElementById('stat-bocw');
    const under   = document.getElementById('stat-underpaid');
    const avgW    = document.getElementById('stat-avg-wage');
    const hint    = document.getElementById('stats-fetchedAt');
    const badge   = document.getElementById('stats-live-badge');
    const pill    = document.getElementById('data-stream-label');
    const pillDot = document.getElementById('data-stream-dot');

    if (total) this.animateNum(total, String(d.totalWorkers ?? '--'));
    if (bocw)  this.animateNum(bocw,  String(d.bocwRegistered ?? '--'));
    if (under) this.animateNum(under, String(d.underpaidCount ?? '--'));
    if (avgW)  this.animateNum(avgW,  d.avgWage ? `₹${d.avgWage}` : '--');

    const ts = d.fetchedAt ? new Date(d.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    if (hint) hint.textContent = `Last updated: ${ts} · ${d.live ? 'Elastic Live' : 'Cached'}`;

    if (badge) {
      badge.style.background = d.live ? 'rgba(16,185,129,.12)' : 'rgba(251,191,36,.12)';
      badge.style.color      = d.live ? 'var(--green)' : 'var(--yellow)';
      badge.style.borderColor= d.live ? 'rgba(16,185,129,.28)' : 'rgba(251,191,36,.28)';
      badge.textContent      = d.live ? '● LIVE' : '○ Cached';
    }

    // Update topbar data pill
    if (pill) {
      const streams = [d.totalWorkers, d.bocwRegistered].filter(x => x !== undefined).length;
      pill.textContent = `${streams} Streams Live`;
    }
    if (pillDot) pillDot.style.background = d.live ? 'var(--green)' : 'var(--yellow)';
  },
};

// ══════════════════════════════════════════════════════════════════
// NEWS FEED MANAGER — Labour circulars from PIB RSS / Elastic
// ══════════════════════════════════════════════════════════════════
const NewsFeed = {
  async init() {
    await this.fetch();
    setInterval(() => this.fetch(), 5 * 60_000); // refresh every 5 min
  },

  async fetch() {
    try {
      const r = await fetch(`${API}/api/news`);
      if (!r.ok) return;
      const d = await r.json();
      this.render(d);
    } catch { /* keep last state */ }
  },

  render(d) {
    const el  = document.getElementById('news-feed');
    const badge = document.getElementById('news-live-badge');
    if (!el) return;

    const items = d.items ?? [];
    if (!items.length) {
      el.innerHTML = `<div class="geo-empty"><div class="geo-empty-icon">📭</div><p>No circulars available</p></div>`;
      return;
    }

    el.innerHTML = items.map(item => {
      const dateStr = item.publishedAt
        ? new Date(item.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const href = item.link && item.link.startsWith('http') ? item.link : '#';
      return `
        <a class="news-item" href="${esc(href)}" target="_blank" rel="noopener noreferrer">
          <div class="news-item-source">${esc(item.source ?? 'Govt. Notice')}</div>
          <div class="news-item-title">${esc(item.title ?? '')}</div>
          ${dateStr ? `<div class="news-item-date">📅 ${dateStr}</div>` : ''}
        </a>
      `;
    }).join('');

    if (badge) {
      badge.style.background  = d.live ? 'rgba(16,185,129,.12)' : 'rgba(251,191,36,.12)';
      badge.style.color       = d.live ? 'var(--green)' : 'var(--yellow)';
      badge.style.borderColor = d.live ? 'rgba(16,185,129,.28)' : 'rgba(251,191,36,.28)';
      badge.textContent       = d.live ? '● PIB Live' : '○ Archived';
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// LIVE WAGES MANAGER — Official minimum wage rates from Elastic
// ══════════════════════════════════════════════════════════════════
const LiveWages = {
  rates: null,

  async init() {
    try {
      const r = await fetch(`${API}/api/wages/live`);
      if (!r.ok) return;
      const d = await r.json();
      this.rates = d.rates ?? null;
      // Update footer indicator
      const footer = document.querySelector('.input-footer span:first-child');
      if (footer && d.live) footer.textContent = `⚡ Elastic · Live Wages ${new Date(d.fetchedAt).toLocaleDateString('en-IN')}`;
    } catch { /* keep static */ }
  },

  // Returns the daily minimum for a skill category (falls back to built-ins)
  getMin(category) {
    if (this.rates) {
      const r = this.rates.find(x => x.category === category);
      if (r) return r.daily;
    }
    const fallback = { unskilled: 743, 'semi-skilled': 817, skilled: 899, 'highly-skilled': 988 };
    return fallback[category] ?? 743;
  },
};



// ══════════════════════════════════════════════════════════════════
// CHAT ENGINE
// ══════════════════════════════════════════════════════════════════
async function sendMsg(override) {
  if (state.loading) return;

  if (Date.now() < state.rateLimitedUntil) {
    const s = Math.ceil((state.rateLimitedUntil - Date.now()) / 1000);
    toast(`⏱️ Rate limited — retry in ${s}s`);
    return;
  }

  const text = (override ?? D.chatInput.value).trim();
  if (!text) return;
  if (text.length > 500) { toast('❌ Message too long (500 char limit)'); return; }

  const pinMatch = text.match(/\b(1[0-9]{5})\b/);
  const pin      = pinMatch?.[1] ?? null;

  addUserMsg(text);
  D.chatInput.value = '';
  D.chatInput.style.height = 'auto';
  D.charCount.textContent = '';
  D.sendBtn.disabled = true;

  if (pin) setTimeout(() => Geo.searchByPin(pin), 600);

  const typingId = addTyping();
  state.loading = true;
  const t0 = Date.now();

  try {
    const res = await fetch(`${API}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        query:      text,
        language:   state.language ?? 'hi',
        ...(pin                && { pinCode: pin }),
        ...(state.persona?.id  && { personaId: state.persona.id }),
      }),
    });

    removeTyping(typingId);

    if (res.status === 429) {
      state.rateLimitedUntil = Date.now() + 900_000;
      addBotMsg('⏱️ बहुत अधिक अनुरोध। 15 मिनट बाद पुनः प्रयास करें।\n\nRate limit reached — please try again in 15 minutes.', [], null);
      toast('🚦 Rate limit — 15 min cooldown');
      return;
    }

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? `HTTP ${res.status}`);
    }

    const d = await res.json();
    const ms = Date.now() - t0;

    addBotMsg(d.response ?? '❌ No response.', d.citations ?? [], d.nearestOffice ?? null, false, null, ms);

    // Refresh stats
    setTimeout(() => Stats.fetch(), 2000);

  } catch (err) {
    removeTyping(typingId);
    addBotMsg(`⚠️ माफ़ कीजिए, त्रुटि हुई। पुनः प्रयास करें।\n\n${err.message}\n\n📞 Helpline: 1800-11-2345`, [], null);
    toast('❌ Request failed');
  } finally {
    state.loading = false;
    D.sendBtn.disabled = (D.chatInput.value.trim().length === 0);
  }
}

// ══════════════════════════════════════════════════════════════════
// MESSAGE RENDERERS
// ══════════════════════════════════════════════════════════════════
function addUserMsg(text) {
  const d = document.createElement('div');
  d.className = 'msg msg--user';
  d.innerHTML = `
    <div class="msg-body">
      <div class="msg-bubble">${esc(text).replace(/\n/g,'<br>')}</div>
      <div class="msg-time">${now()} · You</div>
    </div>
    <div class="msg-avatar">${state.persona?.avatar ?? '👤'}</div>
  `;
  D.messages.appendChild(d);
  scrollBottom();
}

function addBotMsg(text, citations = [], office = null, isWelcome = false, aqiCtx = null, ms = null) {
  const avatar = isWelcome ? '⚖️' : (state.persona?.avatar ?? '⚖️');
  const content = fmt(text);

  // Citations
  const cites = citations.length
    ? `<div class="citations">${citations.map(c => `<span class="cite-chip">📋 ${esc(String(c))}</span>`).join('')}</div>`
    : '';

  // Nearest office
  let offHtml = '';
  if (office) {
    offHtml = `
      <div class="chat-office">
        <div class="chat-office-name">🏛️ ${esc(office.officeName ?? office.name ?? '')}</div>
        <p>📍 ${esc(office.address ?? office.addressHindi ?? '')}</p>
        <p>📞 ${esc(office.phone ?? '')}${office.helpline ? ` · ${office.helpline}` : ''}</p>
        <p>🚇 ${esc(office.nearestMetro ?? '')}</p>
      </div>
    `;
  }

  const latBadge = ms ? `<span style="margin-left:8px;color:var(--elastic);font-size:.58rem">⚡ ${ms}ms</span>` : '';

  const d = document.createElement('div');
  d.className = 'msg msg--bot' + (isWelcome ? ' msg--welcome' : '');
  d.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-body">
      <div class="msg-bubble">
        <button class="msg-copy-btn" title="Copy response text" aria-label="Copy message text">📋 Copy</button>
        ${content}
        ${offHtml}
        ${cites}
      </div>
      <div class="msg-time">${now()} · Shrayak AI${latBadge}</div>
    </div>
  `;

  // Attach copy event handler
  const copyBtn = d.querySelector('.msg-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      // Strip HTML tags for clean text copying
      const cleanText = text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanText).then(() => {
        copyBtn.textContent = '✓ Copied';
        copyBtn.classList.add('copied');
        toast('📋 Response copied to clipboard');
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy';
          copyBtn.classList.remove('copied');
        }, 2200);
      }).catch(() => {
        toast('❌ Copy failed');
      });
    });
  }

  D.messages.appendChild(d);
  scrollBottom();
}

function addTyping() {
  const id = `t-${Date.now()}`;
  const d = document.createElement('div');
  d.className = 'msg msg--bot';
  d.id = id;
  d.innerHTML = `
    <div class="msg-avatar">⚖️</div>
    <div class="msg-body">
      <div class="msg-bubble">
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  D.messages.appendChild(d);
  scrollBottom();
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

// ══════════════════════════════════════════════════════════════════
// INPUT SETUP
// ══════════════════════════════════════════════════════════════════
function setupInput() {
  D.chatInput.addEventListener('input', () => {
    autoResize();
    const len = D.chatInput.value.length;
    D.charCount.textContent = len ? `${len}/500` : '';
    D.charCount.classList.toggle('warn', len > 400);
    D.sendBtn.disabled = len === 0 || state.loading;
  });

  D.chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!D.sendBtn.disabled) sendMsg();
    }
  });

  D.sendBtn.addEventListener('click', () => sendMsg());

  // Geo
  D.pinBtn.addEventListener('click', () => Geo.searchByPin(D.pinInput.value.trim()));
  D.pinInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') Geo.searchByPin(D.pinInput.value.trim());
  });

  // Worker search
  D.workerBtn.addEventListener('click', () => WorkerRegistry.search(D.workerInput.value.trim()));
  D.workerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') WorkerRegistry.search(D.workerInput.value.trim());
  });

  // Mobile sidebar
  D.menuBtn.addEventListener('click', () => {
    D.sidebar.classList.toggle('open');
    D.sbOverlay.classList.toggle('show');
  });

  D.sbOverlay.addEventListener('click', () => {
    D.sidebar.classList.remove('open');
    D.sbOverlay.classList.remove('show');
  });

  // Language buttons
  D.langHiBtn?.addEventListener('click', () => setLanguage('hi'));
  D.langEnBtn?.addEventListener('click', () => setLanguage('en'));
}

function setLanguage(lang) {
  if (state.language === lang) return;
  state.language = lang;

  D.langHiBtn?.classList.toggle('active', lang === 'hi');
  D.langEnBtn?.classList.toggle('active', lang === 'en');

  const isEn = lang === 'en';
  toast(isEn ? 'Language set to English' : 'भाषा हिन्दी चुनी गई');

  // Translate basic UI labels dynamically
  const labels = {
    'worker-search-input': isEn ? 'Name or UAN (e.g. Ramesh)' : 'नाम या UAN (जैसे: रमेश)',
    'pin-input': isEn ? 'Pin code (e.g. 110092)' : 'पिन कोड (जैसे: 110092)',
    'chat-input': isEn ? 'Type your question here... (Hindi or English)' : 'अपना सवाल यहाँ टाइप करें… (Hindi or English)',
  };
  for (const [id, txt] of Object.entries(labels)) {
    const el = document.getElementById(id);
    if (el) el.placeholder = txt;
  }

  // Update current active persona representation if selected
  if (state.persona) {
    Personas.select(state.persona.id);
  } else {
    // Welcome message fallback refresh
    D.messages.innerHTML = '';
    const welcomeText = isEn 
      ? `🙏 **Welcome to Shrayak!** 
I am now ready to answer your questions in English. Let's discuss your labour rights. Please select a worker persona from the sidebar to begin.`
      : `🙏 **नमस्ते! मैं Shrayak हूं — आपका श्रमिक अधिकार सहायक।**
अब मैं आपके प्रश्नों के उत्तर हिन्दी में देने के लिए तैयार हूँ। चलिए आपके अधिकारों के बारे में बात करते हैं। कृपया आगे बढ़ने के लिए साइडबार से एक श्रमिक भूमिका चुनें।`;
    addBotMsg(welcomeText, [], null, true);
  }
}

// ══════════════════════════════════════════════════════════════════
// FALLBACK PERSONAS
// ══════════════════════════════════════════════════════════════════
function fallbackPersonas() {
  return [
    {
      id: 'ramesh', name: 'Ramesh Kumar', nameHindi: 'रमेश कुमार',
      origin: 'Bihar', originHindi: 'मुज़फ्फ़रपुर, बिहार',
      occupation: 'Construction Worker', occupationHindi: 'निर्माण श्रमिक',
      avatar: '👷', color: '#f97316', language: 'hi',
      aqiSensitive: true, geoFocused: true,
      starterQuestions: ['मेरा न्यूनतम वेतन क्या है?', 'BOCW कार्ड कैसे बनाएं?', 'मुझे श्रम कार्यालय कहाँ मिलेगा?'],
      starterQuestionsEn: [
        'Should I go to work today? Air pollution in Delhi is very high.',
        'My contractor pays me ₹700 daily — is this correct?',
        'How do I register for a BOCW card? What benefits will I get?',
        'I do not have any written contract — can I still file a complaint?',
        'Where can I find the nearest Labour Office?',
      ],
      welcomeMessage: 'नमस्ते रमेश! मैं Shrayak हूं। आज आपके अधिकारों और न्यूनतम वेतन की जानकारी दूंगा।',
      welcomeMessageEn: 'Namaste Ramesh! I am Shrayak. Today, I will guide you on Delhi\'s air quality and your labor rights as a construction worker.',
    },
    {
      id: 'sita', name: 'Sita Devi', nameHindi: 'सीता देवी',
      origin: 'UP', originHindi: 'कानपुर, उत्तर प्रदेश',
      occupation: 'Domestic Worker', occupationHindi: 'घरेलू कामगार',
      avatar: '👩', color: '#8b5cf6', language: 'hi',
      aqiSensitive: false, geoFocused: true,
      starterQuestions: ['घरेलू कामगार का न्यूनतम वेतन?', 'e-Shram कार्ड कैसे बनाएं?', 'छुट्टी के अधिकार क्या हैं?'],
      starterQuestionsEn: [
        'My employer pays me ₹5000 a month — is this legal?',
        'I do not get a single rest day in the week — what should I do?',
        'What are the laws protecting domestic helpers?',
        'If my employer behaves badly, where should I file a complaint?',
        'What do I need to register for an e-Shram card?',
      ],
      welcomeMessage: 'नमस्ते सीता जी! आपके घरेलू कामगार अधिकारों के लिए यहां हूं।',
      welcomeMessageEn: 'Namaste Sita Devi! I am Shrayak. I am here to help you understand your rights as a domestic helper.',
    },
    {
      id: 'priya', name: 'Priya Sharma', nameHindi: 'प्रिया शर्मा',
      origin: 'Rajasthan', originHindi: 'जयपुर, राजस्थान',
      occupation: 'Garment Worker', occupationHindi: 'वस्त्र उद्योग श्रमिक',
      avatar: '👩‍💼', color: '#06b6d4', language: 'hi',
      aqiSensitive: false, geoFocused: false,
      starterQuestions: ['ओवरटाइम का पैसा कितना मिलेगा?', 'ESI शिकायत कहां करें?', 'मातृत्व अवकाश कैसे मिलेगा?'],
      starterQuestionsEn: [
        'They make me work 10 hours at the factory — is this legal?',
        'How much should I be paid for overtime hours?',
        'ESI is deducted but I cannot get hospital treatments — what to do?',
        'What is the process to get paid maternity leave?',
        'What is the official minimum wage for semi-skilled workers?',
      ],
      welcomeMessage: 'नमस्ते प्रिया! आपके कारखाना अधिकारों के बारे में बात करते हैं।',
      welcomeMessageEn: 'Namaste Priya! I am Shrayak. I am here to help you check your factory worker rights and overtime pay.',
    },
  ];
}

// ══════════════════════════════════════════════════════════════════
// PARTICLE CANVAS ANIMATION
// ══════════════════════════════════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0;

  function resize() {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 28 }, () => ({
    x: Math.random() * (width || 800),
    y: Math.random() * (height || 600),
    r: Math.random() * 2 + 1,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    alpha: Math.random() * 0.4 + 0.15,
    color: Math.random() > 0.5 ? '#6366f1' : (Math.random() > 0.5 ? '#06b6d4' : '#00bfb3'),
  }));

  function animate() {
    if (!width || !height) {
      resize();
    }
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ══════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════
async function boot() {
  resolveDOM();
  setupInput();
  initParticles();

  // LiveWages must init first — WorkerRegistry.render() uses its rates
  await LiveWages.init();

  await Promise.allSettled([
    Personas.init(),
    Stats.init(),
    LiveStats.init(),
    NewsFeed.init(),
    healthCheck(),
  ]);

  setInterval(healthCheck, 60_000);
}

document.addEventListener('DOMContentLoaded', boot);
