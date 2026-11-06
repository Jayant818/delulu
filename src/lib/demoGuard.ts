// Server-only. Reserve before calling a paid model; failed calls still consume quota.
const DAY = 86_400_000;
const IST = 330 * 60_000;
type Client = { day: number; daily: number; start: number; burst: number };
export type DemoUsage = { day: number; total: number; by: Map<string, Client> };

function limit(name: string, fallback: number, min = 0): number {
  const raw = process.env[name]?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isSafeInteger(n) && n >= min && n <= Number.MAX_SAFE_INTEGER / 1000 ? n : fallback;
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Synchronous reservation: zero means allowed, otherwise seconds until all exhausted limits reset. */
export function reserveDemo(u: DemoUsage, key: string, now: number): number {
  if (process.env.DEMO_GUARD === "off") return 0;
  const window = limit("DEMO_GUARD_BURST_WINDOW_SEC", 600, 1) * 1000;
  const day = Math.floor((now + IST) / DAY);
  if (u.day !== day) {
    u.day = day;
    u.total = 0;
    // Retain bursts crossing midnight; discard inactive clients so memory stays bounded.
    for (const [k, c] of u.by) if (c.start + window <= now) u.by.delete(k);
  }
  const old = u.by.get(key);
  const c: Client = {
    day,
    daily: old?.day === day ? old.daily : 0,
    start: old && old.start + window > now ? old.start : now,
    burst: old && old.start + window > now ? old.burst : 0,
  };
  let until = 0;
  if (u.total >= limit("DEMO_GUARD_GLOBAL_PER_DAY", 3000) || c.daily >= limit("DEMO_GUARD_PER_DAY", 150)) {
    until = (day + 1) * DAY - IST;
  }
  if (c.burst >= limit("DEMO_GUARD_BURST", 20)) until = Math.max(until, c.start + window);
  if (until) return Math.max(1, Math.ceil((until - now) / 1000));
  c.daily++;
  c.burst++;
  u.total++;
  u.by.set(key, c);
  return 0;
}

// ponytail: counters hold per serverless instance, not globally, and reset on restart. Upgrade to Upstash/Vercel KV INCR for a global cap.
// globalThis shares the reservation across route bundles within one process.
const shared = globalThis as typeof globalThis & { deluluDemoUsage?: DemoUsage };
const usage = (shared.deluluDemoUsage ??= { day: -1, total: 0, by: new Map() });

export function demoRetryAfter(headers: Headers): number {
  return reserveDemo(usage, clientKey(headers), Date.now());
}
