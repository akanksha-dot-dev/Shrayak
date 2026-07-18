/**
 * seedWorkers.js
 * Executable script to seed the Worker Registry in Elasticsearch.
 */

'use strict';

require('dotenv').config();
const { seedWorkerRegistry } = require('./workerRegistry');

async function main() {
  console.log('Starting Worker Registry seeding...');
  await seedWorkerRegistry();
  console.log('Seeding finished.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
