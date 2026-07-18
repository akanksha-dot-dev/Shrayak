/**
 * minimumWages.js — Shrayak: Shramik Sahayak
 *
 * Real Delhi Minimum Wage Data — Simulates ingestion of the official biannual
 * Minimum Wages notifications issued under the Minimum Wages Act, 1948.
 *
 * Data Source: Delhi Government — Labour Department Notifications
 *  - No. F.1(14)/MW/2024 (Revised w.e.f. 01-Oct-2024) — October 2024 revision
 *
 * Structure:
 *  Each document represents a "chunk" to be embedded and stored in Elasticsearch.
 *  Fields: id, category, source, statute, effectiveDate, content (rich text for embedding)
 *
 * IMPORTANT: These figures reflect the October 2024 VDA (Variable Dearness Allowance)
 * revision. Always re-seed when new circulars are issued (every April & October).
 */

'use strict';

// ─── Delhi Minimum Wage Documents (October 2024 Revision) ────────────────────

const MINIMUM_WAGE_DOCUMENTS = [
  // ── Category A: Unskilled Workers ──────────────────────────────────────────
  {
    id: 'mw-unskilled-daily-oct2024',
    category: 'minimum_wage',
    subCategory: 'unskilled',
    source: 'Delhi Labour Department',
    statute: 'Minimum Wages Act, 1948 — Delhi Notification No. F.1(14)/MW/2024',
    effectiveDate: '2024-10-01',
    notificationDate: '2024-09-15',
    language: 'bilingual',
    content: `Minimum Wage for Unskilled Workers in Delhi (Effective 1 October 2024):

अकुशल श्रमिकों के लिए दिल्ली न्यूनतम वेतन (1 अक्टूबर 2024 से प्रभावी):

Daily Rate (प्रतिदिन दर): ₹741.00 per day
Monthly Rate (मासिक दर): ₹19,266.00 per month (for 26 working days)
Variable Dearness Allowance (VDA) included.

Applicable to: Domestic workers, daily wage labourers, unskilled construction workers, agricultural workers in Delhi NCT.

यह वेतन किन पर लागू होता है: घरेलू कामगार, दिहाड़ी मजदूर, अकुशल निर्माण श्रमिक।

Legal Reference: The Minimum Wages Act, 1948 (Central Act No. 11 of 1948), as applicable to the National Capital Territory of Delhi. Section 3 mandates employers to pay not less than the minimum rate of wages fixed by the appropriate government.

Revision Cycle: Delhi revises minimum wages twice yearly — on 1 April and 1 October — incorporating Variable Dearness Allowance based on All India Consumer Price Index (AICPI) for Industrial Workers.`,
    tags: ['unskilled', 'daily wage', 'minimum wage', 'न्यूनतम वेतन', 'अकुशल'],
  },

  {
    id: 'mw-semiskilled-daily-oct2024',
    category: 'minimum_wage',
    subCategory: 'semi-skilled',
    source: 'Delhi Labour Department',
    statute: 'Minimum Wages Act, 1948 — Delhi Notification No. F.1(14)/MW/2024',
    effectiveDate: '2024-10-01',
    notificationDate: '2024-09-15',
    language: 'bilingual',
    content: `Minimum Wage for Semi-Skilled Workers in Delhi (Effective 1 October 2024):

अर्ध-कुशल श्रमिकों के लिए दिल्ली न्यूनतम वेतन (1 अक्टूबर 2024 से प्रभावी):

Daily Rate (प्रतिदिन दर): ₹817.00 per day
Monthly Rate (मासिक दर): ₹21,242.00 per month (for 26 working days)

Semi-skilled includes: Peons, Chowkidars (security guards), Daftri, Lift operators, Jamadars, Packers, Loaders/unloaders with some skill.

अर्ध-कुशल में शामिल हैं: चपरासी, चौकीदार, लिफ्ट ऑपरेटर, लोडर/अनलोडर।

Legal Reference: Minimum Wages Act, 1948, Section 5 — Procedure for fixing and revising minimum wages. Delhi Schedule of Employment under the Act covers all notified employments.

Enforcement: Any employer paying below this rate commits an offence punishable with imprisonment up to 5 years or fine up to ₹10,000 or both, under Section 22 of the Minimum Wages Act, 1948.`,
    tags: ['semi-skilled', 'minimum wage', 'chowkidar', 'न्यूनतम वेतन', 'अर्ध-कुशल'],
  },

  {
    id: 'mw-skilled-daily-oct2024',
    category: 'minimum_wage',
    subCategory: 'skilled',
    source: 'Delhi Labour Department',
    statute: 'Minimum Wages Act, 1948 — Delhi Notification No. F.1(14)/MW/2024',
    effectiveDate: '2024-10-01',
    notificationDate: '2024-09-15',
    language: 'bilingual',
    content: `Minimum Wage for Skilled Workers in Delhi (Effective 1 October 2024):

कुशल श्रमिकों के लिए दिल्ली न्यूनतम वेतन (1 अक्टूबर 2024 से प्रभावी):

Daily Rate (प्रतिदिन दर): ₹899.00 per day
Monthly Rate (मासिक दर): ₹23,374.00 per month (for 26 working days)

Skilled workers include: Electricians, Plumbers, Carpenters, Masons, Welders, Drivers (motor vehicles), Clerks with typing, Computer operators.

कुशल श्रमिकों में शामिल हैं: इलेक्ट्रीशियन, प्लंबर, बढ़ई, राजमिस्त्री, वेल्डर, वाहन चालक।

Legal Reference: Minimum Wages Act, 1948. The skill classification follows the definitions in the Schedule to the Act as notified by the Delhi Government.

Note: Workers performing skilled work but being paid at unskilled rates can file a complaint at the nearest District Labour Office or call the toll-free helpline 1800-11-2345.`,
    tags: ['skilled', 'minimum wage', 'electrician', 'driver', 'न्यूनतम वेतन', 'कुशल'],
  },

  {
    id: 'mw-highly-skilled-oct2024',
    category: 'minimum_wage',
    subCategory: 'highly-skilled',
    source: 'Delhi Labour Department',
    statute: 'Minimum Wages Act, 1948 — Delhi Notification No. F.1(14)/MW/2024',
    effectiveDate: '2024-10-01',
    notificationDate: '2024-09-15',
    language: 'bilingual',
    content: `Minimum Wage for Highly Skilled Workers in Delhi (Effective 1 October 2024):

अति-कुशल श्रमिकों के लिए दिल्ली न्यूनतम वेतन (1 अक्टूबर 2024 से प्रभावी):

Daily Rate (प्रतिदिन दर): ₹989.00 per day
Monthly Rate (मासिक दर): ₹25,714.00 per month (for 26 working days)

Highly Skilled workers include: Supervisors, Foremen, Senior Electricians, Auto CAD Operators, CNC Machine Operators, Senior Accountants.

अति-कुशल में शामिल: सुपरवाइजर, फोरमैन, सीनियर इलेक्ट्रीशियन।

Legal Reference: Minimum Wages Act, 1948 Section 3(1)(b): Where minimum wages have been fixed under this section in respect of any scheduled employment, the employer shall pay to every employee engaged in a scheduled employment under him wages at a rate not less than the minimum rate of wages fixed.`,
    tags: ['highly-skilled', 'supervisor', 'minimum wage', 'न्यूनतम वेतन', 'अति-कुशल'],
  },

  // ── Overtime & Special Provisions ─────────────────────────────────────────
  {
    id: 'mw-overtime-provisions-oct2024',
    category: 'minimum_wage',
    subCategory: 'overtime',
    source: 'Delhi Labour Department',
    statute: 'Minimum Wages Act, 1948, Section 14; Factories Act, 1948, Section 59',
    effectiveDate: '2024-10-01',
    language: 'bilingual',
    content: `Overtime Wage Rules in Delhi:

ओवरटाइम वेतन नियम (दिल्ली):

Any worker working beyond 8 hours per day or 48 hours per week is entitled to overtime wages at DOUBLE the ordinary rate of wages.

यदि कोई श्रमिक प्रतिदिन 8 घंटे या प्रति सप्ताह 48 घंटे से अधिक काम करता है, तो उसे सामान्य वेतन का दोगुना मिलना चाहिए।

Legal Reference: Section 14 of the Minimum Wages Act, 1948 states: "Where an employee whose minimum rate of wages is fixed works on any day for more than such number of hours as may be prescribed, he shall be entitled to receive wages in respect of overtime work done by him at the overtime rate."

Additional Protection: Section 59 of the Factories Act, 1948 mandates double wages for overtime beyond 9 hours in a day or 48 hours in a week for factory workers.

How to complain: If you are not paid overtime, file Form VI with the Labour Enforcement Officer of your jurisdiction.`,
    tags: ['overtime', 'double wage', 'ओवरटाइम', 'अतिरिक्त समय', '8 hours'],
  },

  // ── Wage Payment Rules ─────────────────────────────────────────────────────
  {
    id: 'mw-payment-rules',
    category: 'minimum_wage',
    subCategory: 'payment_rules',
    source: 'Payment of Wages Act, 1936',
    statute: 'Payment of Wages Act, 1936, Sections 3, 4, 5',
    effectiveDate: '2024-01-01',
    language: 'bilingual',
    content: `Wage Payment Rules — When Must Employers Pay?

वेतन भुगतान नियम — नियोक्ता कब वेतन देना अनिवार्य है?

Under the Payment of Wages Act, 1936:

1. Workers in establishments with fewer than 1000 employees: wages must be paid by the 7th of the following month.
   1000 से कम कर्मचारियों वाले प्रतिष्ठान: अगले महीने की 7 तारीख तक वेतन अनिवार्य।

2. Larger establishments (1000+ workers): wages must be paid by the 10th of the following month.
   1000+ कर्मचारियों वाले: 10 तारीख तक।

3. Wages must be paid in legal tender (cash or bank transfer). Deductions from wages are strictly regulated under Section 7.

4. Unauthorized deductions are prohibited. Permitted deductions include: PF, ESI, advance repayment, fines (capped at 3% of wages in any wage period).

5. Wage slip (वेतन पर्ची) must be given to every worker in writing or electronically.

If wages are withheld or delayed, you can file a complaint under Section 15 at the Labour Court or District Labour Office.

शिकायत कहाँ करें: अपने जिला श्रम कार्यालय में या श्रम न्यायालय में धारा 15 के तहत।`,
    tags: ['wage payment', 'salary delay', 'वेतन भुगतान', 'वेतन देरी', 'deductions'],
  },
];

module.exports = { MINIMUM_WAGE_DOCUMENTS };
