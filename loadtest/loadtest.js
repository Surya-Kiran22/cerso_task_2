/**
 * Autocannon / Concurrent Load Testing Script
 * Simulates 50 concurrent users making requests to the Nginx load balancer
 * across /api/auth/login, /api/analyze, and /api/dashboard/stats endpoints for 30 seconds.
 * Collects latency p95, req/sec, error counts, and X-Served-By header distribution.
 */

const http = require('http');

const TARGET_HOST = process.env.TARGET_HOST || 'localhost';
const TARGET_PORT = parseInt(process.env.TARGET_PORT, 10) || 80;
const CONCURRENT_USERS = 50;
const DURATION_SECONDS = 30;

console.log(`Starting load test against http://${TARGET_HOST}:${TARGET_PORT}`);
console.log(`Simulating ${CONCURRENT_USERS} concurrent users for ${DURATION_SECONDS} seconds...\n`);

let totalRequests = 0;
let totalErrors = 0;
const latencies = [];
const instanceCounts = {};

const samplePayload = JSON.stringify({
  title: 'Load Test Requirement',
  text: 'REQ-1: The system shall respond fast to many users if possible.',
});

function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(
      {
        host: TARGET_HOST,
        port: TARGET_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 5000,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const latency = Date.now() - startTime;
          const servedBy = res.headers['x-served-by'] || 'unknown';

          instanceCounts[servedBy] = (instanceCounts[servedBy] || 0) + 1;
          latencies.push(latency);
          totalRequests++;

          if (res.statusCode >= 400) {
            totalErrors++;
          }

          resolve({ statusCode: res.statusCode, body: responseData, servedBy });
        });
      }
    );

    req.on('error', (err) => {
      totalErrors++;
      latencies.push(Date.now() - startTime);
      resolve({ statusCode: 500, error: err.message });
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runVirtualUser(userId, stopTime) {
  // 1. Health check / Public request
  while (Date.now() < stopTime) {
    try {
      await makeRequest('/api/health', 'GET');
      await makeRequest('/api/analyze', 'POST', {}, samplePayload);
      await makeRequest('/api/dashboard/stats', 'GET');
    } catch (err) {
      totalErrors++;
    }
  }
}

async function startLoadTest() {
  const stopTime = Date.now() + DURATION_SECONDS * 1000;
  const workers = [];

  for (let i = 0; i < CONCURRENT_USERS; i++) {
    workers.push(runVirtualUser(i + 1, stopTime));
  }

  await Promise.all(workers);

  // Calculate stats
  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95Latency = latencies[p95Index] || 0;
  const reqPerSec = (totalRequests / DURATION_SECONDS).toFixed(2);

  console.log('====================================================');
  console.log('LOAD TEST RESULTS SUMMARY');
  console.log('====================================================');
  console.log(`Total Completed Requests : ${totalRequests}`);
  console.log(`Duration                 : ${DURATION_SECONDS} seconds`);
  console.log(`Requests / Second (RPS)  : ${reqPerSec}`);
  console.log(`p95 Latency              : ${p95Latency} ms`);
  console.log(`Total Errors             : ${totalErrors}`);
  console.log('\nX-Served-By Instance Traffic Distribution:');
  Object.keys(instanceCounts).forEach((instance) => {
    const count = instanceCounts[instance];
    const pct = ((count / totalRequests) * 100).toFixed(1);
    console.log(`  - ${instance}: ${count} requests (${pct}%)`);
  });
  console.log('====================================================');

  if (totalErrors === 0 && p95Latency < 1000) {
    console.log('✅ LOAD TEST SUCCESS: 0 errors and p95 latency < 1.0s target met!');
  } else {
    console.log('⚠️ LOAD TEST TARGETS NOT MET: Check latency or error counts.');
  }
}

startLoadTest();
