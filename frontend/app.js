/**
 * app.js — Shrayak: Shramik Sahayak
 * Frontend Chat Application
 *
 * Features:
 *  - Chat state management (message history, loading state)
 *  - Hindi/English language toggle with live UI re-labeling
 *  - Auto-expanding textarea with character counter
 *  - Quick-question chips
 *  - Location-aware district selector → office routing
 *  - Streaming-style message rendering with typing animation
 *  - Citation display and nearest office card
 *  - Retry on network failure with user-friendly error messages
 *  - Keyboard accessibility (Enter to send, Esc to close modal)
 *
 * Security (client-side):
 *  - Max length enforced client-side before API call
 *  - No storage of user queries in localStorage (privacy-first)
 *  - XSS-safe: all dynamic content via textContent, not innerHTML (except controlled rendering)
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = '';  // Same origin
const MAX_QUERY_LENGTH = 2000;
const API_TIMEOUT_MS = 30000; // 30 seconds

// ─── UI Strings (Bilingual) ───────────────────────────────────────────────────

const UI_STRINGS = {
  hi: {
    agentSubtitle: 'दिल्ली मजदूर अधिकार सहायक',
    placeholder: 'अपना सवाल हिंदी में लिखें... / Type your question...',
    sending: 'जवाब तैयार हो रहा है...',
    errorNetwork: '⚠️ नेटवर्क त्रुटि। कृपया अपना इंटरनेट जाँचें और पुनः प्रयास करें।',
    errorServer: '⚠️ सर्वर अभी व्यस्त है। कृपया थोड़ी देर बाद पुनः प्रयास करें।\n\nसहायता: 1800-11-2345',
    errorTimeout: '⚠️ अनुरोध बहुत अधिक समय लग रहा है। कृपया पुनः प्रयास करें।',
    rateLimit: '⚠️ बहुत अधिक संदेश भेजे। कृपया 15 मिनट बाद पुनः प्रयास करें।',
    welcome: 'नमस्ते! मैं श्रायक हूँ',
    welcomeSub: 'Your Delhi Labour Rights AI Agent',
    welcomeText: 'मैं आपको दिल्ली के श्रम कानूनों, न्यूनतम वेतन, ई-श्रम पंजीकरण और नजदीकी श्रम कार्यालयों की जानकारी दे सकता हूँ।\n\nनीचे दिए गए सवाल चुनें या अपना सवाल टाइप करें।',
    chips: [
      { label: '💰 न्यूनतम वेतन', query: 'मेरा न्यूनतम वेतन कितना होना चाहिए?' },
      { label: '📋 ई-श्रम', query: 'ई-श्रम पंजीकरण कैसे करें?' },
      { label: '⚖️ मजदूर अधिकार', query: 'प्रवासी मजदूर के क्या अधिकार हैं?' },
      { label: '⏰ ओवरटाइम', query: 'ओवरटाइम के लिए कितना पैसा मिलना चाहिए?' },
      { label: '🏗️ BOCW लाभ', query: 'BOCW योजना के क्या लाभ हैं?' },
      { label: '📢 शिकायत', query: 'शिकायत कहाँ दर्ज करें?' },
    ],
    officeTitle: '🏛️ नजदीकी श्रम कार्यालय',
    footerNote: '🔒 सुरक्षित | Powered by Elastic RAG + Gemini',
    helpline: '📞 1800-11-2345',
  },
  en: {
    agentSubtitle: 'Delhi Migrant Worker Rights Agent',
    placeholder: 'Type your question in Hindi or English...',
    sending: 'Generating response...',
    errorNetwork: '⚠️ Network error. Please check your internet connection and try again.',
    errorServer: '⚠️ Server is busy. Please try again in a moment.\n\nHelpline: 1800-11-2345',
    errorTimeout: '⚠️ Request is taking too long. Please try again.',
    rateLimit: '⚠️ Too many messages sent. Please wait 15 minutes and try again.',
    welcome: 'Namaste! I am Shrayak',
    welcomeSub: 'Delhi Migrant Worker Rights Agent',
    welcomeText: 'I can help you with Delhi labour laws, minimum wages, e-Shram registration, and finding the nearest Labour Office.\n\nSelect a quick question or type your own below.',
    chips: [
      { label: '💰 Min. Wages', query: 'What is the minimum wage for unskilled workers in Delhi?' },
      { label: '📋 e-Shram', query: 'How do I register on e-Shram?' },
      { label: '⚖️ Worker Rights', query: 'What are the rights of inter-state migrant workers?' },
      { label: '⏰ Overtime', query: 'What is the overtime rate for workers in Delhi?' },
      { label: '🏗️ BOCW Benefits', query: 'What benefits does the BOCW scheme provide?' },
      { label: '📢 File Complaint', query: 'How and where do I file a labour complaint in Delhi?' },
    ],
    officeTitle: '🏛️ Nearest Labour Office',
    footerNote: '🔒 Secure | Powered by Elastic RAG + Gemini',
    helpline: '📞 1800-11-2345',
  },
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  lang: 'hi',           // Current UI language
  isLoading: false,     // Is a request in-flight?
  selectedPin: null,    // User's selected Delhi pin code
  messageCount: 0,      // For unique message IDs
};

// ─── DOM References ───────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const DOM = {
  chatWindow: $('chat-window'),
  chatForm: $('chat-form'),
  queryInput: $('query-input'),
  sendBtn: $('send-btn'),
  charCounter: $('char-counter'),
  langToggle: $('lang-toggle'),
  langLabel: $('lang-label'),
  agentSubtitle: $('agent-subtitle'),
  districtSelect: $('district-select'),
  selectedLocationLabel: $('selected-location-label'),
  statusDot: $('status-dot'),
  chipsContainer: $('chips-container'),
  // Modals
  modalOverlay: $('modal-overlay'),
  infoBtn: $('info-btn'),
  modalClose: $('modal-close'),
  officeModalOverlay: $('office-modal-overlay'),
  officeModalClose: $('office-modal-close'),
  officeModalContent: $('office-modal-content'),
  helplineLink: $('helpline-link'),
  footerText: document.querySelector('.footer-text'),
};

// ─── Utility: Safe HTML Rendering ────────────────────────────────────────────

/**
 * Converts a plain-text response (from Gemini) to safe HTML.
 * Handles: **bold**, *italic*, numbered lists, bullet points, line breaks.
 * NEVER uses innerHTML with raw user input — only with server-generated response text.
 */
function safeMarkdownToHtml(text) {
  if (!text) return '';

  return text
    // Escape any HTML that might have slipped through
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bold numbered points like "1. " at start of line
    .replace(/^(\d+\.) /gm, '<strong>$1</strong> ')
    // Checkmarks and symbols
    .replace(/✅/g, '<span role="img" aria-label="check">✅</span>')
    .replace(/❌/g, '<span role="img" aria-label="cross">❌</span>')
    // Line breaks → <br>
    .replace(/\n/g, '<br>');
}

// ─── Time Formatter ───────────────────────────────────────────────────────────

function formatTime(date) {
  return date.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Message Rendering ────────────────────────────────────────────────────────

/**
 * Appends a user message bubble to the chat window.
 */
function appendUserMessage(text) {
  state.messageCount++;
  const msgId = `msg-${state.messageCount}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper user-message';
  wrapper.setAttribute('role', 'listitem');
  wrapper.id = msgId;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  // Use textContent — safe for user-generated content
  bubble.textContent = text;

  const time = document.createElement('div');
  time.className = 'message-time';
  time.setAttribute('aria-label', `Sent at ${formatTime(new Date())}`);
  time.textContent = formatTime(new Date());

  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  DOM.chatWindow.appendChild(wrapper);

  scrollToBottom();
  return msgId;
}

/**
 * Appends the typing indicator (three animated dots).
 */
function appendTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper agent-message typing-indicator';
  wrapper.id = 'typing-indicator';
  wrapper.setAttribute('aria-label', 'Shrayak is typing');
  wrapper.setAttribute('aria-live', 'polite');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  dots.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    dots.appendChild(dot);
  }

  bubble.appendChild(dots);
  wrapper.appendChild(bubble);
  DOM.chatWindow.appendChild(wrapper);
  scrollToBottom();
}

/**
 * Removes the typing indicator from the DOM.
 */
function removeTypingIndicator() {
  const indicator = $('typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * Appends an agent response message with citations and optional office card.
 */
function appendAgentMessage(responseText, citations = [], nearestOffice = null) {
  state.messageCount++;

  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper agent-message';
  wrapper.setAttribute('role', 'listitem');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Safe rendered response text
  const responseDiv = document.createElement('div');
  responseDiv.innerHTML = safeMarkdownToHtml(responseText);
  bubble.appendChild(responseDiv);

  // Citation block
  if (citations && citations.length > 0) {
    const citationDiv = document.createElement('div');
    citationDiv.className = 'citation-block';
    citationDiv.setAttribute('role', 'note');
    citationDiv.setAttribute('aria-label', 'Legal citations');
    citationDiv.innerHTML = '📜 <strong>कानूनी आधार / Legal Basis:</strong><br>' +
      citations.map((c) => `&bull; ${c.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`).join('<br>');
    bubble.appendChild(citationDiv);
  }

  // Nearest office card
  if (nearestOffice) {
    const lang = state.lang;
    const officeCard = document.createElement('div');
    officeCard.className = 'office-card';
    officeCard.setAttribute('role', 'complementary');
    officeCard.setAttribute('aria-label', `Nearest labour office: ${nearestOffice.officeName}`);

    const title = document.createElement('div');
    title.className = 'office-card-title';
    title.textContent = UI_STRINGS[lang].officeTitle;
    officeCard.appendChild(title);

    const rows = [
      { icon: '🏛️', text: lang === 'hi' ? nearestOffice.officeNameHindi : nearestOffice.officeName },
      { icon: '📍', text: lang === 'hi' ? nearestOffice.addressHindi : nearestOffice.address },
      { icon: '📞', text: nearestOffice.phone, isPhone: true, link: `tel:${nearestOffice.phone}` },
      { icon: '🕐', text: nearestOffice.timings },
      { icon: '🚇', text: nearestOffice.nearestMetro },
    ];

    rows.forEach(({ icon, text, isPhone, link }) => {
      const row = document.createElement('div');
      row.className = 'office-card-row';
      if (isPhone && link) {
        row.innerHTML = `${icon} <a href="${link}">${text.replace(/</g, '&lt;')}</a>`;
      } else {
        row.textContent = `${icon} ${text}`;
      }
      officeCard.appendChild(row);
    });

    bubble.appendChild(officeCard);
  }

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = formatTime(new Date());

  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  DOM.chatWindow.appendChild(wrapper);
  scrollToBottom();
}

/**
 * Appends an error message as an agent bubble.
 */
function appendErrorMessage(errorText) {
  state.messageCount++;

  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper agent-message';
  wrapper.setAttribute('role', 'alert');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.style.borderColor = 'rgba(255, 107, 107, 0.3)';
  bubble.style.background = 'rgba(255, 107, 107, 0.08)';
  bubble.textContent = errorText;

  wrapper.appendChild(bubble);
  DOM.chatWindow.appendChild(wrapper);
  scrollToBottom();
}

/**
 * Renders the welcome card in the chat window.
 */
function renderWelcomeCard() {
  const lang = state.lang;
  const s = UI_STRINGS[lang];

  const card = document.createElement('div');
  card.className = 'welcome-card';
  card.id = 'welcome-card';

  card.innerHTML = `
    <span class="welcome-icon" aria-hidden="true">⚖️</span>
    <div class="welcome-title">
      ${s.welcome}
      <div class="welcome-title-en">${s.welcomeSub}</div>
    </div>
    <p class="welcome-text">${s.welcomeText.replace(/\n/g, '<br>')}</p>
  `;

  DOM.chatWindow.appendChild(card);
}

// ─── API Call ─────────────────────────────────────────────────────────────────

/**
 * Sends the user query to the backend /api/chat endpoint.
 * Returns the response or throws an error.
 *
 * @param {string} query — Sanitized query text
 * @returns {Promise<{ response, citations, nearestOffice, latencyMs }>}
 */
async function sendChatRequest(query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const body = { query, language: state.lang };
    if (state.selectedPin) body.pinCode = state.selectedPin;

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw Object.assign(new Error('Rate limited'), { code: 'RATE_LIMITED' });
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw Object.assign(new Error(errBody.error ?? `HTTP ${response.status}`), {
        code: 'SERVER_ERROR',
      });
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw Object.assign(new Error('Timeout'), { code: 'TIMEOUT' });
    }

    if (error.code === 'RATE_LIMITED' || error.code === 'SERVER_ERROR' || error.code === 'TIMEOUT') {
      throw error;
    }

    // Network error (no connectivity)
    throw Object.assign(new Error('Network error'), { code: 'NETWORK_ERROR' });
  }
}

// ─── Form Submission ──────────────────────────────────────────────────────────

async function handleSubmit(queryText) {
  const query = queryText.trim();
  if (!query || state.isLoading) return;
  if (query.length > MAX_QUERY_LENGTH) return;

  // Remove welcome card on first message
  const welcomeCard = $('welcome-card');
  if (welcomeCard) welcomeCard.remove();

  // Set loading state
  state.isLoading = true;
  DOM.sendBtn.disabled = true;
  DOM.queryInput.disabled = true;
  DOM.statusDot.className = 'status-dot thinking';
  DOM.agentSubtitle.textContent = UI_STRINGS[state.lang].sending;

  // Clear input
  DOM.queryInput.value = '';
  DOM.queryInput.style.height = 'auto';
  updateCharCounter(0);

  // Render user message
  appendUserMessage(query);

  // Show typing indicator
  appendTypingIndicator();

  try {
    const data = await sendChatRequest(query);

    removeTypingIndicator();
    appendAgentMessage(data.response, data.citations, data.nearestOffice);
  } catch (error) {
    removeTypingIndicator();

    const lang = state.lang;
    const s = UI_STRINGS[lang];
    const errorMessages = {
      RATE_LIMITED: s.rateLimit,
      SERVER_ERROR: s.errorServer,
      TIMEOUT: s.errorTimeout,
      NETWORK_ERROR: s.errorNetwork,
    };

    appendErrorMessage(errorMessages[error.code] ?? s.errorServer);
  } finally {
    state.isLoading = false;
    DOM.sendBtn.disabled = DOM.queryInput.value.trim().length === 0;
    DOM.queryInput.disabled = false;
    DOM.queryInput.focus();
    DOM.statusDot.className = 'status-dot'; // back to green
    DOM.agentSubtitle.textContent = UI_STRINGS[state.lang].agentSubtitle;
  }
}

// ─── Input Handlers ───────────────────────────────────────────────────────────

function updateCharCounter(length) {
  const counter = DOM.charCounter;
  counter.textContent = `${length}/${MAX_QUERY_LENGTH}`;
  counter.className = 'char-counter';

  if (length > MAX_QUERY_LENGTH * 0.9) counter.classList.add('at-limit');
  else if (length > MAX_QUERY_LENGTH * 0.75) counter.classList.add('near-limit');
}

function autoResizeTextarea() {
  const ta = DOM.queryInput;
  ta.style.height = 'auto';
  const newHeight = Math.min(ta.scrollHeight, 120);
  ta.style.height = `${newHeight}px`;
}

// ─── Language Toggle ──────────────────────────────────────────────────────────

function toggleLanguage() {
  state.lang = state.lang === 'hi' ? 'en' : 'hi';
  const lang = state.lang;
  const s = UI_STRINGS[lang];

  // Update toggle label
  DOM.langLabel.textContent = lang === 'hi' ? 'EN' : 'हि';
  DOM.langToggle.title = lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें';

  // Update UI text
  DOM.agentSubtitle.textContent = s.agentSubtitle;
  DOM.queryInput.placeholder = s.placeholder;
  DOM.helplineLink.textContent = s.helpline;
  if (DOM.footerText) DOM.footerText.textContent = s.footerNote;

  // Toggle body class for font switching
  document.body.classList.toggle('lang-en', lang === 'en');
  document.documentElement.lang = lang;

  // Update chips
  renderChips();

  // Update welcome card if present
  const welcomeCard = $('welcome-card');
  if (welcomeCard) {
    welcomeCard.remove();
    renderWelcomeCard();
  }
}

// ─── Chips ────────────────────────────────────────────────────────────────────

function renderChips() {
  const container = DOM.chipsContainer;
  container.innerHTML = '';

  const chips = UI_STRINGS[state.lang].chips;
  chips.forEach(({ label, query }) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = label;
    btn.setAttribute('role', 'option');
    btn.setAttribute('data-query', query);
    btn.addEventListener('click', () => {
      DOM.queryInput.value = query;
      autoResizeTextarea();
      updateCharCounter(query.length);
      DOM.sendBtn.disabled = false;
      handleSubmit(query);
    });
    container.appendChild(btn);
  });
}

// ─── District Selector ────────────────────────────────────────────────────────

function handleDistrictChange() {
  const value = DOM.districtSelect.value;
  state.selectedPin = value || null;
  DOM.selectedLocationLabel.textContent = value
    ? `📍 ${DOM.districtSelect.options[DOM.districtSelect.selectedIndex].text.split('(')[0].trim()}`
    : '';
}

// ─── Scroll ───────────────────────────────────────────────────────────────────

function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatWindow.scrollTop = DOM.chatWindow.scrollHeight;
  });
}

// ─── Modal Handlers ───────────────────────────────────────────────────────────

function openModal(overlay) {
  overlay.hidden = false;
  overlay.querySelector('.modal-close')?.focus();
  document.body.style.overflow = 'hidden';
}

function closeModal(overlay) {
  overlay.hidden = true;
  document.body.style.overflow = '';
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

function initEventListeners() {
  // Form submission
  DOM.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(DOM.queryInput.value);
  });

  // Textarea — auto-resize, char counter, send button state, Enter-to-send
  DOM.queryInput.addEventListener('input', () => {
    const len = DOM.queryInput.value.length;
    updateCharCounter(len);
    autoResizeTextarea();
    DOM.sendBtn.disabled = len === 0 || len > MAX_QUERY_LENGTH || state.isLoading;
  });

  DOM.queryInput.addEventListener('keydown', (e) => {
    // Enter without Shift = send
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit(DOM.queryInput.value);
    }
  });

  // Language toggle
  DOM.langToggle.addEventListener('click', toggleLanguage);

  // District selector
  DOM.districtSelect.addEventListener('change', handleDistrictChange);

  // Info modal
  DOM.infoBtn.addEventListener('click', () => openModal(DOM.modalOverlay));
  DOM.modalClose.addEventListener('click', () => closeModal(DOM.modalOverlay));
  DOM.modalOverlay.addEventListener('click', (e) => {
    if (e.target === DOM.modalOverlay) closeModal(DOM.modalOverlay);
  });

  // Office modal
  DOM.officeModalClose.addEventListener('click', () => closeModal(DOM.officeModalOverlay));
  DOM.officeModalOverlay.addEventListener('click', (e) => {
    if (e.target === DOM.officeModalOverlay) closeModal(DOM.officeModalOverlay);
  });

  // Global keyboard: Escape closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!DOM.modalOverlay.hidden) closeModal(DOM.modalOverlay);
      if (!DOM.officeModalOverlay.hidden) closeModal(DOM.officeModalOverlay);
    }
  });

  // Chips (initial render via renderChips())
  // Note: dynamically re-rendered on language toggle
}

// ─── Initialization ───────────────────────────────────────────────────────────

function init() {
  // Render initial chips
  renderChips();

  // Render welcome card
  renderWelcomeCard();

  // Initialize event listeners
  initEventListeners();

  // Focus input on load (only if not mobile to avoid keyboard popup)
  if (window.innerWidth > 480) {
    DOM.queryInput.focus();
  }

  // Check server health in background
  checkServerHealth();
}

async function checkServerHealth() {
  try {
    const resp = await fetch('/api/health', { method: 'GET' });
    if (!resp.ok) {
      DOM.statusDot.className = 'status-dot offline';
    }
  } catch {
    DOM.statusDot.className = 'status-dot offline';
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
