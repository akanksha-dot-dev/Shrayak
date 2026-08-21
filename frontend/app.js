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
  persona: null,
  aqiData: null,
  loading: false,
  rateLimitedUntil: 0,
  language: 'hi',
};

// ══════════════════════════════════════════════════════════════════
// DOM — resolved after DOMContentLoaded
// ══════════════════════════════════════════════════════════════════
let D = {};
//added


function resolveDOM() {
  const g = id => document.getElementById(id);
  D = {
    // Language
    langHiBtn: g('lang-hi-btn'),
    langEnBtn: g('lang-en-btn'),
    // Worker Registry
    workerInput: g('worker-search-input'),
    workerBtn: g('worker-search-btn'),
    workerResult: g('worker-result'),
    // Sidebar persona
    personaCards: g('persona-cards'),
    // Geo
    pinInput: g('pin-input'),
    pinBtn: g('pin-search-btn'),
    geoResult: g('geo-result'),
    // Security
    telemDot: g('telem-dot'),
    telemStatus: g('telemetry-status'),
    statTotal: g('stat-total'),
    statPII: g('stat-pii'),
    statLatency: g('stat-latency'),
    statSuccess: g('stat-success'),
    // Chat
    chatAvatar: g('chat-persona-name') ? g('chat-avatar') : null,
    chatName: g('chat-persona-name'),
    chatSub: g('chat-persona-sub'),
    starters: g('starter-questions'),
    messages: g('chat-messages'),
    chatInput: g('chat-input'),
    charCount: g('char-count'),
    sendBtn: g('send-btn'),
    // Elastic
    elasticDot: g('elastic-dot'),
    // Mobile
    menuBtn: g('mobile-menu-btn'),
    sidebar: document.querySelector('.sidebar'),
    sbOverlay: g('sb-overlay'),
    // Toast
    toast: g('toast'),
    // New elements
    thinkingBar: g('thinking-bar'),
    scrollFab: g('scroll-fab'),
    scrollFabBadge: g('scroll-fab-badge'),
    micBtn: g('mic-btn'),
    sbCollapseBtn: g('sb-collapse-btn'),
    // Tool buttons & Modals
    btnOpenCalc: g('btn-open-calc'),
    btnOpenNotice: g('btn-open-notice'),
    btnOpenHelplines: g('btn-open-helplines'),
    calcModal: g('wage-calc-modal'),
    calcBackdrop: g('calc-modal-backdrop'),
    calcClose: g('calc-modal-close'),
    calcGenNoticeBtn: g('calc-gen-notice-btn'),
    helplineModal: g('helpline-modal'),
    helplineBackdrop: g('helpline-modal-backdrop'),
    helplineClose: g('helpline-modal-close'),
    whatsappSosBtn: g('whatsapp-sos-btn'),
    // Notice Modal
    noticeModal: g('legal-notice-modal'),
    noticeBackdrop: g('notice-modal-backdrop'),
    noticeClose: g('notice-modal-close'),
    noticePaper: g('notice-paper-content'),
    noticeLangHi: g('notice-lang-hi'),
    noticeLangEn: g('notice-lang-en'),
    noticeCopyBtn: g('notice-copy-btn'),
    noticePrintBtn: g('notice-print-btn'),
    noticeAskAiBtn: g('notice-ask-ai-btn'),
    // Voice Dictation Overlay
    voiceOverlay: g('voice-overlay'),
    voiceTitle: g('voice-title'),
    voiceTranscript: g('voice-transcript'),
    voiceCancelBtn: g('voice-cancel-btn'),
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

/**
 * Enhanced markdown renderer: supports **bold**, ### headers,
 * `inline code`, numbered lists (1. ...), bullet lists, and newlines.
 */
function fmt(text) {
  if (!text) return '';
  let s = esc(text);
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // ### Headers
  s = s.replace(/(^|&lt;br&gt;|<br>)###\s+(.+)/g, '$1<h3>$2</h3>');
  // Inline code `...`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Newlines to <br>
  s = s.replace(/\n/g, '<br>');
  // Numbered lists: replace lines starting with "1. ", "2. ", etc.
  s = s.replace(/((?:^|<br>)\s*)([0-9]+)\.\s+/g, (m, pre, num) => {
    return `${pre}<span style="color:var(--indigo-lt);font-weight:700">${num}.</span>&nbsp;`;
  });
  // Bullet lists
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

// ── Thinking bar ───────────────────────────────────────────────────────────────
function setThinking(on) {
  D.thinkingBar?.classList.toggle('active', on);
}

// ── Scroll FAB ─────────────────────────────────────────────────────────────
let _unreadCount = 0;
let _userScrolledUp = false;

function setupScrollFab() {
  if (!D.messages || !D.scrollFab) return;

  D.messages.addEventListener('scroll', () => {
    const distFromBottom = D.messages.scrollHeight - D.messages.scrollTop - D.messages.clientHeight;
    _userScrolledUp = distFromBottom > 80;
    D.scrollFab.classList.toggle('visible', _userScrolledUp);
    if (!_userScrolledUp) {
      _unreadCount = 0;
      if (D.scrollFabBadge) D.scrollFabBadge.style.display = 'none';
    }
  });

  D.scrollFab.addEventListener('click', () => {
    D.messages.scrollTo({ top: D.messages.scrollHeight, behavior: 'smooth' });
    _unreadCount = 0;
    if (D.scrollFabBadge) D.scrollFabBadge.style.display = 'none';
  });
}

function bumpUnread() {
  if (!_userScrolledUp) return;
  _unreadCount++;
  if (D.scrollFabBadge) {
    D.scrollFabBadge.textContent = _unreadCount > 9 ? '9+' : String(_unreadCount);
    D.scrollFabBadge.style.display = 'flex';
  }
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
    D.chatSub.textContent = isEn ? `${p.origin} | ${p.occupation}` : `${p.originHindi} | ${p.occupationHindi}`;

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
      D.statTotal.textContent = d.totalRequests ?? '--';
      D.statPII.textContent = d.piiDetectionRate ?? '--';
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
    const total = document.getElementById('stat-total-workers');
    const bocw = document.getElementById('stat-bocw');
    const under = document.getElementById('stat-underpaid');
    const avgW = document.getElementById('stat-avg-wage');
    const hint = document.getElementById('stats-fetchedAt');
    const badge = document.getElementById('stats-live-badge');
    const pill = document.getElementById('data-stream-label');
    const pillDot = document.getElementById('data-stream-dot');

    if (total) this.animateNum(total, String(d.totalWorkers ?? '--'));
    if (bocw) this.animateNum(bocw, String(d.bocwRegistered ?? '--'));
    if (under) this.animateNum(under, String(d.underpaidCount ?? '--'));
    if (avgW) this.animateNum(avgW, d.avgWage ? `₹${d.avgWage}` : '--');

    const ts = d.fetchedAt ? new Date(d.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    if (hint) hint.textContent = `Last updated: ${ts} · ${d.live ? 'Elastic Live' : 'Cached'}`;

    if (badge) {
      badge.style.background = d.live ? 'rgba(16,185,129,.12)' : 'rgba(251,191,36,.12)';
      badge.style.color = d.live ? 'var(--green)' : 'var(--yellow)';
      badge.style.borderColor = d.live ? 'rgba(16,185,129,.28)' : 'rgba(251,191,36,.28)';
      badge.textContent = d.live ? '● LIVE' : '○ Cached';
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
    const el = document.getElementById('news-feed');
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
      badge.style.background = d.live ? 'rgba(16,185,129,.12)' : 'rgba(251,191,36,.12)';
      badge.style.color = d.live ? 'var(--green)' : 'var(--yellow)';
      badge.style.borderColor = d.live ? 'rgba(16,185,129,.28)' : 'rgba(251,191,36,.28)';
      badge.textContent = d.live ? '● PIB Live' : '○ Archived';
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
  const pin = pinMatch?.[1] ?? null;

  addUserMsg(text);
  D.chatInput.value = '';
  D.chatInput.style.height = 'auto';
  D.charCount.textContent = '';
  D.sendBtn.disabled = true;

  if (pin) setTimeout(() => Geo.searchByPin(pin), 600);

  const typingId = addTyping();
  state.loading = true;
  const t0 = Date.now();
  setThinking(true);

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: text,
        language: state.language ?? 'hi',
        ...(pin && { pinCode: pin }),
        ...(state.persona?.id && { personaId: state.persona.id }),
      }),
    });

    removeTyping(typingId);
    setThinking(false);

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
    bumpUnread();

    // Refresh stats
    setTimeout(() => Stats.fetch(), 2000);

  } catch (err) {
    removeTyping(typingId);
    setThinking(false);
    addBotMsg(`⚠️ माफ़ कीजिए, त्रुटि हुई। पुनः प्रयास करें।\n\n${err.message}\n\n📞 Helpline: 1800-11-2345`, [], null);
    toast('❌ Request failed');
  } finally {
    state.loading = false;
    setThinking(false);
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
      <div class="msg-bubble">${esc(text).replace(/\n/g, '<br>')}</div>
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

  // Citations (Interactive Grounded Law Badges)
  const cites = citations.length
    ? `<div class="citations">${citations.map(c => `<span class="cite-chip citation-badge" style="cursor:pointer" title="Click to view full statutory context">📖 ${esc(String(c))}</span>`).join('')}</div>`
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
        <div class="msg-bubble-tools" style="display:flex;gap:6px;position:absolute;top:8px;right:10px;">
          <button class="msg-tts-btn btn-tts" title="Listen to response (Audio Read-Aloud)" aria-label="Listen to response">🔊 Listen</button>
          <button class="msg-copy-btn" title="Copy response text" aria-label="Copy message text">📋 Copy</button>
        </div>
        <div class="msg-content"></div>
        ${offHtml}
        ${cites}
      </div>
      <div class="msg-reactions">
        <button class="react-btn" data-react="up" aria-label="Helpful">👍 Helpful</button>
        <div class="react-sep"></div>
        <button class="react-btn" data-react="down" aria-label="Not helpful">👎 Not helpful</button>
      </div>
      <div class="msg-time">${now()} · Shrayak AI${latBadge}</div>
    </div>
  `;

  // Stream the content into .msg-content
  const contentEl = d.querySelector('.msg-content');
  if (!isWelcome) {
    streamText(contentEl, content);
  } else {
    contentEl.innerHTML = content;
  }

  // Attach copy event handler
  const copyBtn = d.querySelector('.msg-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const cleanText = text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanText).then(() => {
        copyBtn.textContent = '✓ Copied';
        copyBtn.classList.add('copied');
        toast('📋 Response copied to clipboard');
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy';
          copyBtn.classList.remove('copied');
        }, 2200);
      }).catch(() => toast('❌ Copy failed'));
    });
  }

  // Attach TTS Audio Read-Aloud event handler
  const ttsBtn = d.querySelector('.msg-tts-btn');
  if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
      VoiceAssistant.speak(text, ttsBtn);
    });
  }

  // Attach Citation detail modal click handlers
  d.querySelectorAll('.citation-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const citeText = badge.textContent.replace(/^📖\s*/, '');
      CitationViewer.open(citeText);
    });
  });

  // Reaction buttons
  d.querySelectorAll('.react-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reaction = btn.dataset.react;
      d.querySelectorAll('.react-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
      btn.classList.add(reaction === 'up' ? 'active-up' : 'active-down');
      toast(reaction === 'up' ? '👍 Thanks for the feedback!' : '👎 We\'ll improve our responses');
    });
  });

  D.messages.appendChild(d);
  scrollBottom();
}

function addTyping() {
  const id = `t-${Date.now()}`;
  const d = document.createElement('div');
  d.className = 'msg msg--bot';
  d.id = id;
  const persona = state.persona;
  const name = persona ? (state.language === 'hi' ? persona.nameHindi : persona.name) : 'Shrayak';
  d.innerHTML = `
    <div class="msg-avatar">${state.persona?.avatar ?? '⚖️'}</div>
    <div class="msg-body">
      <div class="msg-bubble" style="padding:10px 16px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          <span style="font-size:0.68rem;color:var(--t3);font-style:italic">${esc(name)} सोच रहा है…</span>
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

// ──────────────────────────────────────────────────────────────────
// STREAM TEXT ANIMATION
// ──────────────────────────────────────────────────────────────────
/**
 * Streams HTML content into el character by character (on text nodes),
 * skipping over HTML tags which are injected instantly.
 */
function streamText(el, html, onDone) {
  // Parse into text segments and HTML tags
  // We'll use a temp div to convert html to plain tokens
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Flatten to an array of { type: 'tag'|'text', value } tokens
  const tokens = [];
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) tokens.push({ type: 'text', value: node.textContent });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const openTag = node.outerHTML.replace(node.innerHTML + '</' + node.tagName.toLowerCase() + '>', '');
      tokens.push({ type: 'tag-open', tag: node.tagName.toLowerCase(), el: node });
      node.childNodes.forEach(walk);
      tokens.push({ type: 'tag-close', tag: node.tagName.toLowerCase() });
    }
  }
  // Simpler approach: stream at HTML-string level, injecting tag chars instantly
  const chars = [...html]; // split by character
  let i = 0;
  let current = '';

  // Add a cursor
  const cursor = document.createElement('span');
  cursor.className = 'stream-cursor';
  el.appendChild(cursor);

  const CHUNK = 3;  // characters to reveal per frame at low speed
  const DELAY = 12; // ms per chunk

  function step() {
    if (i >= chars.length) {
      el.innerHTML = html;
      if (onDone) onDone();
      return;
    }

    // Skip ahead through HTML tags instantly
    if (chars[i] === '<') {
      while (i < chars.length && chars[i] !== '>') {
        current += chars[i++];
      }
      if (i < chars.length) current += chars[i++]; // include '>'
      el.innerHTML = current + '<span class="stream-cursor"></span>';
      setTimeout(step, 0); // don't delay on tags
      return;
    }

    // Reveal CHUNK text characters
    let added = 0;
    while (i < chars.length && chars[i] !== '<' && added < CHUNK) {
      current += chars[i++];
      added++;
    }
    el.innerHTML = current + '<span class="stream-cursor"></span>';
    D.messages.scrollTop = D.messages.scrollHeight;
    setTimeout(step, DELAY);
  }

  step();
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

  // Sidebar collapse toggle
  let _sidebarCollapsed = false;
  D.sbCollapseBtn?.addEventListener('click', () => {
    _sidebarCollapsed = !_sidebarCollapsed;
    D.sidebar.classList.toggle('collapsed', _sidebarCollapsed);
    D.sbCollapseBtn.textContent = _sidebarCollapsed ? '▶' : '◀';
    D.sbCollapseBtn.title = _sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  });

  // Mic button — placeholder (Web Speech API roadmap)
  D.micBtn?.addEventListener('click', () => {
    toast('🎙️ Voice input coming soon! Use keyboard for now.');
  });

  // Scroll FAB
  setupScrollFab();
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

  const particles = Array.from({ length: 36 }, () => ({
    x: Math.random() * (width || 800),
    y: Math.random() * (height || 600),
    r: Math.random() * 2.2 + 0.8,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    alpha: Math.random() * 0.35 + 0.12,
    color: Math.random() > 0.5 ? '#6366f1' : (Math.random() > 0.5 ? '#06b6d4' : '#00bfb3'),
  }));

  const CONNECTION_DIST = 110; // max px distance for a connection line

  function animate() {
    if (!width || !height) resize();
    ctx.clearRect(0, 0, width, height);

    // Draw connection lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const lineAlpha = (1 - dist / CONNECTION_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = a.color;
          ctx.globalAlpha = lineAlpha;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw particles
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
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    requestAnimationFrame(animate);
  }
  animate();
}

// ══════════════════════════════════════════════════════════════════
// VOICE ASSISTANT (SPEECH-TO-TEXT & TEXT-TO-SPEECH)
// ══════════════════════════════════════════════════════════════════
const VoiceAssistant = {
  recognition: null,
  isRecording: false,
  synth: window.speechSynthesis,
  activeUtterance: null,
  activeTtsBtn: null,

  initSTT() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (D.micBtn) {
        D.micBtn.title = 'Speech recognition not supported in this browser';
        D.micBtn.addEventListener('click', () => toast('🎙️ Voice input requires Chrome or Edge browser.'));
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isRecording = true;
      if (D.micBtn) {
        D.micBtn.classList.add('recording');
        D.micBtn.title = 'Listening... Click to stop';
      }
      toast(state.language === 'en' ? '🎙️ Listening... Speak now' : '🎙️ सुन रहा हूँ... बोलिए');
    };

    this.recognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      if (D.voiceTranscript) D.voiceTranscript.textContent = transcript || 'बोलिए...';
      if (D.chatInput && transcript) {
        D.chatInput.value = transcript;
        autoResize();
        D.sendBtn.disabled = false;
      }
    };

    this.recognition.onerror = (e) => {
      this.stopSTT();
      toast(`🎙️ Voice error: ${e.error}`);
    };

    this.recognition.onend = () => {
      this.stopSTT();
    };

    if (D.micBtn) {
      D.micBtn.title = 'Voice input (Click to speak)';
      D.micBtn.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopSTT();
        } else {
          this.startSTT();
        }
      });
    }

    D.voiceCancelBtn?.addEventListener('click', () => this.stopSTT());
  },

  startSTT() {
    if (!this.recognition) return;
    this.isRecording = true;
    this.recognition.lang = state.language === 'en' ? 'en-IN' : 'hi-IN';
    if (D.voiceOverlay) D.voiceOverlay.style.display = 'flex';
    if (D.voiceTitle) D.voiceTitle.textContent = state.language === 'en' ? '🎙️ Listening... (Say your query)' : '🎙️ सुन रहे हैं... (अपना सवाल बोलें)';
    if (D.voiceTranscript) D.voiceTranscript.textContent = state.language === 'en' ? 'Listening...' : 'बोलिए...';
    try {
      this.recognition.start();
    } catch (e) {
      this.stopSTT();
    }
  },

  stopSTT() {
    this.isRecording = false;
    if (D.voiceOverlay) D.voiceOverlay.style.display = 'none';
    if (D.micBtn) {
      D.micBtn.classList.remove('recording');
      D.micBtn.title = 'Voice input (Click to speak)';
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { }
    }
  },

  // Text-To-Speech (TTS Audio Read-Aloud)
  speak(text, btn) {
    if (!this.synth) {
      toast('🔊 Speech Synthesis not supported in this browser.');
      return;
    }

    if (this.synth.speaking) {
      this.synth.cancel();
      if (this.activeTtsBtn) {
        this.activeTtsBtn.classList.remove('playing');
        this.activeTtsBtn.innerHTML = '🔊 Listen';
      }
      if (this.activeTtsBtn === btn) {
        this.activeTtsBtn = null;
        return; // user clicked to stop playback
      }
    }

    // Clean markdown text for TTS
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*/g, '')
      .replace(/###/g, '')
      .replace(/`/g, '')
      .replace(/📍|📞|🚇|💰|🏗️|📋|⚖️|🙏|🟢|🔴|⚡/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = state.language === 'en' ? 'en-IN' : 'hi-IN';
    utterance.rate = 0.95;

    // Try to find native Hindi or English voice
    const voices = this.synth.getVoices();
    const targetLang = state.language === 'en' ? 'en' : 'hi';
    const matchVoice = voices.find(v => v.lang.toLowerCase().includes(targetLang));
    if (matchVoice) utterance.voice = matchVoice;

    utterance.onstart = () => {
      this.activeTtsBtn = btn;
      if (btn) {
        btn.classList.add('playing');
        btn.innerHTML = '⏹ Stop';
      }
    };

    utterance.onend = utterance.onerror = () => {
      if (btn) {
        btn.classList.remove('playing');
        btn.innerHTML = '🔊 Listen';
      }
      this.activeTtsBtn = null;
    };

    this.activeUtterance = utterance;
    this.synth.speak(utterance);
  }
};

// ══════════════════════════════════════════════════════════════════
// LEGAL NOTICE GENERATOR ENGINE
// ══════════════════════════════════════════════════════════════════
const LegalNoticeManager = {
  lang: 'hi',
  _lastText: '',

  init() {
    D.btnOpenNotice?.addEventListener('click', () => this.open());
    D.noticeClose?.addEventListener('click', () => this.close());
    D.noticeBackdrop?.addEventListener('click', () => this.close());

    D.noticeLangHi?.addEventListener('click', () => {
      this.lang = 'hi';
      D.noticeLangHi.classList.add('active');
      D.noticeLangEn.classList.remove('active');
      this.render();
    });

    D.noticeLangEn?.addEventListener('click', () => {
      this.lang = 'en';
      D.noticeLangEn.classList.add('active');
      D.noticeLangHi.classList.remove('active');
      this.render();
    });

    const fields = [
      'notice-worker-name', 'notice-employer-name', 'notice-site-loc',
      'notice-skill', 'notice-actual-rate', 'notice-days',
      'notice-overtime-hrs', 'notice-claim-type'
    ];
    fields.forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('input', () => this.render());
      el?.addEventListener('change', () => this.render());
    });

    D.noticeCopyBtn?.addEventListener('click', () => this.copyNotice());
    D.noticePrintBtn?.addEventListener('click', () => this.printNotice());
    D.noticeAskAiBtn?.addEventListener('click', () => this.askAI());
    document.getElementById('notice-whatsapp-btn')?.addEventListener('click', () => this.shareWhatsApp());
  },

  shareWhatsApp() {
    if (!this._lastText) this.render();
    const text = `📜 *SHRAYAK FORMAL STATUTORY LEGAL NOTICE* 📜\n\n${this._lastText}\n\n(Generated via Shrayak Legal Assistant — Delhi Labour Rights)`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  open(prefill = {}) {
    if (prefill.workerName) document.getElementById('notice-worker-name').value = prefill.workerName;
    if (prefill.employerName) document.getElementById('notice-employer-name').value = prefill.employerName;
    if (prefill.skillCategory) document.getElementById('notice-skill').value = prefill.skillCategory;
    if (prefill.actualWage) document.getElementById('notice-actual-rate').value = prefill.actualWage;
    if (prefill.daysWorked) document.getElementById('notice-days').value = prefill.daysWorked;
    if (prefill.overtimeHrs) document.getElementById('notice-overtime-hrs').value = prefill.overtimeHrs;

    if (D.noticeModal) D.noticeModal.style.display = 'flex';
    if (D.noticeBackdrop) D.noticeBackdrop.style.display = 'block';
    this.render();
  },

  close() {
    if (D.noticeModal) D.noticeModal.style.display = 'none';
    if (D.noticeBackdrop) D.noticeBackdrop.style.display = 'none';
  },

  render() {
    const workerName = document.getElementById('notice-worker-name')?.value || 'Ram Kumar';
    const employerName = document.getElementById('notice-employer-name')?.value || 'Apex Builders Pvt Ltd';
    const siteLoc = document.getElementById('notice-site-loc')?.value || 'Rohini Sector-6, Delhi';
    const skillCategory = document.getElementById('notice-skill')?.value || 'unskilled';
    const actualRate = parseFloat(document.getElementById('notice-actual-rate')?.value || '450');
    const daysWorked = parseFloat(document.getElementById('notice-days')?.value || '90');
    const overtimeHrs = parseFloat(document.getElementById('notice-overtime-hrs')?.value || '50');
    const claimType = document.getElementById('notice-claim-type')?.value || 'wage_and_overtime';

    const minDailyRate = LiveWages.getMin(skillCategory);
    const minHourlyRate = minDailyRate / 8;
    const otHourlyRate = minHourlyRate * 2;

    const wageShortfall = Math.max(0, minDailyRate - actualRate) * daysWorked;
    const otDues = Math.round(overtimeHrs * otHourlyRate);
    const migrantAllowance = claimType.includes('migrant') || claimType === 'full_combined' ? Math.round(minDailyRate * 26 * 0.5) : 0;
    const grapComp = claimType.includes('grap') || claimType === 'full_combined' ? Math.round(minDailyRate * 7) : 0;

    const totalClaim = wageShortfall + otDues + migrantAllowance + grapComp;

    const isHi = this.lang === 'hi';
    const dateStr = new Date().toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    let text = '';

    if (isHi) {
      text = `वैधानिक मांग सूचना पत्र (STATUTORY DEMAND NOTICE)
दिनांक: ${dateStr}

प्रेषक: ${workerName} (श्रमिक/पीडित पक्ष)
स्थान/पता: ${siteLoc}

सेवा में,
${employerName} (ठेकेदार/नियोक्ता)
कार्यस्थल: ${siteLoc}

विषय: न्यूनतम वेतन अधिनियम, 1948 की धारा 20 एवं अंतर-राज्यीय प्रवासी कर्मकार अधिनियम, 1979 के अंतर्गत बकाया वेतन व भत्तों के भुगतान हेतु विधिक नोटिस।

महोदय,

1. प्रार्थी (${workerName}) आपके अधीन ${siteLoc} पर '${skillCategory.toUpperCase()}' श्रेणी के श्रमिक के रूप में कुल ${daysWorked} दिवस कार्यरत रहा है।

2. दिल्ली सरकार की आधिकारिक अधिसूचना के अनुसार न्यूनतम वेतन दर ₹${minDailyRate}/प्रतिदिन निर्धारित है। किंतु आपने प्रार्थी को केवल ₹${actualRate}/प्रतिदिन का भुगतान किया है।

3. बकाया राशि का वैधानिक विवरण निम्नलिखित है:
   • न्यूनतम वेतन अंतर राशि (${daysWorked} दिन @ ₹${Math.max(0, minDailyRate - actualRate)}/दिन): ₹${wageShortfall.toLocaleString('en-IN')}
   • ओवरटाइम बकाया (${overtimeHrs} घंटे @ 2x दर ₹${otHourlyRate.toFixed(1)}/घंटा): ₹${otDues.toLocaleString('en-IN')}
   ${migrantAllowance ? `• प्रवासी मजदूर विस्थापन भत्ता (धारा 14, 1979 अधिनियम): ₹${migrantAllowance.toLocaleString('en-IN')}\n` : ''}${grapComp ? `• GRAP कार्य स्थगन वैधानिक मुआवजा (7 दिन): ₹${grapComp.toLocaleString('en-IN')}\n` : ''}   --------------------------------------------------------
   कुल देय वैधानिक दावा राशि: ₹${totalClaim.toLocaleString('en-IN')}

4. अतः इस कानूनी नोटिस के माध्यम से आपको निर्देशित किया जाता है कि नोटिस प्राप्ति के 7 (सात) दिनों के भीतर उक्त राशि ₹${totalClaim.toLocaleString('en-IN')} प्रार्थी को भुगतान करें, अन्यथा प्रार्थी क्षेत्रीय श्रम आयुक्त (Labour Commissioner, Delhi) एवं श्रम न्यायालय में धारा 20 के तहत वाद दायर करने हेतु स्वतंत्र होगा।

भवदीय,
${workerName}
(संपर्क/हस्ताक्षर)`;
    } else {
      text = `FORMAL STATUTORY DEMAND NOTICE
Date: ${dateStr}

FROM: ${workerName} (Claimant / Worker)
Address/Site: ${siteLoc}

TO:
${employerName} (Employer / Contractor)
Work Site Location: ${siteLoc}

SUBJECT: STATUTORY DEMAND NOTICE FOR UNPAID WAGES & OVERTIME UNDER SECTION 20, MINIMUM WAGES ACT, 1948 & INTER-STATE MIGRANT WORKMEN ACT, 1979.

Sir / Madam,

1. The Claimant (${workerName}) was employed by you as a '${skillCategory.toUpperCase()}' worker at ${siteLoc} for a total period of ${daysWorked} days.

2. As per official Delhi Government Notifications, the statutory minimum wage rate is ₹${minDailyRate}/day. However, you illegally underpaid the Claimant at ₹${actualRate}/day.

3. STATUTORY CLAIM BREAKDOWN:
   • Base Wage Shortfall (${daysWorked} days @ ₹${Math.max(0, minDailyRate - actualRate)}/day short): ₹${wageShortfall.toLocaleString('en-IN')}
   • Overtime Dues (${overtimeHrs} hrs @ 2x rate = ₹${otHourlyRate.toFixed(1)}/hr): ₹${otDues.toLocaleString('en-IN')}
   ${migrantAllowance ? `• Inter-State Displacement Allowance (Sec 14, 1979 Act): ₹${migrantAllowance.toLocaleString('en-IN')}\n` : ''}${grapComp ? `• GRAP IV Work Halt Compensation (7 days): ₹${grapComp.toLocaleString('en-IN')}\n` : ''}   --------------------------------------------------------
   TOTAL STATUTORY DUES OWED: ₹${totalClaim.toLocaleString('en-IN')}

4. You are hereby called upon to remit the total statutory dues of ₹${totalClaim.toLocaleString('en-IN')} within 7 (seven) days of receipt of this notice. Failing this, formal legal proceedings under Section 20 of the Minimum Wages Act 1948 will be initiated before the Labour Commissioner, Delhi.

Yours faithfully,
${workerName}
(Signature / Contact)`;
    }

    if (D.noticePaper) D.noticePaper.textContent = text;
    this._lastText = text;
  },

  copyNotice() {
    if (!this._lastText) return;
    navigator.clipboard.writeText(this._lastText).then(() => toast('📋 Legal Notice text copied to clipboard!'));
  },

  printNotice() {
    if (!this._lastText) return;
    const w = window.open('', '_blank', 'width=700,height=800');
    w.document.write(`
      <html>
        <head>
          <title>Statutory Legal Notice — Shrayak</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.8; color: #111; }
            pre { font-family: inherit; white-space: pre-wrap; font-size: 14px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <pre>${this._lastText}</pre>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  },

  askAI() {
    if (!this._lastText) return;
    this.close();
    const q = this.lang === 'hi'
      ? `कृपया मेरे इस कानूनी नोटिस की समीक्षा करें और बताएं कि दिल्ली श्रम कार्यालय में धारा 20 का दावा दायर करने की प्रक्रिया क्या है:\n\n${this._lastText}`
      : `Please review this statutory notice and explain the procedure to file a Section 20 claim in Delhi:\n\n${this._lastText}`;

    D.chatInput.value = q;
    autoResize();
    sendMsg(q);
  }
};

// ══════════════════════════════════════════════════════════════════
// WAGE & OVERTIME CALCULATOR ENGINE
// ══════════════════════════════════════════════════════════════════
const WageCalculator = {
  _lastCalc: null,

  init() {
    const skillEl = document.getElementById('calc-skill');
    const actualEl = document.getElementById('calc-actual-wage');
    const hoursEl = document.getElementById('calc-hours');
    const daysEl = document.getElementById('calc-days');
    const migrantEl = document.getElementById('calc-migrant');

    [skillEl, actualEl, hoursEl, daysEl, migrantEl].forEach(el => {
      el?.addEventListener('change', () => this.calculate());
      el?.addEventListener('input', () => this.calculate());
    });

    D.calcClose?.addEventListener('click', () => this.close());
    D.calcBackdrop?.addEventListener('click', () => this.close());
    D.btnOpenCalc?.addEventListener('click', () => this.open());

    document.getElementById('calc-copy-btn')?.addEventListener('click', () => this.copySummary());
    document.getElementById('calc-ask-ai-btn')?.addEventListener('click', () => this.askAI());

    D.calcGenNoticeBtn?.addEventListener('click', () => {
      this.close();
      if (this._lastCalc) {
        LegalNoticeManager.open({
          skillCategory: this._lastCalc.skillCategory,
          actualWage: this._lastCalc.actualWage,
          daysWorked: this._lastCalc.daysWorked,
          overtimeHrs: Math.max(0, this._lastCalc.hoursPerDay - 8) * this._lastCalc.daysWorked,
        });
      } else {
        LegalNoticeManager.open();
      }
    });

    this.calculate();
  },

  open() {
    if (D.calcModal) D.calcModal.style.display = 'flex';
    if (D.calcBackdrop) D.calcBackdrop.style.display = 'block';
    this.calculate();
  },

  close() {
    if (D.calcModal) D.calcModal.style.display = 'none';
    if (D.calcBackdrop) D.calcBackdrop.style.display = 'none';
  },

  calculate() {
    const skillCategory = document.getElementById('calc-skill')?.value ?? 'unskilled';
    const minDailyWage = LiveWages.getMin(skillCategory);

    const actualWage = parseFloat(document.getElementById('calc-actual-wage')?.value ?? '500') || 0;
    const hoursPerDay = parseFloat(document.getElementById('calc-hours')?.value ?? '10') || 8;
    const daysWorked = parseFloat(document.getElementById('calc-days')?.value ?? '26') || 1;
    const isMigrant = document.getElementById('calc-migrant')?.checked ?? true;

    const normalHours = 8;
    const overtimeHoursPerDay = Math.max(0, hoursPerDay - normalHours);
    const totalOvertimeHours = overtimeHoursPerDay * daysWorked;

    const minHourlyRate = minDailyWage / 8;
    const overtimeHourlyRate = minHourlyRate * 2;
    const totalOvertimePay = Math.round(totalOvertimeHours * overtimeHourlyRate);

    const wageShortfallPerDay = Math.max(0, minDailyWage - actualWage);
    const totalBaseShortfall = Math.round(wageShortfallPerDay * daysWorked);

    const monthlyMinWage = minDailyWage * 26;
    const displacementAllowance = isMigrant ? Math.round(monthlyMinWage * 0.5) : 0;

    const totalDues = totalBaseShortfall + totalOvertimePay + displacementAllowance;

    const totalEl = document.getElementById('calc-total-dues');
    if (totalEl) totalEl.textContent = `₹${totalDues.toLocaleString('en-IN')}`;

    const breakdownEl = document.getElementById('calc-breakdown');
    if (breakdownEl) {
      const legalPct = 100;
      const actualPct = Math.min(100, Math.round((actualWage / minDailyWage) * 100));

      breakdownEl.innerHTML = `
        <div class="calc-breakdown-item">
          <span>Statutory Minimum Wage Rate:</span>
          <strong>₹${minDailyWage}/day (₹${minHourlyRate.toFixed(1)}/hr)</strong>
        </div>
        <div class="calc-breakdown-item">
          <span>Actual Wage Shortfall (${daysWorked} days @ ₹${wageShortfallPerDay}/day short):</span>
          <strong style="color:var(--red)">₹${totalBaseShortfall.toLocaleString('en-IN')}</strong>
        </div>
        <div class="calc-breakdown-item">
          <span>Overtime Dues (${totalOvertimeHours} hrs total @ 2x rate = ₹${overtimeHourlyRate.toFixed(1)}/hr):</span>
          <strong style="color:var(--yellow)">₹${totalOvertimePay.toLocaleString('en-IN')}</strong>
        </div>
        ${isMigrant ? `
        <div class="calc-breakdown-item">
          <span>Inter-State Displacement Allowance (Sec 14, 1979 Act):</span>
          <strong style="color:var(--cyan)">₹${displacementAllowance.toLocaleString('en-IN')}</strong>
        </div>
        ` : ''}

        <div class="wage-compare-bar-wrap">
          <div class="wage-compare-title">📊 Wage Comparison Visualizer</div>
          <div class="wage-bar-row">
            <span class="wage-bar-label">Statutory:</span>
            <div class="wage-bar-track">
              <div class="wage-bar-fill wage-bar-fill--legal" style="width:${legalPct}%"></div>
            </div>
            <span class="wage-bar-val" style="color:var(--green)">₹${minDailyWage}</span>
          </div>
          <div class="wage-bar-row">
            <span class="wage-bar-label">Actual Paid:</span>
            <div class="wage-bar-track">
              <div class="wage-bar-fill wage-bar-fill--actual" style="width:${actualPct}%"></div>
            </div>
            <span class="wage-bar-val" style="color:var(--red)">₹${actualWage}</span>
          </div>
        </div>
      `;
    }

    this._lastCalc = {
      skillCategory,
      minDailyWage,
      actualWage,
      hoursPerDay,
      daysWorked,
      isMigrant,
      totalBaseShortfall,
      totalOvertimePay,
      displacementAllowance,
      totalDues,
    };
  },

  copySummary() {
    if (!this._lastCalc) return;
    const c = this._lastCalc;
    const text = `📋 SHRAYAK STATUTORY WAGE & OVERTIME CLAIM SUMMARY
------------------------------------------------
Worker Skill Category: ${c.skillCategory.toUpperCase()}
Statutory Minimum Wage: ₹${c.minDailyWage}/day
Actual Wage Paid: ₹${c.actualWage}/day
Days Worked: ${c.daysWorked} days (${c.hoursPerDay} hrs/day)

LEGAL DUES BREAKDOWN:
1. Wage Underpayment Shortfall: ₹${c.totalBaseShortfall} (Sec 3 & 20, Minimum Wages Act 1948)
2. Overtime Pay (2x Rate for ${c.hoursPerDay > 8 ? c.hoursPerDay - 8 : 0} hrs/day): ₹${c.totalOvertimePay} (Sec 59, Factories Act 1948)
${c.isMigrant ? `3. Inter-State Displacement Allowance: ₹${c.displacementAllowance} (Sec 14, Migrant Workmen Act 1979)\n` : ''}
TOTAL STATUTORY CLAIM OWED: ₹${c.totalDues}
------------------------------------------------
Delhi Labour Dept Helpline: 1800-11-2345`;

    navigator.clipboard.writeText(text).then(() => toast('📋 Claim summary copied to clipboard!'));
  },

  askAI() {
    if (!this._lastCalc) return;
    const c = this._lastCalc;
    this.close();

    const isEn = state.language === 'en';
    const query = isEn
      ? `I worked for ${c.daysWorked} days at ${c.hoursPerDay} hours per day as a ${c.skillCategory} worker. My contractor paid me only ₹${c.actualWage}/day instead of statutory ₹${c.minDailyWage}/day. My total unpaid dues are ₹${c.totalDues}. Please guide me on filing a legal claim under Minimum Wages Act, 1948.`
      : `मैंने ${c.skillCategory} श्रेणी में ${c.daysWorked} दिन तक प्रति दिन ${c.hoursPerDay} घंटे काम किया। मेरे ठेकेदार ने न्यूनतम ₹${c.minDailyWage} के स्थान पर केवल ₹${c.actualWage} दिया। मेरी कुल बकाया राशि ₹${c.totalDues} है। न्यूनतम वेतन अधिनियम, 1948 के तहत शिकायत कैसे दर्ज करें?`;

    D.chatInput.value = query;
    autoResize();
    sendMsg(query);
  }
};

// ══════════════════════════════════════════════════════════════════
// EMERGENCY HELPLINES MODAL, WHATSAPP SOS & TOPIC CHIPS
// ══════════════════════════════════════════════════════════════════
function setupHelplinesAndDistrictChips() {
  // Open / Close Helpline Modal
  D.btnOpenHelplines?.addEventListener('click', () => {
    if (D.helplineModal) D.helplineModal.style.display = 'flex';
    if (D.helplineBackdrop) D.helplineBackdrop.style.display = 'block';
  });

  const closeHelpline = () => {
    if (D.helplineModal) D.helplineModal.style.display = 'none';
    if (D.helplineBackdrop) D.helplineBackdrop.style.display = 'none';
  };

  D.helplineClose?.addEventListener('click', closeHelpline);
  D.helplineBackdrop?.addEventListener('click', closeHelpline);

  // WhatsApp Distress SOS button
  D.whatsappSosBtn?.addEventListener('click', () => {
    const p = state.persona;
    const workerName = p ? p.name : 'Worker';
    const occupation = p ? p.occupation : 'Construction Worker';
    const text = `🚨 *SHRAYAK LABOUR EMERGENCY DISTRESS SOS* 🚨\n\nWorker Name: ${workerName}\nOccupation: ${occupation}\nIssue: Contractor wage dispute / illegal underpayment\nLocation: Delhi NCR\nHelpline Needed: Legal advice under Minimum Wages Act, 1948 & e-Shram Assistance.\n\nSent via Shrayak Labour Rights AI Assistant (Delhi)`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });

  // Copy buttons inside helpline modal
  document.querySelectorAll('.hl-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.copy;
      if (num) {
        navigator.clipboard.writeText(num).then(() => {
          btn.textContent = '✓ Copied';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
          toast(`📞 Helpline number ${num} copied!`);
        });
      }
    });
  });

  // District Chips under Geo Finder
  document.querySelectorAll('.geo-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.geo-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const pin = chip.dataset.pin;
      if (pin && D.pinInput) {
        D.pinInput.value = pin;
        Geo.searchByPin(pin);
      }
    });
  });

  // Quick Topic Chips bar above chat
  document.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      if (q) {
        D.chatInput.value = q;
        autoResize();
        sendMsg(q);
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// SCHEME ELIGIBILITY WIZARD MANAGER
// ══════════════════════════════════════════════════════════════════
const SchemeWizard = {
  init() {
    const btnOpen = document.getElementById('btn-open-schemes');
    const modal = document.getElementById('scheme-wizard-modal');
    const backdrop = document.getElementById('scheme-modal-backdrop');
    const closeBtn = document.getElementById('scheme-modal-close');
    const calcBtn = document.getElementById('scheme-calculate-btn');

    btnOpen?.addEventListener('click', () => this.open());
    closeBtn?.addEventListener('click', () => this.close());
    backdrop?.addEventListener('click', () => this.close());
    calcBtn?.addEventListener('click', () => this.calculate());
  },

  open() {
    const modal = document.getElementById('scheme-wizard-modal');
    const backdrop = document.getElementById('scheme-modal-backdrop');
    if (modal) modal.style.display = 'flex';
    if (backdrop) backdrop.style.display = 'block';
  },

  close() {
    const modal = document.getElementById('scheme-wizard-modal');
    const backdrop = document.getElementById('scheme-modal-backdrop');
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
  },

  async calculate() {
    const age = document.getElementById('scheme-age')?.value || '28';
    const gender = document.getElementById('scheme-gender')?.value || 'male';
    const category = document.getElementById('scheme-category')?.value || 'construction';
    const wage = document.getElementById('scheme-wage')?.value || '450';
    const bocw = document.getElementById('scheme-bocw')?.value || 'false';
    const eshram = document.getElementById('scheme-eshram')?.value || 'true';
    const container = document.getElementById('scheme-results-container');

    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `<div class="news-loading"><div class="news-pulse"></div><span>Evaluating eligible welfare schemes…</span></div>`;

    try {
      const url = `${API}/api/schemes/check?age=${age}&gender=${gender}&category=${category}&dailyWage=${wage}&bocw=${bocw}&eshram=${eshram}`;
      const res = await fetch(url);
      const data = await res.json();
      this.render(data);
    } catch {
      toast('Using offline scheme evaluator');
      this.render({
        totalEligible: 3,
        schemes: [
          {
            nameHi: 'BOCW औजार खरीद सहायता योजना',
            nameEn: 'Construction Tool Grant Scheme',
            amount: '₹20,000',
            descriptionHi: 'निर्माण श्रमिकों को औजार किट हेतु एकमुश्त सहायता',
            descriptionEn: 'Grant for purchasing professional work tools',
            authority: 'Delhi BOCW Board',
            reqBocw: true
          },
          {
            nameHi: 'आयुष्मान भारत स्वास्थ्य बीमा',
            nameEn: 'Ayushman Bharat PM-JAY Insurance',
            amount: '₹5,00,000 / वर्ष',
            descriptionHi: 'निःशुल्क कैशलेस अस्पताल भर्ती इलाज',
            descriptionEn: 'Free cashless hospitalization per family per year',
            authority: 'e-Shram & NHA',
            reqEshram: true
          }
        ]
      });
    }
  },

  render(data) {
    const container = document.getElementById('scheme-results-container');
    if (!container) return;
    const schemes = data.schemes || [];
    const isHi = state.language === 'hi';

    if (!schemes.length) {
      container.innerHTML = `<div class="geo-empty"><p>कोई योजना नहीं मिली | No matching schemes found</p></div>`;
      return;
    }

    const html = `
      <div style="margin-bottom:12px; font-weight:700; color:var(--t0); display:flex; justify-content:space-between; align-items:center;">
        <span>🎯 Eligible Schemes (${data.totalEligible ?? schemes.length} Found):</span>
        ${data.dailyDeficit > 0 ? `<span style="color:var(--red); font-size:0.8rem">⚠️ Underpaid by ₹${data.dailyDeficit}/day</span>` : ''}
      </div>
      <div class="scheme-cards-list">
        ${schemes.map((s, idx) => `
          <div class="scheme-card ${s.isAlert ? 'scheme-card--alert' : ''}">
            <div class="scheme-card-header">
              <div class="scheme-title">${isHi ? (s.nameHi || s.nameEn) : (s.nameEn || s.nameHi)}</div>
              <div class="scheme-amount">${s.amount}</div>
            </div>
            <div class="scheme-desc">${isHi ? (s.descriptionHi || s.descriptionEn) : (s.descriptionEn || s.descriptionHi)}</div>
            <div class="scheme-meta" style="justify-content:space-between; align-items:center;">
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <span class="scheme-badge">${s.authority}</span>
                ${s.reqBocw ? `<span class="scheme-badge scheme-badge--req">BOCW Card Required</span>` : ''}
                ${s.reqEshram ? `<span class="scheme-badge scheme-badge--req">e-Shram Required</span>` : ''}
              </div>
              <button class="scheme-ask-btn btn-ghost" data-scheme-idx="${idx}" style="padding:3px 8px; font-size:0.72rem;">🤖 How to Apply</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.scheme-ask-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.schemeIdx, 10);
        const scheme = schemes[idx];
        if (scheme) {
          this.close();
          const q = isHi
            ? `मुझे '${scheme.nameHi || scheme.nameEn}' योजना में आवेदन करने की पूरी प्रक्रिया, आवश्यक दस्तावेज और निकटतम आवेदन केंद्र बताएं।`
            : `Explain step-by-step how to apply for '${scheme.nameEn || scheme.nameHi}', required documents, and nearest office.`;
          D.chatInput.value = q;
          autoResize();
          sendMsg(q);
        }
      });
    });
  }
};

// ══════════════════════════════════════════════════════════════════
// VOICE ASSISTANT (STT & TTS)
// ══════════════════════════════════════════════════════════════════
const VoiceAssistant = {
  synth: window.speechSynthesis,
  recognition: null,
  isSpeaking: false,
  isRecording: false,

  init() {
    // 1. Web Speech Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isRecording = true;
        D.micBtn?.classList.add('recording');
        if (D.voiceOverlay) D.voiceOverlay.style.display = 'flex';
        if (D.voiceTitle) D.voiceTitle.textContent = state.language === 'en' ? '🎙️ Listening...' : '🎙️ सुन रहे हैं... (हिंदी/English)';
        if (D.voiceTranscript) D.voiceTranscript.textContent = state.language === 'en' ? 'Speak your question...' : 'बोलिए... अपना सवाल पूछें।';
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (D.voiceTranscript) D.voiceTranscript.textContent = transcript;
        if (D.chatInput) {
          D.chatInput.value = transcript;
          autoResize();
          D.sendBtn.disabled = false;
        }
      };

      this.recognition.onerror = (event) => {
        toast(`🎙️ Voice input notice: ${event.error}`);
        this.stopRecording();
      };

      this.recognition.onend = () => {
        this.stopRecording();
      };
    }

    // Attach listeners
    D.micBtn?.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    D.voiceCancelBtn?.addEventListener('click', () => {
      this.stopRecording();
    });
  },

  startRecording() {
    if (!this.recognition) {
      toast('⚠️ Voice input requires Chrome or Edge browser.');
      return;
    }
    try {
      this.recognition.lang = state.language === 'en' ? 'en-IN' : 'hi-IN';
      this.recognition.start();
    } catch (e) {
      this.stopRecording();
    }
  },

  stopRecording() {
    this.isRecording = false;
    D.micBtn?.classList.remove('recording');
    if (D.voiceOverlay) D.voiceOverlay.style.display = 'none';
    if (this.recognition) {
      try { this.recognition.stop(); } catch { }
    }
  },

  speak(text, btnElement) {
    if (!this.synth) {
      toast('⚠️ Speech audio read-aloud not supported in this browser.');
      return;
    }

    if (this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      document.querySelectorAll('.btn-tts').forEach(b => {
        b.textContent = '🔊 Listen';
        b.classList.remove('playing');
      });
      return;
    }

    const cleanText = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/###/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = state.language === 'en' ? 'en-IN' : 'hi-IN';
    utterance.rate = 0.95;

    const voices = this.synth.getVoices();
    const targetLang = state.language === 'en' ? 'en' : 'hi';
    const voice = voices.find(v => v.lang.startsWith(targetLang) || v.lang.includes(targetLang.toUpperCase()));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (btnElement) {
        btnElement.textContent = '⏹️ Stop';
        btnElement.classList.add('playing');
      }
    };

    utterance.onend = utterance.onerror = () => {
      this.isSpeaking = false;
      if (btnElement) {
        btnElement.textContent = '🔊 Listen';
        btnElement.classList.remove('playing');
      }
    };

    this.synth.speak(utterance);
  }
};

// ══════════════════════════════════════════════════════════════════
// GROUNDED CITATION VIEWER
// ══════════════════════════════════════════════════════════════════
const CitationViewer = {
  init() {
    const modal = document.getElementById('citation-modal');
    const backdrop = document.getElementById('citation-modal-backdrop');
    const closeBtn = document.getElementById('citation-modal-close');

    const close = () => {
      if (modal) modal.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
    };

    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
  },

  open(citationText) {
    const modal = document.getElementById('citation-modal');
    const backdrop = document.getElementById('citation-modal-backdrop');
    const titleEl = document.getElementById('citation-modal-title');
    const statuteEl = document.getElementById('citation-modal-statute');
    const contentEl = document.getElementById('citation-modal-content');
    const dateEl = document.getElementById('citation-modal-date');
    const catEl = document.getElementById('citation-modal-category');

    if (!modal) return;

    if (titleEl) titleEl.textContent = `📖 ${citationText}`;
    if (statuteEl) statuteEl.textContent = `Statutory Record: ${citationText}`;
    if (contentEl) {
      contentEl.textContent = `अधिनियम / अधिसूचना: ${citationText}\n\nयह कानूनी संदर्भ दिल्ली सरकार के श्रम विभाग (Department of Labour, Govt. of NCT of Delhi) द्वारा जारी आधिकारिक न्यूनतम वेतन अधिसूचना (No. F.1(14)/MW/2024), न्यूनतम वेतन अधिनियम 1948 (धारा 20) एवं अंतर-राज्यीय प्रवासी कर्मकार अधिनियम 1979 पर आधारित है।\n\nश्रमिक अधिकार:\n1. निर्धारित न्यूनतम वेतन से कम भुगतान गैर-कानूनी है।\n2. 8 घंटे से अधिक कार्य पर 2x दर से ओवरटाइम भुगतान अनिवार्य है।\n3. शिकायत निवारण हेतु जिला श्रम आयुक्त कार्यालय से संपर्क करें।`;
    }
    if (dateEl) dateEl.textContent = 'Effective: Oct 2024 Notification';
    if (catEl) catEl.textContent = 'Category: Delhi Labour Gazette';

    if (modal) modal.style.display = 'flex';
    if (backdrop) backdrop.style.display = 'block';
  }
};

// ══════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════
async function boot() {
  resolveDOM();
  setupInput();
  initParticles();

  // Voice & Tools Setup
  VoiceAssistant.init();
  CitationViewer.init();
  WageCalculator.init();
  LegalNoticeManager.init();
  SchemeWizard.init();
  setupHelplinesAndDistrictChips();

  // Register PWA Service Worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
  }

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

// ══════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ══════════════════════════════════════════════════════════════════
function initSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  // Skip splash if already shown this session
  if (sessionStorage.getItem('shrayak-splash-shown')) {
    splash.classList.add('hidden');
    return;
  }

  // Auto-dismiss after 2.2s
  setTimeout(() => {
    splash.classList.add('hiding');
    setTimeout(() => {
      splash.classList.add('hidden');
      sessionStorage.setItem('shrayak-splash-shown', '1');
    }, 620);
  }, 2200);

  // Allow click-to-dismiss
  splash.addEventListener('click', () => {
    splash.classList.add('hiding');
    setTimeout(() => {
      splash.classList.add('hidden');
      sessionStorage.setItem('shrayak-splash-shown', '1');
    }, 620);
  });
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR SECTION COLLAPSIBILITY
// ══════════════════════════════════════════════════════════════════
function toggleSbSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const isCollapsed = section.classList.contains('collapsed');
  const chevron = section.querySelector('.sb-section-chevron');
  const label = section.querySelector('.sb-section-label');

  if (isCollapsed) {
    section.classList.remove('collapsed');
    if (label) label.setAttribute('aria-expanded', 'true');
    if (chevron) chevron.style.transform = '';
  } else {
    section.classList.add('collapsed');
    if (label) label.setAttribute('aria-expanded', 'false');
    if (chevron) chevron.style.transform = 'rotate(-90deg)';
  }

  // Persist to localStorage
  try {
    const collapsed = JSON.parse(localStorage.getItem('shrayak-sb-collapsed') || '{}');
    collapsed[sectionId] = !isCollapsed;
    localStorage.setItem('shrayak-sb-collapsed', JSON.stringify(collapsed));
  } catch (_) {}
}

function restoreSbSectionStates() {
  try {
    const collapsed = JSON.parse(localStorage.getItem('shrayak-sb-collapsed') || '{}');
    Object.entries(collapsed).forEach(([id, isCollapsed]) => {
      if (isCollapsed) {
        const section = document.getElementById(id);
        if (section) {
          section.classList.add('collapsed');
          const label = section.querySelector('.sb-section-label');
          if (label) label.setAttribute('aria-expanded', 'false');
        }
      }
    });
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════════════
// SESSION HISTORY PERSISTENCE
// ══════════════════════════════════════════════════════════════════
const SESSION_KEY = 'shrayak-session-history';

function saveSessionHistory() {
  if (!D.messages) return;
  try {
    const msgs = [];
    D.messages.querySelectorAll('.msg').forEach(m => {
      const isUser = m.classList.contains('msg--user');
      const bubble = m.querySelector('.msg-bubble');
      if (!bubble) return;
      const content = m.querySelector('.msg-content');
      const text = content ? content.innerText : bubble.innerText;
      const time = m.querySelector('.msg-time')?.innerText ?? '';
      msgs.push({ isUser, text: text.trim(), time });
    });
    if (msgs.length) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        personaId: state.persona?.id,
        msgs,
        savedAt: Date.now(),
      }));
    }
  } catch (_) {}
}

// Auto-save on any new message
function hookSessionSave() {
  if (!D.messages) return;
  const observer = new MutationObserver(() => saveSessionHistory());
  observer.observe(D.messages, { childList: true, subtree: false });
}

// ══════════════════════════════════════════════════════════════════
// AQI SIDEBAR WIDGET
// ══════════════════════════════════════════════════════════════════
const AQIWidget = {
  // Delhi AQI categories
  getCategory(aqi) {
    if (aqi <= 50)  return { label: 'Good',          color: '#10b981', grap: 'No GRAP',      ban: false };
    if (aqi <= 100) return { label: 'Satisfactory',  color: '#84cc16', grap: 'No GRAP',      ban: false };
    if (aqi <= 200) return { label: 'Moderate',      color: '#f59e0b', grap: 'GRAP-I',       ban: false };
    if (aqi <= 300) return { label: 'Poor',          color: '#f97316', grap: 'GRAP-II',      ban: false };
    if (aqi <= 400) return { label: 'Very Poor',     color: '#ef4444', grap: 'GRAP-III',     ban: true  };
    return               { label: '\u2620\ufe0f Severe',         color: '#7c2d12', grap: 'GRAP-IV',      ban: true  };
  },

  async fetch() {
    // Use WAQI (World Air Quality Index) public API for Delhi
    // Fallback: generate a realistic seasonal value
    try {
      const r = await fetch('https://api.waqi.info/feed/delhi/?token=demo', { signal: AbortSignal.timeout(4000) });
      const j = await r.json();
      if (j.status === 'ok' && j.data?.aqi) {
        return { aqi: j.data.aqi, source: 'WAQI', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
      }
    } catch (_) {}

    // Fallback: realistic Delhi AQI based on time of year
    const month = new Date().getMonth(); // 0-indexed
    // Winter (Oct-Feb) has higher AQI in Delhi
    const seasonal = [230, 280, 310, 280, 190, 100, 80, 70, 90, 180, 250, 260][month];
    const jitter = Math.floor(Math.random() * 60) - 30;
    return { aqi: Math.max(50, seasonal + jitter), source: 'Est.', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
  },

  render(data) {
    const { aqi, source, time } = data;
    const cat = this.getCategory(aqi);

    // Ring gauge: circumference = 2*pi*30 ≈ 188.5
    const pct = Math.min(aqi / 500, 1);
    const dashOffset = 188 - (188 * pct);

    const fill = document.getElementById('aqi-gauge-fill');
    const numEl = document.getElementById('aqi-number');
    const labelEl = document.getElementById('aqi-label');
    const stageEl = document.getElementById('aqi-stage');
    const updEl = document.getElementById('aqi-updated');
    const advisoryEl = document.getElementById('aqi-advisory');
    const widget = document.getElementById('aqi-widget');

    if (fill) {
      fill.style.stroke = cat.color;
      // Animate the dashoffset
      requestAnimationFrame(() => { fill.style.strokeDashoffset = dashOffset; });
    }
    if (numEl) numEl.textContent = aqi;
    if (numEl) numEl.style.color = cat.color;
    if (labelEl) labelEl.textContent = `${cat.label} Air Quality`;
    if (stageEl) {
      stageEl.textContent = `\ud83d\udea8 ${cat.grap} Active`;
      stageEl.style.background = `${cat.color}18`;
      stageEl.style.borderColor = `${cat.color}40`;
      stageEl.style.color = cat.color;
    }
    if (updEl) updEl.textContent = `Source: ${source} \u00b7 ${time}`;

    if (advisoryEl) {
      if (cat.ban) {
        advisoryEl.innerHTML = `🚧 <strong>Construction Ban Active</strong> \u2014 ${cat.grap} restrictions in effect. Outdoor construction &amp; demolition work is prohibited. Workers may claim idle wages.`;
        advisoryEl.style.color = cat.color;
        advisoryEl.style.background = `${cat.color}12`;
      } else {
        advisoryEl.innerHTML = `\u2705 Construction work permitted. AQI ${aqi} \u2014 ${cat.label}. Standard PPE recommended for outdoor workers.`;
        advisoryEl.style.color = '';
        advisoryEl.style.background = '';
      }
    }

    if (widget) widget.classList.toggle('aqi-danger', cat.ban);

    // Update state for persona-aware chat context
    state.aqiData = { aqi, category: cat.label, grap: cat.grap, ban: cat.ban };
  },

  async init() {
    const data = await this.fetch();
    this.render(data);

    // Auto-refresh every 5 minutes
    setInterval(async () => {
      const refreshed = await this.fetch();
      this.render(refreshed);
    }, 5 * 60 * 1000);
  },
};
