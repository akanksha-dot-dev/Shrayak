/**
 * api.test.js — Shrayak Integration Test Suite
 * Automated verification of backend API endpoints and RAG agent services.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Start backend server in test mode
const app = require('../backend/server');

let server;
let baseUrl;

test.before((t, done) => {
  // Start server on ephemeral port for isolation
  server = app.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[TEST] Test server listening on ${baseUrl}`);
    done();
  });
});

test.after((t, done) => {
  if (server) {
    server.close(() => {
      done();
      process.exit(0);
    });
  } else {
    done();
    process.exit(0);
  }
});

// Helper for making HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('GET /api/health returns health status', async () => {
  const res = await request('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.ok(res.body.status);
  assert.ok(res.body.services);
  assert.equal(res.body.services.server.status, 'ok');
});

test('GET /api/personas returns demo worker personas', async () => {
  const res = await request('GET', '/api/personas');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.personas));
  assert.ok(res.body.personas.length > 0);
  assert.ok(res.body.personas[0].id);
  assert.ok(res.body.personas[0].name);
});

test('GET /api/schemes/check calculates welfare schemes eligibility', async () => {
  const path = '/api/schemes/check?age=28&gender=male&category=construction&dailyWage=450&bocw=false&eshram=true';
  const res = await request('GET', path);
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.totalEligible === 'number');
  assert.ok(Array.isArray(res.body.schemes));
  assert.ok(res.body.schemes.length > 0);
});

test('GET /api/offices/geo returns nearest labour office by pin code', async () => {
  const res = await request('GET', '/api/offices/geo?pin=110085');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.offices));
  assert.ok(res.body.offices.length > 0);
  assert.ok(res.body.offices[0].name || res.body.offices[0].district);
});

test('GET /api/workers searches eShram worker registry', async () => {
  const res = await request('GET', '/api/workers?q=Ramesh');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.workers));
});

test('GET /api/live-stats returns live stats aggregations', async () => {
  const res = await request('GET', '/api/live-stats');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.totalWorkers === 'number');
});

test('POST /api/chat processes legal query and returns grounded RAG response', async () => {
  const body = {
    query: 'दिल्ली में अकुशल श्रमिक का न्यूनतम वेतन क्या है?',
    language: 'hi',
  };
  const res = await request('POST', '/api/chat', body);
  assert.equal(res.status, 200);
  assert.ok(res.body.requestId);
  assert.ok(typeof res.body.response === 'string');
  assert.ok(res.body.response.length > 20);
  assert.ok(Array.isArray(res.body.citations));
});
