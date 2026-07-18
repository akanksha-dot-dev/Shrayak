/**
 * labourLaws.js — Shrayak: Shramik Sahayak
 *
 * Key Labour Law Excerpts for the RAG Knowledge Base.
 *
 * Laws covered:
 *  1. Inter-State Migrant Workmen (Regulation of Employment and Conditions of Service) Act, 1979
 *  2. Building and Other Construction Workers (BOCW) Act, 1996
 *  3. Unorganised Workers Social Security Act, 2008
 *  4. Child Labour (Prohibition and Regulation) Amendment Act, 2016
 *  5. Maternity Benefit Act, 1961 (as amended 2017)
 *  6. Employees' Provident Fund and Miscellaneous Provisions Act, 1952
 *  7. Employees' State Insurance Act, 1948
 *  8. Code on Wages, 2019 (applicable provisions)
 *
 * Each document is bilingual (Hindi + English) for accurate Hindi query matching.
 */

'use strict';

const LABOUR_LAW_DOCUMENTS = [
  // ── 1. Inter-State Migrant Workmen Act, 1979 ──────────────────────────────
  {
    id: 'ismw-act-overview',
    category: 'labour_law',
    subCategory: 'migrant_rights',
    source: 'Ministry of Labour and Employment, Government of India',
    statute: 'The Inter-State Migrant Workmen (Regulation of Employment and Conditions of Service) Act, 1979',
    shortName: 'ISMW Act, 1979',
    language: 'bilingual',
    content: `अंतर-राज्यीय प्रवासी कर्मकार अधिनियम, 1979 — आपके अधिकार:

The Inter-State Migrant Workmen Act, 1979 — Your Rights as a Migrant Worker:

This law protects workers who are recruited in one state and employed in another state (e.g., migrating from UP/Bihar/Jharkhand to Delhi).

यह कानून उन श्रमिकों की रक्षा करता है जो एक राज्य से दूसरे राज्य में काम करने जाते हैं।

KEY RIGHTS under this Act:

1. Displacement Allowance (विस्थापन भत्ता) — Section 15:
   Every migrant worker is entitled to a displacement allowance equal to 50% of monthly wages or ₹75, whichever is higher, for the inconvenience of relocating.
   
2. Journey Allowance (यात्रा भत्ता) — Section 15(b):
   The contractor must pay the full cost of travel TO and FROM the place of employment. Both onward and return journeys.
   
3. Regular Wages (नियमित वेतन) — Section 13:
   A migrant worker must be paid wages equal to wages paid to local workers doing the same or similar work. No wage discrimination based on state of origin.
   
4. Home Journey (घर वापसी) — Section 15(c):
   The contractor must provide free passage home to the worker's place of origin at least once a year.
   
5. Suitable Accommodation (उचित आवास) — Section 16:
   The contractor must provide adequate housing, clean drinking water, and medical facilities.

Registration: Contractors employing 5 or more inter-state migrant workers MUST register with the Labour Commissioner of the state of employment.

यदि आपके अधिकार नहीं मिल रहे: संबंधित राज्य के श्रम आयुक्त को शिकायत करें। दिल्ली के लिए: Labour Commissioner, Delhi — 011-23932045.`,
    tags: ['migrant worker', 'प्रवासी मजदूर', 'inter-state', 'displacement allowance', 'journey allowance', 'ISMW'],
  },

  {
    id: 'ismw-contractor-obligations',
    category: 'labour_law',
    subCategory: 'migrant_rights',
    source: 'Ministry of Labour and Employment, Government of India',
    statute: 'Inter-State Migrant Workmen Act, 1979, Sections 8–12',
    shortName: 'ISMW Act, 1979 — Contractor Duties',
    language: 'bilingual',
    content: `Contractor Obligations under ISMW Act, 1979:

ठेकेदार (Contractor) के कर्तव्य — अंतर-राज्यीय प्रवासी कर्मकार अधिनियम, 1979:

Section 8 — Registration of Contractors:
Every contractor who recruits inter-state migrant workers MUST obtain a Certificate of Registration from the Licensing Authority in the originating state before recruitment.

ठेकेदार को मजदूर लाने से पहले लाइसेंस लेना अनिवार्य है।

Section 10 — Passbook for Migrant Workers:
Every migrant worker must be issued a PASSBOOK (पासबुक) containing:
- Name of worker (मजदूर का नाम)
- Father's/Husband's name
- Permanent address (स्थायी पता)
- Name and address of employer
- Nature of work
- Wages agreed upon (सहमत वेतन)
- Period of employment

If you do not have this passbook, your employer is violating the law.
पासबुक न मिलने पर: यह कानून का उल्लंघन है। तुरंत शिकायत करें।

Section 12 — Duties of Principal Employer:
The principal employer (main contractor/company) is jointly responsible with the contractor to ensure migrant worker rights are upheld.

Penalty for Violations (Section 25): Imprisonment up to 1 year, or fine up to ₹1,000, or both.`,
    tags: ['contractor', 'passbook', 'पासबुक', 'registration', 'ISMW', 'प्रवासी मजदूर अधिकार'],
  },

  // ── 2. BOCW Act, 1996 ─────────────────────────────────────────────────────
  {
    id: 'bocw-act-benefits',
    category: 'labour_law',
    subCategory: 'construction_workers',
    source: 'Delhi Building & Other Construction Workers Welfare Board',
    statute: 'Building and Other Construction Workers (Regulation of Employment and Conditions of Service) Act, 1996; Delhi BOCW Welfare Board Scheme',
    shortName: 'BOCW Act, 1996',
    language: 'bilingual',
    content: `निर्माण श्रमिकों के लिए BOCW लाभ (दिल्ली):
Building & Other Construction Workers (BOCW) Benefits — Delhi:

WHO IS ELIGIBLE (कौन पात्र है):
- Construction workers who have completed 90 days of work in the preceding 12 months.
- पिछले 12 महीनों में कम से कम 90 दिन निर्माण कार्य किया हो।
- Must be between 18 and 60 years of age.
- Must be registered with Delhi BOCW Welfare Board.

WELFARE BENEFITS (कल्याण लाभ):

1. Maternity Benefit (मातृत्व लाभ): ₹30,000 for female construction workers.
2. Accident/Death Relief (दुर्घटना राहत):
   - Natural Death: ₹1,00,000 to nominee
   - Accidental Death: ₹2,00,000 to nominee
   - Permanent Disability: ₹1,50,000
3. Education Assistance (शिक्षा सहायता): ₹500–₹15,000 per year per child for school and college education (up to 2 children).
4. Medical Assistance (चिकित्सा सहायता): Up to ₹20,000 for serious illness requiring hospitalization.
5. Pension (पेंशन): ₹3,000/month after age 60 for registered workers with 5+ years of contribution.
6. Tool Kit (टूल किट): Free tool kit worth ₹5,000 for skilled workers (once in a lifetime).
7. Loan for House Construction: Up to ₹1,00,000 at low interest.

HOW TO REGISTER (पंजीकरण कैसे करें):
Visit the Delhi BOCW Welfare Board office at 5, Sham Nath Marg, Delhi - 110054.
Phone: 011-23912011
Documents needed: Aadhaar card, Proof of construction work (employer certificate or site photograph), Bank account details.

Legal Basis: BOCW Act, 1996, Section 22 — Welfare Fund; Delhi Building and Other Construction Workers Welfare Board Rules, 2002.`,
    tags: ['BOCW', 'construction worker', 'निर्माण श्रमिक', 'welfare benefits', 'maternity', 'education', 'pension', 'registration'],
  },

  // ── 3. Unorganised Workers Social Security Act, 2008 ──────────────────────
  {
    id: 'uwssa-eshram-rights',
    category: 'labour_law',
    subCategory: 'unorganised_sector',
    source: 'Ministry of Labour and Employment, Government of India',
    statute: 'Unorganised Workers Social Security Act, 2008; e-Shram Portal (eshram.gov.in)',
    shortName: 'UWSSA, 2008 & e-Shram',
    language: 'bilingual',
    content: `असंगठित क्षेत्र के श्रमिकों के लिए सामाजिक सुरक्षा:
Social Security for Unorganised Sector Workers:

The Unorganised Workers Social Security Act, 2008 mandates the government to provide social security schemes to workers in the informal/unorganised sector.

e-SHRAM PORTAL (ई-श्रम पोर्टल) — National Database of Unorganised Workers:
Website: eshram.gov.in | Helpline: 14434 (Toll-Free)

WHO CAN REGISTER (कौन पंजीकरण कर सकता है):
- Any worker between 16 and 59 years of age
- Working in the unorganised sector (construction, domestic work, street vending, farming, etc.)
- NOT a member of EPFO or ESIC
- Having an Aadhaar number linked to mobile phone

BENEFITS OF e-SHRAM REGISTRATION:
1. UAN (Universal Account Number) — ई-श्रम UAN कार्ड
2. PM Suraksha Bima Yojana: ₹2,00,000 accidental death/disability coverage for ₹1/year premium.
3. PM Jeevan Jyoti Bima Yojana: ₹2,00,000 life insurance.
4. Priority access to government welfare schemes.
5. Proof of worker identity for loan applications.
6. Access to Pradhan Mantri Shram Yogi Maandhan (PM-SYM): pension scheme — ₹3,000/month at age 60.

HOW TO REGISTER (पंजीकरण कैसे करें):
1. Online: Visit eshram.gov.in → Register → Enter Aadhaar + Mobile OTP
2. At CSC (Common Service Centre): Nearest Jan Seva Kendra
3. Call Helpline: 14434 (Hindi support available)

Legal Reference: Sections 3 and 4 of the Unorganised Workers Social Security Act, 2008 — the Central and State Governments must formulate schemes for life and disability cover, health and maternity benefits, old age protection, and educational schemes for unorganised workers.`,
    tags: ['e-Shram', 'ई-श्रम', 'unorganised worker', 'social security', 'UAN', 'registration', 'PM-SYM', 'pension'],
  },

  // ── 4. Maternity Benefit ───────────────────────────────────────────────────
  {
    id: 'maternity-benefit-act',
    category: 'labour_law',
    subCategory: 'maternity',
    source: 'Ministry of Labour and Employment, Government of India',
    statute: 'Maternity Benefit Act, 1961, as amended by Maternity Benefit (Amendment) Act, 2017',
    shortName: 'Maternity Benefit Act, 1961',
    language: 'bilingual',
    content: `मातृत्व लाभ अधिनियम, 1961 — महिला श्रमिकों के अधिकार:
Maternity Benefit Act, 1961 — Rights of Women Workers:

KEY PROVISIONS:

1. Maternity Leave (मातृत्व अवकाश): 26 weeks of paid maternity leave for the first two children. (For third and subsequent children: 12 weeks.)
   पहले दो बच्चों के लिए 26 सप्ताह का सवैतनिक प्रसूति अवकाश।

2. Who is eligible (कौन पात्र है): Any woman employee who has worked for at least 80 days in the 12 months immediately preceding her expected date of delivery.
   प्रसव से पहले 12 महीनों में कम से कम 80 दिन काम किया हो।

3. Adoption (गोद लेना): 12 weeks maternity leave for women adopting a child below 3 months of age.

4. Nursing Breaks (स्तनपान विराम): Two nursing breaks per day until the child is 15 months old — Section 11.

5. Work from Home option — Section 5(5): After maternity leave, the employer may allow work from home arrangements if the nature of work permits.

6. No Dismissal during pregnancy — Section 12: An employer cannot dismiss or discharge a woman worker during or on account of her maternity leave. Such dismissal is illegal and entitles the worker to maternity benefits.

7. Crèche Facility — Section 11A: Any establishment with 50+ employees must provide a crèche (day care) facility.

Establishments covered: All establishments employing 10 or more persons.

How to complain if denied maternity benefits:
- File a complaint with the Inspector under the Maternity Benefit Act for your district.
- Or approach the Delhi Labour Commissioner's office.

Legal Reference: Maternity Benefit Act, 1961, as amended in 2017. Section 5 for paid leave; Section 12 for protection against dismissal.`,
    tags: ['maternity', 'maternity leave', 'मातृत्व अवकाश', 'pregnancy', 'गर्भावस्था', 'women rights', 'महिला अधिकार'],
  },

  // ── 5. EPF & ESI ──────────────────────────────────────────────────────────
  {
    id: 'epf-esi-rights',
    category: 'labour_law',
    subCategory: 'social_security',
    source: 'EPFO & ESIC',
    statute: 'Employees Provident Fund and Miscellaneous Provisions Act, 1952; Employees State Insurance Act, 1948',
    shortName: 'EPF Act, 1952 & ESI Act, 1948',
    language: 'bilingual',
    content: `भविष्य निधि (PF) और कर्मचारी राज्य बीमा (ESI) के अधिकार:
Provident Fund (PF) and Employee State Insurance (ESI) Rights:

PROVIDENT FUND (भविष्य निधि / PF):

Applicability: Every establishment with 20+ employees.
अनिवार्यता: 20 या अधिक कर्मचारियों वाला प्रत्येक प्रतिष्ठान।

Contribution Rate:
- Employee contributes 12% of basic wages + DA to PF.
- Employer also contributes 12% (8.33% to EPS/Pension, 3.67% to EPF).

कर्मचारी: मूल वेतन + DA का 12% PF में जाता है।
नियोक्ता: 12% (पेंशन सहित) जमा करता है।

Your UAN (Universal Account Number) tracks your PF account. Check balance at: epfindia.gov.in

If employer deducts PF from your salary but does NOT deposit it with EPFO — this is FRAUD and punishable with imprisonment up to 5 years.
PF काटकर जमा न करना: यह अपराध है, जेल हो सकती है।

Complaint: EPFO Grievance Portal: epfigms.gov.in | Helpline: 1800-118-005

EMPLOYEE STATE INSURANCE (ESI / कर्मचारी राज्य बीमा):

Applicability: Establishments with 10+ employees where wages ≤ ₹21,000/month.
Contribution: Employer 3.25% + Employee 0.75% of wages.

Benefits:
- Free medical care for worker and family at ESI hospitals and dispensaries.
- Sickness cash benefit: 70% of wages for up to 91 days per year.
- Maternity benefit: Full wages for up to 26 weeks.
- Disablement benefit: 90% of wages for permanent disability.
- Death/dependent benefit for family of deceased workers.

Check eligibility: esic.gov.in | Helpline: 1800-11-2526`,
    tags: ['PF', 'provident fund', 'भविष्य निधि', 'ESI', 'insurance', 'बीमा', 'EPFO', 'UAN'],
  },

  // ── 6. Child Labour ──────────────────────────────────────────────────────
  {
    id: 'child-labour-prohibition',
    category: 'labour_law',
    subCategory: 'child_protection',
    source: 'Ministry of Labour and Employment',
    statute: 'Child Labour (Prohibition and Regulation) Amendment Act, 2016; Article 24 of the Constitution of India',
    shortName: 'Child Labour Act, 2016',
    language: 'bilingual',
    content: `बाल श्रम निषेध — आपको क्या जानना चाहिए:
Child Labour Prohibition — What You Must Know:

The Child Labour (Prohibition and Regulation) Amendment Act, 2016 makes it ILLEGAL to employ any child below 14 years of age in ANY occupation or process.

14 वर्ष से कम आयु के बच्चे से किसी भी काम करवाना ILLEGAL है।

Additionally, adolescents (14–18 years) CANNOT be employed in "hazardous occupations" such as:
- Mining, construction sites, factories
- Firecrackers, explosives, and chemical industries
- Any work involving dangerous machinery

किशोर (14–18 वर्ष) को खतरनाक काम पर नहीं लगाया जा सकता।

Penalties for Employing Child Labour:
- First offence: Imprisonment 6 months to 2 years, OR Fine ₹20,000 to ₹50,000, or BOTH.
- Repeat offence: Imprisonment 1 to 3 years (mandatory).

How to Report Child Labour (बाल श्रम की शिकायत कहाँ करें):
- Childline helpline: 1098 (24x7, Toll-Free)
- National Child Labour Project (NCLP) — District Collector
- Delhi Labour Department Child Labour Cell: 011-23932045

Constitutional Basis: Article 24 of the Constitution of India prohibits employment of children below 14 years in factories, mines, or any other hazardous employment. Article 21A guarantees free and compulsory education for children aged 6–14 years (Right to Education Act, 2009).`,
    tags: ['child labour', 'बाल श्रम', 'child rights', 'बाल अधिकार', 'childline', '1098', 'prohibition'],
  },

  // ── 7. Grievance Rights ──────────────────────────────────────────────────
  {
    id: 'grievance-filing-guide',
    category: 'labour_law',
    subCategory: 'grievance_redressal',
    source: 'Delhi Labour Department; Ministry of Labour',
    statute: 'Industrial Disputes Act, 1947; Minimum Wages Act, 1948, Section 20',
    shortName: 'Grievance Filing Guide',
    language: 'bilingual',
    content: `शिकायत कैसे दर्ज करें — श्रमिकों के लिए पूरी जानकारी:
How to File a Labour Grievance — Complete Guide for Workers:

STEP 1: Informal Resolution
- First, speak to your supervisor or HR/employer directly.
- Keep a written record (WhatsApp message, written letter) of the complaint and response.

पहले अपने नियोक्ता से बात करें और सब कुछ लिखित में रखें।

STEP 2: Online Complaint (ऑनलाइन शिकायत)
Portal: Shram Suvidha Portal — shramsuvidha.gov.in
NICSI Helpline: 1800-11-2345 (Toll-Free)
Delhi Labour Department: labour.delhigovt.nic.in

STEP 3: File with District Labour Office (जिला श्रम कार्यालय)
Visit your nearest District Labour Office (see our "nearest office" feature).
Documents to bring:
- Salary slips / wage records (if available)
- Employment contract or appointment letter
- Aadhaar card (for identity)
- Details of employer/contractor

STEP 4: Labour Court (श्रम न्यायालय)
For unresolved disputes, cases can be filed at the Delhi Labour Court under the Industrial Disputes Act, 1947.

STEP 5: High Court (उच्च न्यायालय)
As a last resort, a writ petition can be filed in Delhi High Court under Article 226.

IMPORTANT: Under Section 20 of the Minimum Wages Act, complaints must be filed within 6 months of the violation. Do not delay.

महत्वपूर्ण: न्यूनतम वेतन के मामले में उल्लंघन के 6 महीने के भीतर शिकायत करें।`,
    tags: ['grievance', 'complaint', 'शिकायत', 'labour court', 'श्रम न्यायालय', 'filing', 'rights violation'],
  },
];

module.exports = { LABOUR_LAW_DOCUMENTS };
