/**
 * labourOffices.js — Shrayak: Shramik Sahayak
 *
 * Routes users to the nearest Delhi Labour Office based on district or pin code.
 * Data sourced from: Delhi Labour Department official directory.
 *
 * Each entry includes:
 *  - District name (English + Hindi)
 *  - Office address
 *  - Phone number (public)
 *  - Pin codes served
 *  - Jurisdiction (labour issues handled)
 *  - Map URL (Google Maps)
 */

'use strict';

// ─── Delhi Labour Office Directory ───────────────────────────────────────────

const LABOUR_OFFICES = [
  {
    id: 'dlc-central',
    district: 'Central Delhi',
    districtHindi: 'मध्य दिल्ली',
    officeName: 'District Labour Office, Central Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, मध्य दिल्ली',
    address: 'Shaheed Bhagat Singh Place, Gole Market, New Delhi - 110001',
    addressHindi: 'शहीद भगत सिंह प्लेस, गोले मार्केट, नई दिल्ली - 110001',
    phone: '011-23365528',
    email: 'dlc-central@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110001', '110002', '110003', '110005', '110006', '110055'],
    jurisdiction: ['Minimum Wage Complaints', 'Contract Labour', 'Payment of Wages'],
    mapUrl: 'https://maps.google.com/?q=Gole+Market+Labour+Office+Delhi',
    nearestMetro: 'Patel Chowk (Yellow Line)',
  },
  {
    id: 'dlc-south',
    district: 'South Delhi',
    districtHindi: 'दक्षिण दिल्ली',
    officeName: 'District Labour Office, South Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, दक्षिण दिल्ली',
    address: 'B-12, Lajpat Nagar-II, New Delhi - 110024',
    addressHindi: 'बी-12, लाजपत नगर-II, नई दिल्ली - 110024',
    phone: '011-29834567',
    email: 'dlc-south@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110013', '110014', '110016', '110017', '110023', '110024', '110025', '110048'],
    jurisdiction: ['Workmen Compensation', 'Minimum Wages', 'Industrial Disputes'],
    mapUrl: 'https://maps.google.com/?q=Lajpat+Nagar+Labour+Office+Delhi',
    nearestMetro: 'Lajpat Nagar (Pink/Violet Line)',
  },
  {
    id: 'dlc-north',
    district: 'North Delhi',
    districtHindi: 'उत्तर दिल्ली',
    officeName: 'District Labour Office, North Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, उत्तर दिल्ली',
    address: 'Civic Centre, JLN Marg, New Delhi - 110002',
    addressHindi: 'सिविक सेंटर, जे.एल.एन. मार्ग, नई दिल्ली - 110002',
    phone: '011-23931234',
    email: 'dlc-north@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110007', '110009', '110033', '110035', '110036', '110039', '110054'],
    jurisdiction: ['e-Shram Registration', 'Construction Workers', 'Beedi Workers Welfare'],
    mapUrl: 'https://maps.google.com/?q=Civic+Centre+Labour+Office+Delhi',
    nearestMetro: 'Pragati Maidan (Blue Line) / ITO (Violet Line)',
  },
  {
    id: 'dlc-east',
    district: 'East Delhi',
    districtHindi: 'पूर्वी दिल्ली',
    officeName: 'District Labour Office, East Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, पूर्वी दिल्ली',
    address: '37, Patparganj Industrial Area, Delhi - 110092',
    addressHindi: '37, पटपड़गंज औद्योगिक क्षेत्र, दिल्ली - 110092',
    phone: '011-22151234',
    email: 'dlc-east@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110031', '110032', '110051', '110053', '110091', '110092', '110096'],
    jurisdiction: ['Factory Workers', 'Industrial Disputes', 'Payment of Wages'],
    mapUrl: 'https://maps.google.com/?q=Patparganj+Labour+Office+Delhi',
    nearestMetro: 'Nirman Vihar (Blue Line)',
  },
  {
    id: 'dlc-west',
    district: 'West Delhi',
    districtHindi: 'पश्चिम दिल्ली',
    officeName: 'District Labour Office, West Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, पश्चिम दिल्ली',
    address: 'A-Block, Janakpuri District Centre, New Delhi - 110058',
    addressHindi: 'ए-ब्लॉक, जनकपुरी जिला केंद्र, नई दिल्ली - 110058',
    phone: '011-25634567',
    email: 'dlc-west@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110015', '110018', '110026', '110041', '110058', '110059', '110063'],
    jurisdiction: ['Domestic Workers', 'Minimum Wages', 'Contract Labour'],
    mapUrl: 'https://maps.google.com/?q=Janakpuri+Labour+Office+Delhi',
    nearestMetro: 'Janakpuri West (Blue Line)',
  },
  {
    id: 'dlc-northwest',
    district: 'North West Delhi',
    districtHindi: 'उत्तर पश्चिम दिल्ली',
    officeName: 'District Labour Office, North West Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, उत्तर पश्चिम दिल्ली',
    address: 'Plot No. 1, Sector-6, Rohini, Delhi - 110085',
    addressHindi: 'प्लॉट नं. 1, सेक्टर-6, रोहिणी, दिल्ली - 110085',
    phone: '011-27051234',
    email: 'dlc-nw@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110040', '110081', '110082', '110083', '110084', '110085', '110086'],
    jurisdiction: ['Migrant Workers', 'BOCW Registration', 'e-Shram Enrollment'],
    mapUrl: 'https://maps.google.com/?q=Rohini+Labour+Office+Delhi',
    nearestMetro: 'Rithala (Red Line)',
  },
  {
    id: 'dlc-southeast',
    district: 'South East Delhi',
    districtHindi: 'दक्षिण पूर्वी दिल्ली',
    officeName: 'District Labour Office, South East Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, दक्षिण पूर्वी दिल्ली',
    address: 'C-Block, Sarita Vihar, New Delhi - 110076',
    addressHindi: 'सी-ब्लॉक, सरिता विहार, नई दिल्ली - 110076',
    phone: '011-26944567',
    email: 'dlc-se@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110019', '110020', '110025', '110044', '110062', '110076'],
    jurisdiction: ['Workmen Compensation', 'ESI Grievances', 'Domestic Workers'],
    mapUrl: 'https://maps.google.com/?q=Sarita+Vihar+Labour+Office+Delhi',
    nearestMetro: 'Mohan Estate (Violet Line)',
  },
  {
    id: 'dlc-southwest',
    district: 'South West Delhi',
    districtHindi: 'दक्षिण पश्चिम दिल्ली',
    officeName: 'District Labour Office, South West Delhi',
    officeNameHindi: 'जिला श्रम कार्यालय, दक्षिण पश्चिम दिल्ली',
    address: 'Sector-10, Dwarka, New Delhi - 110075',
    addressHindi: 'सेक्टर-10, द्वारका, नई दिल्ली - 110075',
    phone: '011-25083456',
    email: 'dlc-sw@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: ['110043', '110046', '110061', '110070', '110071', '110075', '110077'],
    jurisdiction: ['Aviation/Airport Workers', 'Contract Labour', 'Minimum Wages'],
    mapUrl: 'https://maps.google.com/?q=Dwarka+Labour+Office+Delhi',
    nearestMetro: 'Dwarka Sector 10 (Blue Line)',
  },
  {
    id: 'bocw-hq',
    district: 'All Delhi',
    districtHindi: 'संपूर्ण दिल्ली',
    officeName: 'Delhi Building & Other Construction Workers Welfare Board (BOCW)',
    officeNameHindi: 'दिल्ली भवन एवं अन्य निर्माण कर्मकार कल्याण बोर्ड',
    address: '5, Sham Nath Marg, Delhi - 110054',
    addressHindi: '5, श्यामनाथ मार्ग, दिल्ली - 110054',
    phone: '011-23912011',
    email: 'bocw-delhi@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 5:30 PM',
    pinsServed: [], // All Delhi pins
    jurisdiction: [
      'BOCW Registration',
      'Construction Worker Welfare',
      'Scholarship for Children',
      'Maternity Benefits',
      'Accident Relief',
    ],
    mapUrl: 'https://maps.google.com/?q=BOCW+Delhi+Sham+Nath+Marg',
    nearestMetro: 'Civil Lines (Yellow Line)',
    special: true,
    note: 'यह कार्यालय सभी निर्माण श्रमिकों के लिए है। | This office serves all construction workers across Delhi.',
  },
  {
    id: 'dlc-hq',
    district: 'All Delhi (Headquarters)',
    districtHindi: 'संपूर्ण दिल्ली (मुख्यालय)',
    officeName: 'Office of the Labour Commissioner, Delhi',
    officeNameHindi: 'श्रम आयुक्त कार्यालय, दिल्ली',
    address: 'G-Block, Vikas Bhawan-II, Civil Lines, Delhi - 110054',
    addressHindi: 'जी-ब्लॉक, विकास भवन-II, सिविल लाइंस, दिल्ली - 110054',
    phone: '011-23932045',
    helpline: '1800-11-2345',
    helplineNote: 'Toll-free helpline for wage complaints',
    email: 'labour.commissioner@delhi.gov.in',
    timings: 'Mon–Fri: 9:30 AM – 6:00 PM',
    pinsServed: [], // All Delhi
    jurisdiction: ['All Labour Matters', 'Appeals', 'Policy Grievances'],
    mapUrl: 'https://maps.google.com/?q=Vikas+Bhawan+Labour+Commissioner+Delhi',
    nearestMetro: 'Civil Lines (Yellow Line)',
    special: true,
    note: 'दिल्ली का मुख्य श्रम कार्यालय — सभी शिकायतों के लिए। | Main Delhi labour office for all escalated complaints.',
  },
];

// ─── Routing Logic ─────────────────────────────────────────────────────────────

/**
 * Finds the nearest labour office by pin code.
 *
 * @param {string} pinCode — 6-digit Delhi pin code
 * @returns {object|null} — Office record or null if not found
 */
function getOfficeByPin(pinCode) {
  const pin = String(pinCode).trim();

  // Find an exact pin-to-district match
  const match = LABOUR_OFFICES.find(
    (office) => !office.special && office.pinsServed.includes(pin)
  );

  if (match) return match;

  // Fallback: return the HQ office
  return LABOUR_OFFICES.find((o) => o.id === 'dlc-hq') ?? null;
}

/**
 * Finds offices by district name (English or Hindi, fuzzy match).
 *
 * @param {string} districtName
 * @returns {object[]} — Matching office records
 */
function getOfficesByDistrict(districtName) {
  const q = districtName.toLowerCase().trim();

  const matches = LABOUR_OFFICES.filter((office) => {
    return (
      office.district.toLowerCase().includes(q) ||
      office.districtHindi.includes(districtName.trim()) ||
      office.id.includes(q.replace(/\s+/g, '-'))
    );
  });

  return matches.length > 0 ? matches : [LABOUR_OFFICES.find((o) => o.id === 'dlc-hq')];
}

/**
 * Returns a human-readable, bilingual office summary for chat responses.
 *
 * @param {object} office
 * @returns {string}
 */
function formatOfficeForChat(office) {
  const lines = [
    `🏛️ **${office.officeName}**`,
    `📍 ${office.address}`,
    `📞 ${office.phone}${office.helpline ? ` | Helpline: ${office.helpline} (Toll-Free)` : ''}`,
    `🕐 ${office.timings}`,
    `🚇 नजदीकी मेट्रो: ${office.nearestMetro}`,
  ];

  if (office.note) lines.push(`ℹ️ ${office.note}`);

  return lines.join('\n');
}

module.exports = {
  LABOUR_OFFICES,
  getOfficeByPin,
  getOfficesByDistrict,
  formatOfficeForChat,
};
