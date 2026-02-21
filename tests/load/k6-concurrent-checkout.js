/**
 * k6 Load Test: Concurrent Ticket Checkout
 * 
 * Scenario: 200 concurrent users trying to buy tickets for an event with 50 available
 * Expected: Exactly 50 succeed, 150 get "INSUFFICIENT_TICKETS"
 * 
 * Run: k6 run --vus 200 --duration 30s tests/load/k6-concurrent-checkout.js
 * 
 * Environment variables:
 *   SUPABASE_URL          - Your Supabase project URL
 *   SUPABASE_ANON_KEY     - Your Supabase anon key  
 *   TEST_EVENT_ID         - Event ID with ticket tiers to test
 *   TEST_TIER_ID          - Tier ID with exactly 50 tickets available
 *   TEST_USER_TOKEN       - A valid auth token for testing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const successfulCheckouts = new Counter('successful_checkouts');
const failedCheckouts = new Counter('failed_checkouts');
const lockTimeouts = new Counter('lock_timeouts');
const insufficientTickets = new Counter('insufficient_tickets');
const checkoutDuration = new Trend('checkout_duration_ms');
const errorRate = new Rate('checkout_error_rate');

export const options = {
  scenarios: {
    spike: {
      executor: 'shared-iterations',
      vus: 200,
      iterations: 200,
      maxDuration: '60s',
    },
  },
  thresholds: {
    'checkout_error_rate': ['rate<0.80'], // At most 80% fail (since only 50/200 should succeed)
    'checkout_duration_ms': ['p(95)<10000'], // p95 under 10s
    'successful_checkouts': ['count<=50'], // CRITICAL: Never more than 50 successes
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://iasahlgurfxufrtdigcr.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const EVENT_ID = __ENV.TEST_EVENT_ID || '';
const TIER_ID = __ENV.TEST_TIER_ID || '';
const USER_TOKEN = __ENV.TEST_USER_TOKEN || '';

export default function () {
  const url = `${SUPABASE_URL}/functions/v1/create-ticket-checkout`;

  const payload = JSON.stringify({
    eventId: EVENT_ID,
    items: [{ tierId: TIER_ID, quantity: 1 }],
    customerName: `LoadTest User ${__VU}`,
    customerEmail: `loadtest-${__VU}-${__ITER}@test.com`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${USER_TOKEN}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const res = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  checkoutDuration.add(duration);

  const body = res.json();

  if (res.status === 200 && body.success !== false && !body.error) {
    successfulCheckouts.add(1);
    errorRate.add(false);
    console.log(`VU ${__VU}: SUCCESS (${duration}ms) - orderId: ${body.orderId}`);
  } else {
    failedCheckouts.add(1);
    errorRate.add(true);

    const errorMsg = body.error || '';
    if (errorMsg.includes('INSUFFICIENT_TICKETS') || errorMsg.includes('Not enough tickets')) {
      insufficientTickets.add(1);
    } else if (errorMsg.includes('LOCK_TIMEOUT') || errorMsg.includes('Server busy')) {
      lockTimeouts.add(1);
    }
    
    console.log(`VU ${__VU}: FAIL (${duration}ms) - ${errorMsg.substring(0, 80)}`);
  }

  sleep(0.1);
}

export function handleSummary(data) {
  const successCount = data.metrics.successful_checkouts?.values?.count || 0;
  const failCount = data.metrics.failed_checkouts?.values?.count || 0;
  const lockTimeoutCount = data.metrics.lock_timeouts?.values?.count || 0;
  const p95 = data.metrics.checkout_duration_ms?.values?.['p(95)'] || 0;

  const summary = {
    test: 'Concurrent Ticket Checkout',
    totalRequests: successCount + failCount,
    successful: successCount,
    failed: failCount,
    lockTimeouts: lockTimeoutCount,
    p95_ms: Math.round(p95),
    verdict: successCount <= 50 ? '✅ PASS - No overselling' : '❌ FAIL - OVERSELLING DETECTED',
  };

  console.log('\n' + JSON.stringify(summary, null, 2));

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'tests/load/results/checkout-results.json': JSON.stringify(summary, null, 2),
  };
}
