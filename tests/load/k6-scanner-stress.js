/**
 * k6 Load Test: Multiple Scanner Stress Test
 * 
 * Scenario: 5 scanners processing 500 QR scans in 3 minutes
 * Each scanner attempts to check-in unique tickets + some duplicates
 * Expected: 0 duplicate entries, deterministic "already used" responses
 * 
 * Run: k6 run --duration 3m tests/load/k6-scanner-stress.js
 * 
 * Environment variables:
 *   SUPABASE_URL        - Your Supabase project URL
 *   SUPABASE_ANON_KEY   - Your Supabase anon key
 *   TEST_BUSINESS_ID    - Business ID that owns the tickets
 *   TEST_SCANNER_TOKEN  - Auth token for a business staff member
 *   TEST_TICKET_TOKENS  - Comma-separated list of QR tokens to scan (at least 100)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const successScans = new Counter('successful_scans');
const alreadyUsedScans = new Counter('already_used_scans');
const errorScans = new Counter('error_scans');
const duplicateEntries = new Counter('duplicate_entries');
const scanDuration = new Trend('scan_duration_ms');
const scanErrorRate = new Rate('scan_error_rate');

export const options = {
  scenarios: {
    scanners: {
      executor: 'constant-vus',
      vus: 5,           // 5 concurrent scanners
      duration: '3m',   // 3 minute test
    },
  },
  thresholds: {
    'duplicate_entries': ['count==0'],       // CRITICAL: Zero duplicate check-ins
    'scan_duration_ms': ['p(95)<3000'],      // p95 under 3s
    'scan_error_rate': ['rate<0.01'],        // Less than 1% unexpected errors
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://iasahlgurfxufrtdigcr.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const BUSINESS_ID = __ENV.TEST_BUSINESS_ID || '';
const SCANNER_TOKEN = __ENV.TEST_SCANNER_TOKEN || '';
const TICKET_TOKENS = (__ENV.TEST_TICKET_TOKENS || '').split(',').filter(Boolean);

// Track which tokens have been successfully scanned (in-memory per VU)
const scannedTokens = {};

export default function () {
  if (TICKET_TOKENS.length === 0) {
    console.log('No ticket tokens provided. Set TEST_TICKET_TOKENS env var.');
    sleep(60);
    return;
  }

  // Pick a token — mix of new and already-scanned for duplicate testing
  const shouldDuplicate = Math.random() < 0.3; // 30% duplicate attempts
  let tokenIndex;
  
  if (shouldDuplicate && Object.keys(scannedTokens).length > 0) {
    // Pick a previously scanned token
    const scannedKeys = Object.keys(scannedTokens);
    tokenIndex = parseInt(scannedKeys[Math.floor(Math.random() * scannedKeys.length)]);
  } else {
    tokenIndex = Math.floor(Math.random() * TICKET_TOKENS.length);
  }

  const qrToken = TICKET_TOKENS[tokenIndex];

  const url = `${SUPABASE_URL}/functions/v1/validate-qr`;
  const payload = JSON.stringify({
    qrData: qrToken,
    businessId: BUSINESS_ID,
    language: 'en',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SCANNER_TOKEN}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    timeout: '10s',
  };

  const startTime = Date.now();
  const res = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  scanDuration.add(duration);

  if (res.status !== 200) {
    errorScans.add(1);
    scanErrorRate.add(true);
    console.log(`Scanner ${__VU}: HTTP ${res.status} (${duration}ms)`);
    sleep(0.2);
    return;
  }

  const body = res.json();
  scanErrorRate.add(false);

  if (body.success === true) {
    if (scannedTokens[tokenIndex]) {
      // This token was already scanned successfully — DUPLICATE!
      duplicateEntries.add(1);
      console.log(`🚨 DUPLICATE ENTRY on token ${tokenIndex}! Scanner ${__VU}`);
    } else {
      successScans.add(1);
      scannedTokens[tokenIndex] = true;
    }
  } else if (body.alreadyUsed || body.alreadyRedeemed || body.message?.includes('already')) {
    alreadyUsedScans.add(1);
    // Expected for duplicate scans — this is correct behavior
  } else {
    errorScans.add(1);
    console.log(`Scanner ${__VU}: Unexpected: ${body.message} (${duration}ms)`);
  }

  // Simulate realistic scan interval (0.3-1s between scans)
  sleep(0.3 + Math.random() * 0.7);
}

export function handleSummary(data) {
  const successCount = data.metrics.successful_scans?.values?.count || 0;
  const alreadyUsed = data.metrics.already_used_scans?.values?.count || 0;
  const errors = data.metrics.error_scans?.values?.count || 0;
  const duplicates = data.metrics.duplicate_entries?.values?.count || 0;
  const p95 = data.metrics.scan_duration_ms?.values?.['p(95)'] || 0;
  const totalScans = successCount + alreadyUsed + errors;

  const summary = {
    test: 'Multi-Scanner Stress Test',
    duration: '3 minutes',
    scanners: 5,
    totalScans,
    successful: successCount,
    alreadyUsed,
    errors,
    duplicateEntries: duplicates,
    p95_ms: Math.round(p95),
    errorRate: totalScans > 0 ? ((errors / totalScans) * 100).toFixed(2) + '%' : '0%',
    verdict: duplicates === 0 ? '✅ PASS - Zero duplicate entries' : '❌ FAIL - DUPLICATE ENTRIES DETECTED',
  };

  console.log('\n' + JSON.stringify(summary, null, 2));

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'tests/load/results/scanner-results.json': JSON.stringify(summary, null, 2),
  };
}
