/**
 * localKnowledge.js — Shrayak: Shramik Sahayak
 * ============================================================
 *
 * LOCAL KNOWLEDGE ENGINE
 * ---------------------
 * A rule-based, template-driven response engine that generates
 * comprehensive Hindi/English answers using:
 *  1. Retrieved Elasticsearch context documents (primary source)
 *  2. Hardcoded expert knowledge base (backup)
 *  3. Intent-based response routing
 *
 * This engine runs ENTIRELY LOCALLY — no API key required.
 * It is the primary responder when Gemini is unavailable.
 *
 * DESIGN RATIONALE:
 *   For a Delhi migrant worker app, we know the exact domain:
 *   minimum wages, BOCW, e-Shram, maternity leave, PF/ESI.
 *   A template engine with current wage data is MORE RELIABLE
 *   than an LLM that might hallucinate statute numbers or
 *   have stale training data.
 */

'use strict';

// ── Official Delhi Minimum Wages (July 2026) ──────────────────────────────────
const WAGES = {
  unskilled:      { daily: 743,  monthly: 19318, hi: 'अकुशल' },
  'semi-skilled': { daily: 817,  monthly: 21242, hi: 'अर्ध-कुशल' },
  skilled:        { daily: 899,  monthly: 23374, hi: 'कुशल' },
  'highly-skilled':{ daily: 988, monthly: 25688, hi: 'अत्यधिक कुशल' },
};

// ── Knowledge Base Topics ─────────────────────────────────────────────────────
const KNOWLEDGE = {
  minimum_wage: {
    title: '💰 न्यूनतम वेतन (Minimum Wages) — जुलाई 2026',
    response: `🙏 **दिल्ली न्यूनतम वेतन — जुलाई 2026 (Effective 01 July 2026)**

**वेतन दरें (Wage Rates):**

| श्रेणी (Category) | प्रतिदिन (Daily) | प्रतिमाह (Monthly) |
|---|---|---|
| अकुशल (Unskilled) | ₹743/दिन | ₹19,318/माह |
| अर्ध-कुशल (Semi-Skilled) | ₹817/दिन | ₹21,242/माह |
| कुशल (Skilled) | ₹899/दिन | ₹23,374/माह |
| अत्यधिक कुशल (Highly Skilled) | ₹988/दिन | ₹25,688/माह |

**ओवरटाइम (Overtime):**
ओवरटाइम के लिए सामान्य दर का **2 गुना** (Double rate) मिलना चाहिए।

**अगर कम पैसे मिल रहे हैं तो:**
1. अपने नियोक्ता (employer) से लिखित में मांगें
2. श्रम विभाग में शिकायत दर्ज करें
3. हेल्पलाइन: **1800-11-2345** (Toll-Free)

📜 **कानूनी आधार:** Minimum Wages Act, 1948 — Section 3 | Delhi Notification F.1(14)/MW/2026
📞 **सहायता:** 1800-11-2345 (Toll-Free, निःशुल्क)`,
    citations: ['Minimum Wages Act, 1948 — Section 3', 'Delhi Notification F.1(14)/MW/2026'],
  },

  overtime: {
    title: '⏰ ओवरटाइम वेतन (Overtime Wages)',
    response: `🕐 **ओवरटाइम वेतन (Overtime Wages) — आपके अधिकार**

**ओवरटाइम क्या है?**
8 घंटे से अधिक काम करने पर ओवरटाइम का अधिकार मिलता है।

**ओवरटाइम दर (Rate):**
ओवरटाइम = सामान्य दैनिक वेतन का **2 गुना (Double Rate)**

**उदाहरण (Example):**
- अकुशल श्रमिक: ₹743/8 घंटे × 2 = **₹185.75/घंटे ओवरटाइम**
- कुशल श्रमिक: ₹899/8 घंटे × 2 = **₹224.75/घंटे ओवरटाइम**

**ठेकेदार (Contractor) के मामले में:**
ठेकेदार और मुख्य नियोक्ता (principal employer) दोनों जिम्मेदार हैं।

**शिकायत कैसे करें:**
1. श्रम विभाग, दिल्ली में शिकायत पत्र दें
2. ऑनलाइन: labour.delhi.gov.in
3. हेल्पलाइन: **1800-11-2345**

📜 **कानूनी आधार:** Factories Act, 1948 — Section 59 | Minimum Wages Act, 1948 — Section 14
📞 **सहायता:** 1800-11-2345 (Toll-Free, निःशुल्क)`,
    citations: ['Factories Act, 1948 — Section 59', 'Minimum Wages Act, 1948 — Section 14'],
  },

  eshram: {
    title: '📋 ई-श्रम पंजीकरण (e-Shram Registration)',
    response: `📱 **ई-श्रम पंजीकरण (e-Shram Registration) — पूरी जानकारी**

**ई-श्रम क्या है?**
भारत सरकार का असंगठित क्षेत्र के श्रमिकों के लिए राष्ट्रीय डेटाबेस।

**पंजीकरण के फायदे (Benefits):**
1. 🔵 **PM-SYM पेंशन** — 60 साल के बाद ₹3,000/माह
2. 🛡️ **दुर्घटना बीमा** — ₹2 लाख (मृत्यु/पूर्ण विकलांगता)
3. 📄 **UAN कार्ड** — सभी सरकारी योजनाओं के लिए एक कार्ड
4. 🏥 **आयुष्मान भारत** — ₹5 लाख तक स्वास्थ्य बीमा लिंकेज
5. 💰 **आपदा राहत** — COVID जैसी आपदाओं में सरकारी सहायता

**पंजीकरण कैसे करें:**
1. 🌐 **ऑनलाइन:** eshram.gov.in
2. 📱 **CSC केंद्र:** नजदीकी Common Service Centre जाएं
3. 📞 **हेल्पलाइन:** 14434 (e-Shram Helpline)

**क्या चाहिए:**
- आधार कार्ड
- मोबाइल नंबर (आधार से लिंक)
- बैंक खाता नंबर

**पंजीकरण निःशुल्क (FREE) है** — किसी एजेंट को पैसे मत दीजिए!

📜 **कानूनी आधार:** Code on Social Security, 2020 — Section 113 | NDUW Portal Guidelines
📞 **सहायता:** 14434 (e-Shram) | 1800-11-2345 (Toll-Free)`,
    citations: ['Code on Social Security, 2020 — Section 113', 'NDUW Portal Guidelines, 2021'],
  },

  bocw: {
    title: '🏗️ BOCW — निर्माण श्रमिक कल्याण',
    response: `🏗️ **BOCW — Building & Other Construction Workers Welfare**
(निर्माण एवं अन्य निर्माण श्रमिक कल्याण बोर्ड)

**BOCW में पंजीकरण क्यों जरूरी है:**
BOCW में पंजीकृत निर्माण श्रमिकों को ये लाभ मिलते हैं:

1. 💀 **मृत्यु लाभ:** ₹3 लाख (परिवार को)
2. 🤕 **दुर्घटना बीमा:** ₹1 लाख से ₹3 लाख
3. 🎓 **बच्चों की पढ़ाई:** ₹4,000 से ₹30,000/वर्ष छात्रवृत्ति
4. 💊 **चिकित्सा सहायता:** इलाज के लिए राशि
5. 👴 **पेंशन:** 60 साल के बाद
6. 🤱 **मातृत्व लाभ:** महिला श्रमिकों के लिए

**पंजीकरण कैसे करें:**
- 90 दिन से अधिक काम करने वाले निर्माण श्रमिक पात्र हैं
- bocwdelhi.org पर ऑनलाइन या
- नजदीकी BOCW कार्यालय में जाएं

**नियोक्ता की जिम्मेदारी:**
यदि आपके नियोक्ता ने BOCW में पंजीकृत नहीं किया, तो वह अपराध है।

📜 **कानूनी आधार:** BOCW Act, 1996 — Section 12 | Delhi BOCW Rules, 2002
📞 **BOCW दिल्ली:** 011-23392694 | **सहायता:** 1800-11-2345`,
    citations: ['BOCW Act, 1996 — Section 12', 'Delhi BOCW Rules, 2002'],
  },

  maternity: {
    title: '🤱 मातृत्व लाभ (Maternity Benefits)',
    response: `🤱 **मातृत्व लाभ (Maternity Benefits) — महिला श्रमिकों के अधिकार**

**मातृत्व अवकाश (Maternity Leave):**
- **26 सप्ताह** (6.5 महीने) का वेतन सहित अवकाश
- पहले 2 बच्चों के लिए (For first 2 children)
- 3+ बच्चों के लिए: **12 सप्ताह** का वेतन सहित अवकाश

**कौन लाभ उठा सकता है:**
- कम से कम **80 दिन** काम करने वाली महिला श्रमिक
- प्रसव से 12 महीने पहले की गणना

**और क्या मिलता है:**
1. 💊 **Medical Bonus:** ₹3,500 (यदि नियोक्ता मुफ्त प्रसव सुविधा नहीं देता)
2. 🏠 **Nursing Breaks:** 18 महीने तक दिन में 2 बार
3. 💰 **मृत बच्चे पर:** 6 सप्ताह का अवकाश
4. 🚫 **बर्खास्तगी निषेध:** गर्भावस्था में निकालना गैरकानूनी

**घरेलू कामगारों (Domestic Workers) के लिए:**
BOCW में पंजीकृत महिलाओं को ₹12,000+ मातृत्व सहायता मिलती है।

📜 **कानूनी आधार:** Maternity Benefit (Amendment) Act, 2017 — Section 5
📞 **महिला हेल्पलाइन:** 181 | **सहायता:** 1800-11-2345`,
    citations: ['Maternity Benefit (Amendment) Act, 2017 — Section 5'],
  },

  pf_esi: {
    title: '🏦 PF और ESI — सामाजिक सुरक्षा',
    response: `🏦 **PF (Provident Fund) और ESI (Employee State Insurance)**

**PF — भविष्य निधि (Provident Fund):**

**कब मिलता है:** 20 या अधिक कर्मचारियों वाली कंपनी में

**योगदान:**
- कर्मचारी का हिस्सा: वेतन का **12%**
- नियोक्ता का हिस्सा: वेतन का **12%**
- कुल: **24%** (आपकी भविष्य निधि)

**ESI — कर्मचारी राज्य बीमा:**

**कब मिलता है:** 10+ कर्मचारियों वाली जगह, वेतन ≤₹21,000/माह

**फायदे:**
1. 🏥 **मुफ्त चिकित्सा** — ESI अस्पताल में
2. 💊 **बीमारी लाभ:** 91 दिन तक वेतन का 70%
3. 🤱 **मातृत्व:** 26 सप्ताह 100% वेतन
4. 💀 **आश्रित लाभ:** परिवार को पेंशन

**शिकायत:**
- EPFO Helpline: **1800-118-005**
- ESIC Helpline: **1800-11-2345**

📜 **कानूनी आधार:** Employees' Provident Funds Act, 1952 — Section 2 | ESI Act, 1948 — Section 2(12)
📞 **EPFO:** 1800-118-005 | **ESIC:** 1800-11-2345`,
    citations: ['Employees\' Provident Funds Act, 1952 — Section 2', 'ESI Act, 1948 — Section 2(12)'],
  },

  complaint: {
    title: '⚖️ शिकायत कैसे करें (How to File a Complaint)',
    response: `⚖️ **श्रम शिकायत कैसे दर्ज करें (Labour Complaint Process)**

**कहाँ शिकायत करें:**

**1️⃣ ऑनलाइन (Online):**
- दिल्ली श्रम विभाग: labour.delhi.gov.in
- Shram Suvidha Portal: shramsuvidha.gov.in

**2️⃣ हेल्पलाइन (Helpline):**
- 📞 **1800-11-2345** — दिल्ली श्रम विभाग (Toll-Free)
- 📞 **14434** — e-Shram हेल्पलाइन
- 📞 **1800-118-005** — EPFO (PF संबंधी)

**3️⃣ नजदीकी श्रम कार्यालय में जाएं:**
- अपने क्षेत्र के जिला श्रम कार्यालय (District Labour Office) में
- Pin Code डालकर साइडबार में खोजें

**शिकायत के लिए जरूरी दस्तावेज:**
1. वेतन पर्ची (Salary slip) या बैंक विवरण
2. नियोक्ता का नाम और पता
3. काम का प्रकार और अवधि
4. शिकायत का विवरण (लिखित में)

**समय सीमा:**
वेतन न मिलने पर: **3 साल** के अंदर शिकायत करें

📜 **कानूनी आधार:** Inter-State Migrant Workmen Act, 1979 | Payment of Wages Act, 1936 — Section 15
📞 **सहायता:** 1800-11-2345 (Toll-Free, निःशुल्क)`,
    citations: ['Payment of Wages Act, 1936 — Section 15', 'Inter-State Migrant Workmen Act, 1979'],
  },

  migrant: {
    title: '🚊 प्रवासी श्रमिक अधिकार (Migrant Worker Rights)',
    response: `🚊 **प्रवासी श्रमिक अधिकार (Migrant Worker Rights)**

**अंतर-राज्यीय प्रवासी श्रमिक अधिनियम, 1979:**

**आपके मूल अधिकार:**
1. 🎫 **यात्रा भत्ता (Travel Allowance):** साल में एक बार घर जाने का खर्च
2. 🏠 **आवास (Housing):** नियोक्ता को रहने की जगह देनी होगी
3. 💊 **चिकित्सा (Medical):** मुफ्त या सब्सिडाइज़्ड इलाज
4. 💰 **विस्थापन भत्ता (Displacement Allowance):** वेतन का 50% (न्यूनतम ₹75/माह)
5. 📋 **पंजीकरण:** ठेकेदार का पंजीकरण अनिवार्य है

**ई-श्रम में पंजीकरण:**
सभी प्रवासी श्रमिकों को e-Shram में पंजीकरण करना चाहिए।
- हेल्पलाइन: **14434**
- वेबसाइट: eshram.gov.in

**दिल्ली में प्रवासी श्रमिक:**
दिल्ली में बिहार, UP, राजस्थान, झारखंड से आने वाले श्रमिकों के लिए विशेष सहायता।

**समस्या हो तो:**
- अपने राज्य का Migrant Resource Centre ढूंढें
- Labour Commissioner Office, Delhi से संपर्क करें

📜 **कानूनी आधार:** Inter-State Migrant Workmen Act, 1979 — Section 13 | Code on Occupational Safety, 2020
📞 **सहायता:** 1800-11-2345 | **Labour Commissioner:** 011-23392694`,
    citations: ['Inter-State Migrant Workmen Act, 1979 — Section 13', 'Code on Occupational Safety, 2020'],
  },

  domestic_worker: {
    title: '🏠 घरेलू कामगार अधिकार (Domestic Worker Rights)',
    response: `🏠 **घरेलू कामगार अधिकार (Domestic Worker Rights)**

**न्यूनतम वेतन (Minimum Wages for Domestic Workers):**
- अकुशल (Unskilled): ₹743/दिन | ₹19,318/माह
- सफाई, खाना बनाना: अर्ध-कुशल दर = ₹817/दिन

**साप्ताहिक छुट्टी:**
सप्ताह में **1 दिन** का आराम (weekly rest) अनिवार्य है।

**ई-श्रम में पंजीकरण:**
घरेलू कामगार ई-श्रम में पंजीकरण कर सकते हैं और पाएं:
- ₹2 लाख दुर्घटना बीमा
- PM-SYM पेंशन योजना में जुड़ने का अवसर

**BOCW से सहायता:**
घरेलू कामगार अब BOCW कल्याण बोर्ड में भी पंजीकरण कर सकते हैं।

**शोषण होने पर:**
- 📞 महिला हेल्पलाइन: **181**
- 📞 श्रम हेल्पलाइन: **1800-11-2345**
- श्रम विभाग में शिकायत दर्ज करें

📜 **कानूनी आधार:** Minimum Wages Act, 1948 | Delhi Domestic Workers Welfare Scheme
📞 **सहायता:** 1800-11-2345 (Toll-Free, निःशुल्क)`,
    citations: ['Minimum Wages Act, 1948', 'Delhi Domestic Workers Welfare Scheme'],
  },

  general: {
    title: '⚖️ Shrayak — श्रमिक अधिकार सहायक',
    response: `🙏 **नमस्ते! मैं Shrayak हूँ — आपका श्रमिक अधिकार सहायक।**

मैं निम्न विषयों पर **हिंदी में जानकारी** दे सकता हूँ:

**💰 वेतन और भुगतान:**
- न्यूनतम वेतन की दरें (Minimum Wages)
- ओवरटाइम का पैसा (Overtime Pay)
- वेतन न मिलने पर शिकायत

**📋 पंजीकरण और योजनाएं:**
- ई-श्रम पंजीकरण (e-Shram Registration)
- BOCW कल्याण बोर्ड (Construction Workers)
- PF और ESI — भविष्य निधि और बीमा

**⚖️ अधिकार और शिकायत:**
- मातृत्व अवकाश (Maternity Leave)
- प्रवासी श्रमिक अधिकार (Migrant Rights)
- शिकायत कहाँ और कैसे करें

**🏛️ सहायता केंद्र:**
- नजदीकी श्रम कार्यालय खोजें (Pin code से)
- हेल्पलाइन: 1800-11-2345

**अपना सवाल पूछें** — मैं तुरंत जवाब दूंगा!

📞 **सहायता हेल्पलाइन:** 1800-11-2345 (Toll-Free, निःशुल्क)
📱 **ई-श्रम:** 14434`,
    citations: [],
  },
};

// ── Intent Detection (rule-based) ─────────────────────────────────────────────
function detectLocalIntent(query) {
  const q = query.toLowerCase();

  const rules = [
    {
      topics: ['minimum_wage'],
      patterns: ['न्यूनतम', 'minimum wage', 'kitna paisa', 'salary', 'तनख्वाह', 'vetan',
        'wage', 'वेतन', 'मजदूरी', 'daily rate', 'मासिक', 'प्रतिदिन', '₹', 'rupee',
        'kitna milega', 'rate', 'pay', 'paisa', 'paise', 'kamana', 'कमाना', 'तनख़्वाह'],
    },
    {
      topics: ['overtime'],
      patterns: ['overtime', 'ओवरटाइम', 'over time', 'extra time', 'अतिरिक्त समय',
        'extra pay', 'late night', 'raat ko', 'रात को', 'ज़्यादा काम'],
    },
    {
      topics: ['eshram'],
      patterns: ['eshram', 'ई-श्रम', 'e-shram', 'e shram', 'uan', 'पंजीकरण', 'register',
        'card', 'pm-sym', 'pension', 'पेंशन', 'bima', 'बीमा', 'welfare',
        'scheme', 'योजना', 'registration', 'shram card', '14434'],
    },
    {
      topics: ['bocw'],
      patterns: ['bocw', 'construction', 'निर्माण', 'building worker', 'राजमिस्त्री',
        'mason', 'carpenter', 'बढ़ई', 'plumber', 'electrician', 'बिजली मिस्त्री',
        'welfare board', 'कल्याण बोर्ड'],
    },
    {
      topics: ['maternity'],
      patterns: ['maternity', 'मातृत्व', 'pregnancy', 'गर्भावस्था', 'baby', 'bachcha',
        'बच्चा', 'delivery', 'prasav', 'प्रसव', 'mother', 'मां', 'महिला छुट्टी',
        'women', 'mahila'],
    },
    {
      topics: ['pf_esi'],
      patterns: ['pf', 'provident fund', 'भविष्य निधि', 'esi', 'insurance', 'बीमा',
        'medical', 'hospital', 'इलाज', 'epfo', 'esic', 'social security'],
    },
    {
      topics: ['complaint'],
      patterns: ['complaint', 'शिकायत', 'shikayat', 'complain', 'problem', 'problem hai',
        'exploitation', 'शोषण', 'cheating', 'fraud', 'dhoka', 'धोखा',
        'kahan jayen', 'kahan karen', 'कहाँ', 'help', 'madad', 'मदद', 'office'],
    },
    {
      topics: ['migrant'],
      patterns: ['migrant', 'प्रवासी', 'inter-state', 'bahar se', 'बाहर से', 'bihar',
        'up', 'rajasthan', 'jharkhand', 'home state', 'ghar', 'घर', 'travel',
        'yatra', 'आना', 'जाना'],
    },
    {
      topics: ['domestic_worker'],
      patterns: ['domestic', 'घरेलू', 'ghar', 'maid', 'cook', 'khana banana', 'safai',
        'cleaning', 'househelp', 'servant', 'bai', 'bhai', 'काम वाली'],
    },
  ];

  const matched = new Set();
  for (const rule of rules) {
    if (rule.patterns.some(p => q.includes(p.toLowerCase()))) {
      rule.topics.forEach(t => matched.add(t));
    }
  }

  return matched.size > 0 ? [...matched] : ['general'];
}

// ── English Expert Knowledge Base ──────────────────────────────────────────────
const KNOWLEDGE_EN = {
  minimum_wage: {
    title: '💰 Minimum Wages — July 2026',
    response: `🙏 **Delhi Minimum Wages — July 2026 (Effective 01 July 2026)**

**Wage Rates (वेतन दरें):**

| Category | Daily Rate | Monthly Rate (26 days) |
|---|---|---|
| Unskilled | ₹743/day | ₹19,318/month |
| Semi-Skilled | ₹817/day | ₹21,242/month |
| Skilled | ₹899/day | ₹23,374/month |
| Highly Skilled | ₹988/day | ₹25,688/month |

**Overtime:**
Overtime hours must be paid at **double (2x)** the normal wage rate.

**If you are underpaid:**
1. Demand payment in writing from your employer.
2. File a complaint at the Delhi Labour Department.
3. Helpline: **1800-11-2345** (Toll-Free)

📜 **Legal Basis:** Minimum Wages Act, 1948 — Section 3 | Delhi Notification F.1(14)/MW/2026
📞 **Helpline:** 1800-11-2345 (Toll-Free, Free of cost)`,
    citations: ['Minimum Wages Act, 1948 — Section 3', 'Delhi Notification F.1(14)/MW/2026'],
  },

  overtime: {
    title: '⏰ Overtime Wages',
    response: `🕐 **Overtime Wages — Your Rights & Calculations**

**What is Overtime?**
Any hours worked beyond 8 hours a day or 48 hours a week qualify as overtime.

**Overtime Rate:**
Overtime Pay = **Double (2x)** the normal daily wage rate.

**Examples:**
- Unskilled Worker: ₹743/8 hrs × 2 = **₹185.75/hour overtime**
- Skilled Worker: ₹899/8 hrs × 2 = **₹224.75/hour overtime**

**Contractor Responsibility:**
Both the contractor and the principal employer are jointly responsible for paying overtime.

📜 **Legal Basis:** Factories Act, 1948 — Section 59 | Minimum Wages Act, 1948 — Section 14
📞 **Helpline:** 1800-11-2345 (Toll-Free)`,
    citations: ['Factories Act, 1948 — Section 59', 'Minimum Wages Act, 1948 — Section 14'],
  },

  eshram: {
    title: '📋 e-Shram Registration & Benefits',
    response: `📱 **e-Shram Portal Registration & Social Security Benefits**

**What is e-Shram?**
A national database created by the Government of India for unorganized sector workers.

**Key Benefits:**
1. 🔵 **PM-SYM Pension** — ₹3,000/month after the age of 60
2. 🛡️ **Accident Insurance** — ₹2 Lakh for accidental death/permanent disability
3. 📄 **UAN Card** — Single card to access all central social welfare schemes
4. 🏥 **Ayushman Bharat** — Health insurance coverage up to ₹5 Lakh
5. 💰 **Disaster Relief** — Direct benefit transfers during national emergencies

**How to Register (FREE):**
1. 🌐 **Online:** Visit eshram.gov.in
2. 📱 **CSC Centers:** Go to your nearest Common Service Centre
3. 📞 **Helpline:** 14434

📜 **Legal Basis:** Code on Social Security, 2020 — Section 113
📞 **Helpline:** 14434 (e-Shram Portal) | 1800-11-2345 (Labour Dept)`,
    citations: ['Code on Social Security, 2020 — Section 113'],
  },

  bocw: {
    title: '🏗️ BOCW Construction Board Benefits',
    response: `🏗️ **BOCW Welfare Scheme (Construction Workers)**

If you have worked in construction for at least **90 days** in the past year, you are eligible for BOCW benefits:

**Key Benefits:**
1. 💀 **Death Benefit:** ₹3 Lakhs to family
2. 🤕 **Disability Cover:** ₹1 Lakh to ₹3 Lakhs
3. 🎓 **Scholarships:** ₹4,000 to ₹30,000/year for your children's education
4. 💊 **Medical Aid:** Financial aid for hospitalization
5. 🤱 **Maternity Benefit:** For female construction workers

**How to register:**
- Visit bocwdelhi.org and apply online.

📜 **Legal Basis:** Building and Other Construction Workers Act, 1996 — Section 12
📞 **Helpline:** 1800-11-2345 | 011-23392694`,
    citations: ['BOCW Act, 1996 — Section 12', 'Delhi BOCW Rules, 2002'],
  },

  maternity: {
    title: '🤱 Maternity Leave & Benefits',
    response: `🤱 **Maternity Benefits — Rights of Women Workers**

**Paid Maternity Leave:**
- **26 weeks** (6.5 months) paid leave for the first 2 children
- **12 weeks** paid leave for subsequent children

**Eligibility:**
- Must have worked at least **80 days** with the employer in the preceding 12 months.

**Other Benefits:**
1. 💊 **Medical Bonus:** ₹3,500 if employer does not provide free medical facilities
2. 🏠 **Nursing Breaks:** Two breaks daily until child is 18 months old
3. 🚫 **No Dismissal:** Dismissing a woman due to pregnancy is strictly illegal

📜 **Legal Basis:** Maternity Benefit (Amendment) Act, 2017 — Section 5
📞 **Women Helpline:** 181 | **Labour Helpline:** 1800-11-2345`,
    citations: ['Maternity Benefit (Amendment) Act, 2017 — Section 5'],
  },

  pf_esi: {
    title: '🏦 Provident Fund (PF) & ESI Insurance',
    response: `🏦 **EPF (Provident Fund) & ESI (Employee State Insurance)**

**1. EPF (Employees' Provident Fund):**
- Applicable if your establishment has **20 or more** employees.
- Contributions: Employee (12%) + Employer (12%) = **24% of basic wage** saved in your EPF account.
- PF Helpline: **1800-118-005**

**2. ESIC (Employee State Insurance):**
- Applicable for establishments with 10+ employees where monthly wage is ≤₹21,000.
- Benefits: Free healthcare at ESI hospitals, sickness cash benefit, and dependent pension.

📜 **Legal Basis:** Employees' Provident Funds Act, 1952 | ESI Act, 1948
📞 **Helpline:** 1800-11-2345 | **EPFO:** 1800-118-005`,
    citations: ['Employees\' Provident Funds Act, 1952 — Section 2', 'ESI Act, 1948 — Section 2(12)'],
  },

  complaint: {
    title: '⚖️ How to File a Labour Complaint',
    response: `⚖️ **How to File a Complaint for Wage Theft or Rights Violation**

**Where to File:**
1. 🌐 **Online:** visit labour.delhi.gov.in or shramsuvidha.gov.in
2. 📞 **Call Helpline:** **1800-11-2345** (Delhi Labour Helpline)
3. 🏛️ **In-Person:** Visit the District Labour Office for your area (enter Pin Code in the sidebar finder to locate).

**Required Documents:**
- Salary slips or bank statement showing non-payment
- Name, address, and contact number of the employer/contractor
- Written description of the grievance

📜 **Legal Basis:** Payment of Wages Act, 1936 — Section 15
📞 **Helpline:** 1800-11-2345 (Toll-Free)`,
    citations: ['Payment of Wages Act, 1936 — Section 15'],
  },

  migrant: {
    title: '🚊 Migrant Worker Rights',
    response: `🚊 **Migrant Worker Rights — Inter-State Migrant Workmen Act, 1979**

**Your Core Rights:**
1. 🎫 **Journey Allowance:** Travel fare to and from home state once a year
2. 🏠 **Housing:** Employers must provide clean, suitable accommodation
3. 💊 **Medical:** Free medical checkups and basic healthcare treatment
4. 💰 **Displacement Allowance:** 50% of monthly wages at the time of recruitment

📜 **Legal Basis:** Inter-State Migrant Workmen Act, 1979 — Section 13
📞 **Helpline:** 1800-11-2345 (Toll-Free)`,
    citations: ['Inter-State Migrant Workmen Act, 1979 — Section 13'],
  },

  domestic_worker: {
    title: '🏠 Domestic Worker Rights',
    response: `🏠 **Domestic Worker Rights & Minimum Wage Guidelines**

**Minimum Wages for Domestic Help:**
- Unskilled (Daily help, sweeping): ₹743/day | ₹19,318/month
- Cooking/Childcare (Semi-skilled): ₹817/day | ₹21,242/month

**Weekly Rest:**
- 1 day of fully paid weekly rest is mandatory.

📜 **Legal Basis:** Minimum Wages Act, 1948 | Delhi Domestic Workers Welfare Guidelines
📞 **Helpline:** 1800-11-2345 (Toll-Free) | **Women Cell:** 181`,
    citations: ['Minimum Wages Act, 1948'],
  },

  general: {
    title: '⚖️ Shrayak — Labour Rights AI Assistant',
    response: `🙏 **Welcome! I am Shrayak — your AI helper for worker rights in Delhi.**

I can help you in Hindi or English with details on:
1. 💰 **Minimum Wages** — Rates for Unskilled, Semi-skilled, Skilled categories
2. ⏰ **Overtime Wages** — Calculating double overtime rates
3. 📋 **e-Shram / BOCW Portal** — Registration, benefits, pensions
4. 🤱 **Maternity Benefit** — Paid maternity leave guidelines
5. ⚖️ **Filing Complaints** — Steps to report wage theft or contractor fraud

Please select a persona or type your query below!

📞 **Labour Helpline:** 1800-11-2345 (Toll-Free)
📱 **e-Shram Portal:** 14434`,
    citations: [],
  },
};

// ── Main: Generate Local Response ─────────────────────────────────────────────

/**
 * generateLocalResponse(query, retrievedDocs, language)
 *
 * Generates a structured, helpful Hindi or English response using:
 *  1. Intent detection on the query
 *  2. Retrieved Elasticsearch context documents (primary source)
 *  3. Expert knowledge templates
 *
 * @param {string} query — User's original query
 * @param {Array}  retrievedDocs — Hits from Elasticsearch (may be empty)
 * @param {string} language — 'hi' | 'en'
 * @returns {{ response: string, citations: string[], usedLocalKnowledge: boolean }}
 */
function generateLocalResponse(query, retrievedDocs = [], language = 'hi') {
  const intents = detectLocalIntent(query);
  const primaryIntent = intents[0];
  
  const isEn = language === 'en';
  const sourceKb = isEn ? KNOWLEDGE_EN : KNOWLEDGE;
  const kb = sourceKb[primaryIntent] || sourceKb.general;

  // Build response from knowledge base template
  let response = kb.response;
  let citations = [...kb.citations];

  // Enrich with retrieved doc snippets if available
  if (retrievedDocs.length > 0) {
    const topDocs = retrievedDocs.slice(0, 2);
    const extras = topDocs
      .filter(d => d.content && d.content.length > 50)
      .map(d => {
        const snippet = d.content.substring(0, 300).replace(/\n+/g, ' ').trim();
        const date = d.effectiveDate ? ` (Effective: ${d.effectiveDate})` : '';
        const label = isEn ? '📌 Reference' : '📌 संदर्भ';
        return `${label} **${d.shortName ?? d.statute ?? 'Legal Reference'}${date}:** ${snippet}...`;
      });

    if (extras.length > 0) {
      const header = isEn 
        ? '\n\n---\n**📚 Information from Elasticsearch:**\n' 
        : '\n\n---\n**📚 Elastic से प्राप्त जानकारी:**\n';
      response += header + extras.join('\n\n');
    }

    // Add citations from retrieved docs
    topDocs.forEach(d => {
      if (d.shortName && !citations.includes(d.shortName)) citations.push(d.shortName);
    });
  }

  return {
    response,
    citations: citations.slice(0, 3),
    usedLocalKnowledge: true,
  };
}

module.exports = { generateLocalResponse, detectLocalIntent, WAGES, KNOWLEDGE, KNOWLEDGE_EN };
