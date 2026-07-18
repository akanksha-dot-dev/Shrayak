/**
 * workerRegistry.js — Shrayak: Shramik Sahayak
 *
 * Implements the Delhi Worker / Labour Registry index in Elasticsearch.
 * Enables searching eShram workers, verifying minimum wage compliance,
 * and checking BOCW welfare board registration.
 */

'use strict';

const { getElasticClient } = require('./elasticConfig');

const WORKER_INDEX = 'delhi_workers';

const WORKER_MAPPING = {
  mappings: {
    properties: {
      uan:               { type: 'keyword' },
      name:              { type: 'text', fields: { keyword: { type: 'keyword' } } },
      nameHindi:         { type: 'text' },
      age:               { type: 'integer' },
      gender:            { type: 'keyword' },
      occupation:        { type: 'keyword' },
      occupationHindi:   { type: 'text' },
      skillCategory:     { type: 'keyword' }, // unskilled, semi-skilled, skilled
      stateOfOrigin:     { type: 'keyword' },
      stateOfOriginHindi:{ type: 'keyword' },
      aadhaarRedacted:   { type: 'keyword' },
      phoneRedacted:     { type: 'keyword' },
      registrationDate:  { type: 'date' },
      bocwRegistered:    { type: 'boolean' },
      currentEmployer:   { type: 'text' },
      dailyWagePaid:     { type: 'float' },
      location:          { type: 'geo_point' } // residence or site GPS
    }
  }
};

const SEED_WORKERS = [
  {
    uan: "1008-2345-9011",
    name: "Ramesh Kumar",
    nameHindi: "रमेश कुमार",
    age: 32,
    gender: "Male",
    occupation: "Construction Worker (Mason)",
    occupationHindi: "निर्माण श्रमिक (राजमिस्त्री)",
    skillCategory: "skilled",
    stateOfOrigin: "Bihar",
    stateOfOriginHindi: "बिहार",
    aadhaarRedacted: "XXXX-XXXX-9011",
    phoneRedacted: "XXXXXX5432",
    registrationDate: "2024-03-12",
    bocwRegistered: false,
    currentEmployer: "Sharma Builders, Sector-18 Rohini",
    dailyWagePaid: 800.00,
    location: { lat: 28.7195, lon: 77.1505 }
  },
  {
    uan: "1008-8833-2947",
    name: "Sita Devi",
    nameHindi: "सीता देवी",
    age: 29,
    gender: "Female",
    occupation: "Domestic Worker (Househelp)",
    occupationHindi: "घरेलू कामगार",
    skillCategory: "unskilled",
    stateOfOrigin: "Uttar Pradesh",
    stateOfOriginHindi: "उत्तर प्रदेश",
    aadhaarRedacted: "XXXX-XXXX-2947",
    phoneRedacted: "XXXXXX9876",
    registrationDate: "2024-01-18",
    bocwRegistered: false,
    currentEmployer: "Independent Apartments, Vasant Kunj",
    dailyWagePaid: 750.00,
    location: { lat: 28.5355, lon: 77.2872 }
  },
  {
    uan: "1008-4492-8822",
    name: "Priya Sharma",
    nameHindi: "प्रिया शर्मा",
    age: 26,
    gender: "Female",
    occupation: "Garment Worker (Tailor)",
    occupationHindi: "वस्त्र उद्योग श्रमिक (दर्जी)",
    skillCategory: "semi-skilled",
    stateOfOrigin: "Rajasthan",
    stateOfOriginHindi: "राजस्थान",
    aadhaarRedacted: "XXXX-XXXX-8822",
    phoneRedacted: "XXXXXX2312",
    registrationDate: "2025-02-14",
    bocwRegistered: false,
    currentEmployer: "Royal Apparels, Okhla Industrial Area",
    dailyWagePaid: 850.00,
    location: { lat: 28.5560, lon: 77.2540 }
  },
  {
    uan: "1008-1122-3344",
    name: "Mohan Lal",
    nameHindi: "मोहन लाल",
    age: 41,
    gender: "Male",
    occupation: "Electrician",
    occupationHindi: "बिजली मिस्त्री",
    skillCategory: "skilled",
    stateOfOrigin: "Madhya Pradesh",
    stateOfOriginHindi: "मध्य प्रदेश",
    aadhaarRedacted: "XXXX-XXXX-3344",
    phoneRedacted: "XXXXXX4433",
    registrationDate: "2023-11-05",
    bocwRegistered: true,
    currentEmployer: "Penta Contracts, Connaught Place",
    dailyWagePaid: 750.00,
    location: { lat: 28.6289, lon: 77.2074 }
  },
  {
    uan: "1008-5566-7788",
    name: "Sunita Bai",
    nameHindi: "सुनीता बाई",
    age: 35,
    gender: "Female",
    occupation: "Sweeper",
    occupationHindi: "सफाई कर्मचारी",
    skillCategory: "unskilled",
    stateOfOrigin: "Haryana",
    stateOfOriginHindi: "हरियाणा",
    aadhaarRedacted: "XXXX-XXXX-7788",
    phoneRedacted: "XXXXXX8877",
    registrationDate: "2024-05-22",
    bocwRegistered: false,
    currentEmployer: "Municipal Sanitation Partner, Civil Lines",
    dailyWagePaid: 680.00,
    location: { lat: 28.6680, lon: 77.2207 }
  },
  {
    uan: "1008-9900-1122",
    name: "Rajesh Singh",
    nameHindi: "राजेश सिंह",
    age: 38,
    gender: "Male",
    occupation: "Plumber",
    occupationHindi: "नलसाज़",
    skillCategory: "skilled",
    stateOfOrigin: "Bihar",
    stateOfOriginHindi: "बिहार",
    aadhaarRedacted: "XXXX-XXXX-1122",
    phoneRedacted: "XXXXXX2211",
    registrationDate: "2024-09-01",
    bocwRegistered: true,
    currentEmployer: "Metro Plumbing Services, Karol Bagh",
    dailyWagePaid: 950.00,
    location: { lat: 28.6508, lon: 77.1925 }
  },
  {
    uan: "1008-3344-5566",
    name: "Anita Yadav",
    nameHindi: "अनीता यादव",
    age: 28,
    gender: "Female",
    occupation: "Packer",
    occupationHindi: "पैकर",
    skillCategory: "semi-skilled",
    stateOfOrigin: "Uttar Pradesh",
    stateOfOriginHindi: "उत्तर प्रदेश",
    aadhaarRedacted: "XXXX-XXXX-5566",
    phoneRedacted: "XXXXXX6655",
    registrationDate: "2024-10-12",
    bocwRegistered: false,
    currentEmployer: "Delhi Logistics Hub, Patparganj",
    dailyWagePaid: 800.00,
    location: { lat: 28.6316, lon: 77.2927 }
  }
];

// Seed index
async function seedWorkerRegistry() {
  const client = getElasticClient();
  if (!client) return;

  try {
    const exists = await client.indices.exists({ index: WORKER_INDEX });
    if (exists) {
      await client.indices.delete({ index: WORKER_INDEX });
    }

    await client.indices.create({
      index: WORKER_INDEX,
      body: WORKER_MAPPING
    });

    console.log(`[workerRegistry] Created index '${WORKER_INDEX}'`);

    for (const w of SEED_WORKERS) {
      await client.index({
        index: WORKER_INDEX,
        id: w.uan,
        document: {
          ...w,
          '@indexed_at': new Date().toISOString()
        }
      });
      console.log(`  Indexed worker: ${w.name} (UAN: ${w.uan})`);
    }

    console.log(`[workerRegistry] Seed complete: ${SEED_WORKERS.length} records`);
  } catch (err) {
    console.error(`[workerRegistry] Seeding error:`, err);
  }
}

// Search workers by UAN or name
async function searchWorkers(query) {
  const client = getElasticClient();
  if (!client) return [];

  try {
    const isUan = /^\d{4}-\d{4}-\d{4}$/.test(query) || /^\d{12}$/.test(query);
    
    let queryBody;
    if (isUan) {
      let formattedUan = query;
      if (query.length === 12) {
        formattedUan = `${query.slice(0,4)}-${query.slice(4,8)}-${query.slice(8,12)}`;
      }
      queryBody = {
        term: { uan: formattedUan }
      };
    } else {
      queryBody = {
        multi_match: {
          query: query,
          fields: ['name^2', 'nameHindi^2', 'occupation', 'stateOfOrigin']
        }
      };
    }

    const res = await client.search({
      index: WORKER_INDEX,
      body: {
        query: queryBody,
        size: 5
      }
    });

    const hits = res.hits?.hits ?? [];
    return hits.map(hit => ({
      ...hit._source,
      score: hit._score
    }));
  } catch (err) {
    console.error(`[workerRegistry] Search error:`, err);
    return [];
  }
}

module.exports = {
  seedWorkerRegistry,
  searchWorkers,
  WORKER_INDEX
};
