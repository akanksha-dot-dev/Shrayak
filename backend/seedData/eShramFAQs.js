/**
 * eShramFAQs.js — Shrayak: Shramik Sahayak
 *
 * e-Shram Registration FAQs — Bilingual (Hindi + English)
 *
 * Data Source: Official e-Shram FAQ (eshram.gov.in/faq) + Ministry of Labour circulars.
 * These are structured as RAG-ready document chunks.
 */

'use strict';

const ESHRAM_FAQ_DOCUMENTS = [
  {
    id: 'eshram-what-is',
    category: 'eshram',
    subCategory: 'basics',
    source: 'Ministry of Labour and Employment — eshram.gov.in',
    statute: 'Unorganised Workers Social Security Act, 2008',
    language: 'bilingual',
    content: `ई-श्रम क्या है? | What is e-Shram?

e-Shram is the National Database of Unorganised Workers (NDUW), launched by the Ministry of Labour and Employment, Government of India on 26 August 2021.

ई-श्रम भारत सरकार के श्रम एवं रोजगार मंत्रालय द्वारा 26 अगस्त 2021 को शुरू की गई असंगठित श्रमिकों की राष्ट्रीय डेटाबेस है।

PURPOSE (उद्देश्य):
- To create a centralized database of all unorganised sector workers in India.
- To provide direct benefit transfers and social security to workers.
- To connect workers with government welfare schemes.

असंगठित क्षेत्र के सभी श्रमिकों का एक केंद्रीय डेटाबेस बनाना, ताकि सरकारी लाभ सीधे मिल सकें।

WHO IS AN UNORGANISED WORKER (असंगठित श्रमिक कौन है):
- Home-based workers (घरेलू कामगार)
- Self-employed workers (स्व-रोजगार)
- Daily wage workers (दिहाड़ी मजदूर)
- Construction workers (निर्माण श्रमिक)
- Street vendors (सड़क विक्रेता)
- Domestic workers (घरेलू नौकर)
- Agricultural labourers (कृषि मजदूर)
- Transport workers (परिवहन श्रमिक)
- Fishermen, beedi workers, handloom workers, and more.

Website: eshram.gov.in | Helpline: 14434 (Toll-Free, Hindi available)`,
    tags: ['eshram', 'ई-श्रम', 'what is eshram', 'ई-श्रम क्या है', 'NDUW', 'unorganised worker'],
  },

  {
    id: 'eshram-eligibility',
    category: 'eshram',
    subCategory: 'eligibility',
    source: 'Ministry of Labour and Employment — eshram.gov.in',
    statute: 'Unorganised Workers Social Security Act, 2008, Section 10',
    language: 'bilingual',
    content: `ई-श्रम पंजीकरण के लिए पात्रता | e-Shram Registration Eligibility:

ELIGIBLE (पात्र):
✅ Age: 16 to 59 years (16 से 59 वर्ष के बीच)
✅ Working in the unorganised/informal sector (असंगठित क्षेत्र में काम करते हों)
✅ Having an Aadhaar card linked to your mobile number (आधार कार्ड + मोबाइल नंबर)
✅ NOT a member of EPFO (Provident Fund) — Not salaried with PF deduction
✅ NOT a member of ESIC (Employee State Insurance)
✅ NOT an Income Tax payer

NOT ELIGIBLE (अपात्र):
❌ Government employees (सरकारी कर्मचारी)
❌ Those already registered with EPFO or ESIC
❌ Income tax payers

If you are a casual/contract worker WITHOUT PF or ESI deductions, you are ELIGIBLE.
यदि आपके वेतन से PF या ESI नहीं कटती, तो आप पंजीकरण के लिए पात्र हैं।`,
    tags: ['eshram eligibility', 'ई-श्रम पात्रता', 'who can register', 'कौन पंजीकरण कर सकता है'],
  },

  {
    id: 'eshram-registration-steps',
    category: 'eshram',
    subCategory: 'registration',
    source: 'Ministry of Labour and Employment — eshram.gov.in',
    statute: 'Unorganised Workers Social Security Act, 2008',
    language: 'bilingual',
    content: `ई-श्रम पंजीकरण कैसे करें | How to Register on e-Shram:

METHOD 1 — Online (ऑनलाइन) — eshram.gov.in:
Step 1: Go to eshram.gov.in
Step 2: Click "Register on e-Shram" (ई-श्रम पर पंजीकरण करें)
Step 3: Enter your Aadhaar-linked mobile number
Step 4: Enter OTP received on your mobile
Step 5: Enter Aadhaar number — verify with OTP
Step 6: Fill in personal details: Name, Date of Birth, Address, Occupation
Step 7: Enter bank account details (for benefit transfers)
Step 8: Submit and download e-Shram UAN card

MOBILE APP: Download "e-Shram" app from Google Play Store or iOS App Store.

METHOD 2 — CSC/Jan Seva Kendra (नजदीकी जन सेवा केंद्र):
Visit your nearest CSC (Common Service Centre) — Jan Seva Kendra.
Take with you:
📄 Aadhaar card (आधार कार्ड)
📱 Mobile number linked to Aadhaar
🏦 Bank passbook (first page showing account number and IFSC)
🖼️ Passport-size photograph (optional at most CSCs)

COST: Registration is COMPLETELY FREE (पूरी तरह निःशुल्क).

METHOD 3 — Helpline (हेल्पलाइन): Call 14434 — free, Hindi assistance available.

After registration, you get:
✅ e-Shram UAN Card (12-digit Universal Account Number)
✅ PM Suraksha Bima automatic enrollment — ₹2 lakh accident cover for ₹1/year
✅ Access to all government welfare schemes`,
    tags: ['eshram registration', 'ई-श्रम पंजीकरण', 'how to register', 'CSC', 'jan seva kendra', 'UAN card', 'ई-श्रम कार्ड'],
  },

  {
    id: 'eshram-benefits',
    category: 'eshram',
    subCategory: 'benefits',
    source: 'Ministry of Labour and Employment',
    statute: 'PM Suraksha Bima Yojana; PM-SYM (Pradhan Mantri Shram Yogi Maandhan); Unorganised Workers Social Security Act, 2008',
    language: 'bilingual',
    content: `ई-श्रम पंजीकरण के लाभ | Benefits of e-Shram Registration:

1. PM SURAKSHA BIMA YOJANA (प्रधानमंत्री सुरक्षा बीमा योजना):
   - Accidental Death: ₹2,00,000 (₹2 lakh) to nominee
   - Permanent Full Disability: ₹2,00,000
   - Partial Disability: ₹1,00,000
   - Annual Premium: Only ₹12/year (auto-deducted from bank account)
   - Eligibility: Age 18–70 years
   दुर्घटना में मृत्यु या अपंगता पर ₹2 लाख तक।

2. PM JEEVAN JYOTI BIMA YOJANA (प्रधानमंत्री जीवन ज्योति बीमा योजना):
   - Life Insurance: ₹2,00,000 on death (any cause)
   - Annual Premium: ₹436/year
   - Age: 18–55 years

3. PM-SYM PENSION (प्रधानमंत्री श्रम योगी मानधन):
   - Monthly pension of ₹3,000 after age 60
   - Contribution: ₹55–₹200/month depending on age of enrollment
   - Central Government contributes an equal amount.
   60 साल के बाद ₹3,000 प्रतिमाह पेंशन।

4. PRIORITY ACCESS TO SCHEMES:
   - Pradhan Mantri Awas Yojana (housing)
   - Ayushman Bharat (₹5 lakh health insurance)
   - PM Kisan (for agricultural workers)

5. IDENTITY PROOF: e-Shram UAN card serves as valid identity proof for bank loans, rental agreements.

6. COVID RELIEF & DISASTER RELIEF: During national emergencies, registered workers get priority for relief payments.

IMPORTANT: Benefits may vary by state. In Delhi, additional benefits under Delhi BOCW scheme are available for construction workers who register.`,
    tags: ['eshram benefits', 'ई-श्रम लाभ', 'insurance', 'pension', 'PM-SYM', 'suraksha bima', 'health insurance'],
  },

  {
    id: 'eshram-update-card',
    category: 'eshram',
    subCategory: 'card_management',
    source: 'eshram.gov.in',
    statute: 'Unorganised Workers Social Security Act, 2008',
    language: 'bilingual',
    content: `ई-श्रम कार्ड — अपडेट और डाउनलोड | e-Shram Card — Update & Download:

HOW TO DOWNLOAD YOUR e-SHRAM CARD (ई-श्रम कार्ड कैसे डाउनलोड करें):
1. Go to eshram.gov.in
2. Click "Already Registered? Update Profile"
3. Enter your mobile number → OTP
4. View and download your UAN card as PDF

HOW TO UPDATE YOUR DETAILS (जानकारी कैसे बदलें):
- Change mobile number: Visit nearest CSC with Aadhaar
- Change address: Update online via eshram.gov.in
- Change bank account: Update online with new bank details
- Change occupation/job type: Update online

IF MOBILE NUMBER CHANGED AND NOT LINKED TO AADHAAR:
Visit the nearest Aadhaar Seva Kendra to update your mobile number in Aadhaar first, then log in to e-Shram.

LOST YOUR UAN NUMBER (UAN भूल गए):
Go to eshram.gov.in → "Forgot UAN" → Enter Aadhaar + OTP to retrieve.

NOMINATE A FAMILY MEMBER (परिजन को नामांकित करें):
Add your nominee (spouse or family member) so they receive insurance/pension benefits in case of death.
यह सुनिश्चित करें कि आपका नॉमिनी सही तरीके से भरा हुआ है।

Helpline: 14434 (Toll-free, 8 AM – 8 PM, Mon–Sat)`,
    tags: ['eshram card download', 'UAN card', 'update eshram', 'ई-श्रम कार्ड डाउनलोड', 'nominee'],
  },

  {
    id: 'delhi-welfare-schemes-migrant',
    category: 'welfare_schemes',
    subCategory: 'delhi_specific',
    source: 'Delhi Government Labour Department',
    statute: 'Delhi Inter-State Migrant Workmen (Regulation of Employment and Conditions of Service) Rules; Delhi BOCW Rules, 2002',
    language: 'bilingual',
    content: `दिल्ली में प्रवासी श्रमिकों के लिए सरकारी योजनाएं:
Government Welfare Schemes for Migrant Workers in Delhi:

1. DELHI MUKHYAMANTRI SHRAMIK MITRA YOJANA:
   Social support scheme providing counseling and assistance to migrants.
   Contact: Delhi Labour Department — 011-23932045

2. CONSTRUCTION WORKER REGISTRATION (BOCW):
   All construction workers in Delhi must register with Delhi BOCW Board.
   Benefits: ₹30,000 maternity, ₹2 lakh accident death cover, education assistance.
   Office: 5, Sham Nath Marg, Delhi — 011-23912011

3. DELHI UNNAT SHIKSHA YOJANA:
   Education scholarships for children of registered construction workers.
   Amount: ₹500/month for school (Class 1-8); ₹1,000/month for Class 9-12; ₹3,000/month for college.

4. MAZDOOR AWAAS SAHAYATA (Housing Assistance):
   For workers who have been registered for 3+ years. Assistance for house construction.
   Apply at: District Labour Office in your area.

5. JEEVAN JYOTI YOJANA (Delhi specific):
   Life insurance for workers registered with Delhi Labour Department.
   Coverage: ₹50,000 on natural death.

6. NIGHT SHELTER FACILITIES (रैन बसेरा):
   Delhi Urban Shelter Improvement Board (DUSIB) operates night shelters across Delhi.
   Helpline: 011-23902003 | Search "DUSIB Rein Basera" for locations.
   Free for all homeless workers — no ID required.

7. ESSENTIAL MEDICINES & HEALTH CARD:
   Delhi Government Mohalla Clinics — free consultation and medicines for all residents including migrants.
   Website: mohallaclinic.delhi.gov.in

HOW TO ACCESS SCHEMES:
- First register on e-Shram (eshram.gov.in) — many schemes require e-Shram UAN
- Then visit nearest District Labour Office for Delhi-specific schemes
- Bring: Aadhaar, e-Shram card, bank passbook, proof of address in Delhi`,
    tags: ['delhi schemes', 'migrant schemes', 'दिल्ली योजनाएं', 'welfare', 'BOCW', 'night shelter', 'mohalla clinic'],
  },
];

module.exports = { ESHRAM_FAQ_DOCUMENTS };
