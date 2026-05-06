/**
 * Garment ERP — k6 Load Test
 *
 * Scenarios:
 *   smoke    →  5 VUs,    1 min   — quick health check
 *   load     →  0→30 VUs, 14 min  — normal business-hours traffic
 *   stress   →  0→200 VUs,13 min  — find the breaking point
 *   scale100k→  0→100 VUs,20 min  — distributed cloud test (Grafana free tier cap)
 *
 * Traffic distribution (per VU iteration):
 *   40% — factory browse    (public, real 17-field query, no limit)
 *   20% — quote list        (authenticated)
 *   15% — CRM order list    (authenticated)
 *   10% — admin RFQ list    (admin token, all quotes select *)
 *   10% — admin CRM list    (admin token, all crm_orders select *)
 *    5% — analytics load    (admin token, user_events up to 10k rows)
 *
 * Run commands:
 *   npm run load:smoke
 *   npm run load:test
 *   npm run load:stress
 *   npm run load:100k          ← use run.sh, not k6 directly
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────
const errorRate            = new Rate('error_rate');
const factoryLatency       = new Trend('factory_list_duration',    true);
const quotesLatency        = new Trend('quotes_list_duration',     true);
const crmLatency           = new Trend('crm_orders_duration',      true);
const adminRfqLatency      = new Trend('admin_rfq_duration',       true);
const adminCrmLatency      = new Trend('admin_crm_duration',       true);
const analyticsLatency     = new Trend('analytics_duration',       true);
const totalRequests        = new Counter('total_requests');
const skippedAuth          = new Counter('skipped_auth_requests');
const skippedAdmin         = new Counter('skipped_admin_requests');

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = __ENV.SUPABASE_URL       || 'https://nhvbnfpzykdokqcnljth.supabase.co';
const ANON_KEY      = __ENV.SUPABASE_ANON_KEY  || '';
const USER_TOKEN    = __ENV.USER_TOKEN         || '';
const ADMIN_TOKEN   = __ENV.ADMIN_TOKEN        || '';
const SCENARIO      = __ENV.SCENARIO           || 'smoke';

// ─── Scenario definitions ──────────────────────────────────────────────────
const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '1m',
    exec: 'default',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 30 },
      { duration: '5m', target: 30 },
      { duration: '2m', target: 0  },
    ],
    exec: 'default',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20  },
      { duration: '3m', target: 50  },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 200 },
      { duration: '2m', target: 0   },
    ],
    exec: 'default',
  },
  scale100k: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '3m',  target: 25  },
      { duration: '3m',  target: 50  },
      { duration: '3m',  target: 75  },
      { duration: '3m',  target: 100 },
      { duration: '5m',  target: 100 },
      { duration: '3m',  target: 0   },
    ],
    exec: 'default',
  },
};

// ─── SLA thresholds ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    default: SCENARIOS[SCENARIO],
  },
  thresholds: {
    http_req_failed:       ['rate<0.05'],    // < 5% HTTP errors
    error_rate:            ['rate<0.05'],    // < 5% check failures
    http_req_duration:     ['p(95)<2000'],   // all requests p95 < 2s
    factory_list_duration: ['p(95)<2000'],   // real 17-field no-limit query
    quotes_list_duration:  ['p(95)<1500'],
    crm_orders_duration:   ['p(95)<1500'],
    admin_rfq_duration:    ['p(95)<3000'],   // select * on quotes — heavier
    admin_crm_duration:    ['p(95)<3000'],   // select * on crm_orders
    analytics_duration:    ['p(95)<5000'],   // 10k user_events rows
  },
};

// ─── Headers ───────────────────────────────────────────────────────────────
function anonHeaders() {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

function authHeaders() {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${USER_TOKEN}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

function adminHeaders() {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

// ─── REST helper ───────────────────────────────────────────────────────────
function supabaseGet(path, headers, label) {
  const start = Date.now();
  const res = http.get(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers,
    tags: { name: label },
  });
  const duration = Date.now() - start;
  totalRequests.add(1);

  const ok = check(res, {
    [`${label}: http 200`]:      (r) => r.status === 200,
    [`${label}: returns array`]: (r) => {
      try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
    },
  });
  errorRate.add(ok ? 0 : 1);
  return { res, duration, ok };
}

// ─── Main virtual user function ────────────────────────────────────────────
export default function userJourney() {
  const roll = Math.random();

  if (roll < 0.40) {
    // ── 40%: Factory browse — REAL production query (no limit, 17 fields) ──
    group('factory_browsing', () => {
      const { duration } = supabaseGet(
        'factories?select=id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate&order=created_at.desc',
        anonHeaders(),
        'factory_list'
      );
      factoryLatency.add(duration);
      sleep(randomBetween(2, 6));
    });

  } else if (roll < 0.60) {
    // ── 20%: Buyer checking quotes (authenticated) ─────────────────────────
    if (!USER_TOKEN) {
      skippedAuth.add(1);
      group('factory_browsing', () => {
        const { duration } = supabaseGet(
          'factories?select=id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate&order=created_at.desc',
          anonHeaders(),
          'factory_list'
        );
        factoryLatency.add(duration);
        sleep(randomBetween(2, 6));
      });
    } else {
      group('quote_checking', () => {
        const { duration } = supabaseGet(
          'quotes?select=id,status,created_at,factory_id&order=created_at.desc&limit=20',
          authHeaders(),
          'quotes_list'
        );
        quotesLatency.add(duration);
        sleep(randomBetween(3, 8));
      });
    }

  } else if (roll < 0.75) {
    // ── 15%: CRM order tracking (authenticated) ────────────────────────────
    if (!USER_TOKEN) {
      skippedAuth.add(1);
      group('factory_browsing', () => {
        const { duration } = supabaseGet(
          'factories?select=id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate&order=created_at.desc',
          anonHeaders(),
          'factory_list'
        );
        factoryLatency.add(duration);
        sleep(randomBetween(2, 6));
      });
    } else {
      group('crm_tracking', () => {
        const { duration } = supabaseGet(
          'crm_orders?select=id,status,created_at,factory_id&order=created_at.desc&limit=20',
          authHeaders(),
          'crm_orders'
        );
        crmLatency.add(duration);
        sleep(randomBetween(5, 12));
      });
    }

  } else if (roll < 0.85) {
    // ── 10%: Admin RFQ list — real production query (select *, no limit) ───
    if (!ADMIN_TOKEN) {
      skippedAdmin.add(1);
      group('factory_browsing', () => {
        const { duration } = supabaseGet(
          'factories?select=id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate&order=created_at.desc',
          anonHeaders(),
          'factory_list'
        );
        factoryLatency.add(duration);
        sleep(randomBetween(2, 5));
      });
    } else {
      group('admin_rfq', () => {
        const { duration } = supabaseGet(
          'quotes?select=*&order=created_at.desc',
          adminHeaders(),
          'admin_rfq'
        );
        adminRfqLatency.add(duration);
        sleep(randomBetween(3, 8));
      });
    }

  } else if (roll < 0.95) {
    // ── 10%: Admin CRM list — real production query (select *, no limit) ───
    if (!ADMIN_TOKEN) {
      skippedAdmin.add(1);
      group('factory_browsing', () => {
        const { duration } = supabaseGet(
          'factories?select=id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate&order=created_at.desc',
          anonHeaders(),
          'factory_list'
        );
        factoryLatency.add(duration);
        sleep(randomBetween(2, 5));
      });
    } else {
      group('admin_crm', () => {
        const { duration } = supabaseGet(
          'crm_orders?select=*&order=created_at.desc',
          adminHeaders(),
          'admin_crm'
        );
        adminCrmLatency.add(duration);
        sleep(randomBetween(3, 8));
      });
    }

  } else {
    // ── 5%: Analytics — user_events up to 10k rows (admin only) ───────────
    if (!ADMIN_TOKEN) {
      skippedAdmin.add(1);
      group('factory_browsing', () => {
        const { duration } = supabaseGet(
          'factories?select=id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate&order=created_at.desc',
          anonHeaders(),
          'factory_list'
        );
        factoryLatency.add(duration);
        sleep(randomBetween(2, 5));
      });
    } else {
      group('analytics_load', () => {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { duration } = supabaseGet(
          `user_events?select=*&order=created_at.desc&gte=created_at.${since.toISOString()}&limit=10000`,
          adminHeaders(),
          'analytics'
        );
        analyticsLatency.add(duration);
        sleep(randomBetween(5, 15));
      });
    }
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────
export function setup() {
  const vuMap = {
    smoke:    '5 VUs (constant)',
    load:     '0 → 30 VUs (ramp)',
    stress:   '0 → 200 VUs (ramp)',
    scale100k:'0 → 100 VUs via Grafana Cloud (distributed)',
  };

  console.log(`\n${'═'.repeat(60)}`);
  console.log(` 🚀  Garment ERP Load Test`);
  console.log(`${'═'.repeat(60)}`);
  console.log(` Scenario:     ${SCENARIO.toUpperCase()}`);
  console.log(` VU profile:   ${vuMap[SCENARIO] || SCENARIO}`);
  console.log(` Supabase:     ${SUPABASE_URL}`);
  console.log(` User token:   ${USER_TOKEN   ? '✓ provided' : '✗ missing — auth endpoints will be skipped'}`);
  console.log(` Admin token:  ${ADMIN_TOKEN  ? '✓ provided' : '✗ missing — admin/analytics endpoints will be skipped'}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(` Traffic mix:`);
  console.log(`   40%  factory_list  (real 17-field query, no limit)`);
  console.log(`   20%  quotes_list   (authenticated)`);
  console.log(`   15%  crm_orders    (authenticated)`);
  console.log(`   10%  admin_rfq     (select * on quotes)`);
  console.log(`   10%  admin_crm     (select * on crm_orders)`);
  console.log(`    5%  analytics     (user_events up to 10k rows)`);
  console.log(`${'═'.repeat(60)}\n`);

  const res = http.get(
    `${SUPABASE_URL}/rest/v1/factories?limit=1`,
    { headers: anonHeaders() }
  );
  if (res.status === 200) {
    console.log('  Pre-flight ✅  Supabase reachable — starting test\n');
  } else {
    console.error(`  Pre-flight ❌  Status ${res.status} — check SUPABASE_URL and SUPABASE_ANON_KEY\n`);
  }
}

export function teardown() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(` ✅  Load test complete`);
  console.log(`${'═'.repeat(60)}\n`);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
