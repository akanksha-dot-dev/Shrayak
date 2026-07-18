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
};

// ══════════════════════════════════════════════════════════════════
// DOM — resolved after DOMContentLoaded
// ══════════════════════════════════════════════════════════════════
let D = {};

function resolveDOM() {
  const g = id => document.getElementById(id);
  D = {
    // GRAP banner
    grapBanner:   g('grap-banner'),
    grapEmoji:    g('grap-emoji'),
    grapTitle:    g('grap-title'),
    grapMsg:      g('grap-message'),
    grapDismiss:  g('grap-dismiss'),
    // Sidebar persona
    personaCards: g('persona-cards'),
    // AQI
    aqiPillDot:   g('aqi-dot'),
    aqiPillNum:   g('aqi-value'),
    aqiPillStage: g('aqi-grap'),
    gaugeNum:     g('gauge-number'),
    ringFill:     g('aqi-ring-fill'),
    grapStage:    g('grap-stage-label'),
    aqiSource:    g('aqi-source'),
    constrStatus: g('construction-status'),
    aqiAdvisory:  g('aqi-advisory-text'),
    aqiAdvBox:    g('aqi-advisory-box'),
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

    // Card states
    document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(`pc-${id}`);
    if (el) el.classList.add('active');

    // Chat bar
    D.chatAvatar.textContent = p.avatar;
    D.chatAvatar.style.borderColor = p.color;
    D.chatName.textContent = `${p.name} — ${p.occupation}`;
    D.chatSub.textContent  = `${p.originHindi} | ${p.occupationHindi}`;

    // Starter questions
    this.renderStarters(p);

    // Welcome message
    addBotMsg(p.welcomeMessage, [], null, true);

    // AQI advisory
    if (p.aqiSensitive && state.aqiData) {
      AQI.showGRAPBanner(state.aqiData, p);
    } else {
      hideGRAP();
    }

    // Close mobile sidebar
    D.sidebar.classList.remove('open');
    D.sbOverlay.classList.remove('show');

    toast(`${p.avatar} ${p.name} selected`);
  },

  renderStarters(p) {
    D.starters.innerHTML = '';
    (p.starterQuestions ?? []).forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'starter-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => { D.chatInput.value = q; sendMsg(q); });
      D.starters.appendChild(btn);
    });
  },
};

// ══════════════════════════════════════════════════════════════════
// AQI MANAGER
// ══════════════════════════════════════════════════════════════════
const AQI = {
  async init() {
    await this.fetch();
    setInterval(() => this.fetch(), 10 * 60 * 1000);
  },

  async fetch() {
    try {
      const r = await fetch(`${API}/api/aqi`);
      const d = await r.json();
      state.aqiData = d;
      this.render(d);
    } catch { /* keep last state */ }
  },

  render(d) {
    if (!d) return;
    const aqi   = d.aqi   ?? 0;
    const color = d.color ?? '#10b981';
    const grap  = d.grapLabel ?? 'Good';
    const emoji = d.emoji ?? '🟢';

    // Topbar pill
    D.aqiPillDot.style.background  = color;
    D.aqiPillDot.style.boxShadow   = `0 0 8px ${color}80`;
    D.aqiPillNum.textContent        = aqi > 0 ? aqi : '--';
    D.aqiPillNum.style.color        = color;
    D.aqiPillStage.textContent      = `${emoji} ${grap}`;

    // Sidebar ring gauge (SVG)
    // circumference of r=50: 2π×50 ≈ 314.16
    const CIRC = 314;
    const pct    = Math.min(aqi / 500, 1);
    const offset = CIRC * (1 - pct);
    D.ringFill.setAttribute('stroke-dashoffset', String(offset));
    D.ringFill.setAttribute('stroke', color);
    D.gaugeNum.textContent = aqi > 0 ? aqi : '--';
    D.gaugeNum.style.color = color;

    // Details
    D.grapStage.textContent  = `Stage ${d.grapStage ?? 0} — ${grap}`;
    D.grapStage.style.color  = color;
    D.aqiSource.textContent  = d.live ? `🔴 LIVE · ${d.station ?? 'ITO'}` : `⚪ ${d.source ?? 'Simulated'}`;
    D.constrStatus.textContent = d.constructionStop ? '🚫 HALTED (GRAP)' : '✅ Permitted';
    D.constrStatus.style.color = d.constructionStop ? 'var(--red)' : 'var(--green)';

    // Advisory
    D.aqiAdvisory.textContent   = d.advisoryHi ?? d.advisoryEn ?? 'Advisory unavailable.';
    D.aqiAdvBox.style.borderTopColor = color + '30';

    // GRAP banner
    if (state.persona?.aqiSensitive) this.showGRAPBanner(d, state.persona);
  },

  showGRAPBanner(d, persona) {
    if (!d || !persona?.aqiSensitive || !d.constructionStop || d.grapStage < 2) {
      hideGRAP(); return;
    }
    D.grapEmoji.textContent = d.emoji ?? '🚨';
    D.grapTitle.textContent = `GRAP ${d.grapLabel} — Delhi AQI ${d.aqi}`;
    D.grapMsg.textContent   = d.advisoryHi;
    D.grapBanner.style.background = `linear-gradient(135deg,${d.color}cc 0%,#c2002e 100%)`;
    D.grapBanner.classList.add('visible');
  },
};

function hideGRAP() {
  D.grapBanner.classList.remove('visible');
}

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
        language:   state.persona?.language ?? 'hi',
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

    // AQI context for construction persona on halt days
    let aqiCtx = null;
    if (state.persona?.aqiSensitive && state.aqiData?.constructionStop) {
      aqiCtx = state.aqiData;
    }

    addBotMsg(d.response ?? '❌ No response.', d.citations ?? [], d.nearestOffice ?? null, false, aqiCtx, ms);

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

  // AQI warning
  let aqiHtml = '';
  if (aqiCtx) {
    aqiHtml = `
      <div class="chat-aqi-warn" style="background:${aqiCtx.color}12;border-color:${aqiCtx.color}30">
        <div class="chat-aqi-warn-title" style="color:${aqiCtx.color}">
          🌫️ GRAP ${aqiCtx.grapLabel} — Delhi AQI ${aqiCtx.aqi}
        </div>
        <p>${esc(aqiCtx.advisoryHi)}</p>
      </div>
    `;
  }

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
        ${content}
        ${aqiHtml}
        ${offHtml}
        ${cites}
      </div>
      <div class="msg-time">${now()} · Shrayak AI${latBadge}</div>
    </div>
  `;
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

  // GRAP dismiss
  D.grapDismiss.addEventListener('click', hideGRAP);

  // Mobile sidebar
  D.menuBtn.addEventListener('click', () => {
    D.sidebar.classList.toggle('open');
    D.sbOverlay.classList.toggle('show');
  });

  D.sbOverlay.addEventListener('click', () => {
    D.sidebar.classList.remove('open');
    D.sbOverlay.classList.remove('show');
  });
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
      starterQuestions: ['मेरा न्यूनतम वेतन क्या है?', 'BOCW कार्ड कैसे बनाएं?', 'क्या आज काम बंद है?'],
      welcomeMessage: 'नमस्ते रमेश! मैं Shrayak हूं। आज दिल्ली AQI और आपके अधिकारों की जानकारी दूंगा।',
    },
    {
      id: 'sita', name: 'Sita Devi', nameHindi: 'सीता देवी',
      origin: 'UP', originHindi: 'कानपुर, उत्तर प्रदेश',
      occupation: 'Domestic Worker', occupationHindi: 'घरेलू कामगार',
      avatar: '👩', color: '#8b5cf6', language: 'hi',
      aqiSensitive: false, geoFocused: true,
      starterQuestions: ['घरेलू कामगार का न्यूनतम वेतन?', 'e-Shram कार्ड कैसे बनाएं?', 'छुट्टी के अधिकार क्या हैं?'],
      welcomeMessage: 'नमस्ते सीता जी! आपके घरेलू कामगार अधिकारों के लिए यहां हूं।',
    },
    {
      id: 'priya', name: 'Priya Sharma', nameHindi: 'प्रिया शर्मा',
      origin: 'Rajasthan', originHindi: 'जयपुर, राजस्थान',
      occupation: 'Garment Worker', occupationHindi: 'वस्त्र उद्योग श्रमिक',
      avatar: '👩‍💼', color: '#06b6d4', language: 'hi',
      aqiSensitive: false, geoFocused: false,
      starterQuestions: ['ओवरटाइम का पैसा कितना मिलेगा?', 'ESI शिकायत कहां करें?', 'मातृत्व अवकाश कैसे मिलेगा?'],
      welcomeMessage: 'नमस्ते प्रिया! आपके कारखाना अधिकारों के बारे में बात करते हैं।',
    },
  ];
}

// ══════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════
async function boot() {
  resolveDOM();
  setupInput();

  await Promise.allSettled([
    Personas.init(),
    AQI.init(),
    Stats.init(),
    healthCheck(),
  ]);

  setInterval(healthCheck, 60_000);
}

document.addEventListener('DOMContentLoaded', boot);
