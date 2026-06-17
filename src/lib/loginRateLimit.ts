import { redis } from './redis';

/**
 * Brute-force protection for the credentials login.
 *
 * Failed attempts are counted per account (e-mail) and per client IP in a
 * fixed window. Counters live in Redis so they survive restarts and are
 * shared across instances; when Redis is unavailable we fall back to a
 * per-process in-memory map so the protection degrades instead of vanishing.
 */

const WINDOW_SECONDS = 15 * 60;
/** Failed attempts per account before the account is locked for the window. */
const MAX_PER_EMAIL = 5;
/** Failed attempts per IP before the IP is locked (credential stuffing across accounts). */
const MAX_PER_IP = 30;

// In-memory fallback (best effort, per process).
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryGet(key: string): number {
  const entry = memory.get(key);
  if (!entry || entry.resetAt < Date.now()) return 0;
  return entry.count;
}

function memoryIncr(key: string): void {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
  } else {
    entry.count += 1;
  }
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (memory.size > 10_000) {
    for (const [k, v] of memory) {
      if (v.resetAt < now) memory.delete(k);
    }
  }
}

function keys(email: string, ip: string | null): { emailKey: string; ipKey: string | null } {
  return {
    emailKey: `login:fail:email:${email}`,
    ipKey: ip ? `login:fail:ip:${ip}` : null,
  };
}

/** True when the account or the client IP has exceeded its failed-attempt budget. */
export async function isLoginBlocked(email: string, ip: string | null): Promise<boolean> {
  const { emailKey, ipKey } = keys(email, ip);
  try {
    const [emailCount, ipCount] = await Promise.all([
      redis.get(emailKey),
      ipKey ? redis.get(ipKey) : Promise.resolve(null),
    ]);
    return Number(emailCount ?? 0) >= MAX_PER_EMAIL || Number(ipCount ?? 0) >= MAX_PER_IP;
  } catch {
    return memoryGet(emailKey) >= MAX_PER_EMAIL || (ipKey !== null && memoryGet(ipKey) >= MAX_PER_IP);
  }
}

/** Records a failed login attempt for the account and the client IP. */
export async function registerFailedLogin(email: string, ip: string | null): Promise<void> {
  const { emailKey, ipKey } = keys(email, ip);
  try {
    const pipeline = redis.pipeline().incr(emailKey).expire(emailKey, WINDOW_SECONDS, 'NX');
    if (ipKey) pipeline.incr(ipKey).expire(ipKey, WINDOW_SECONDS, 'NX');
    await pipeline.exec();
  } catch {
    memoryIncr(emailKey);
    if (ipKey) memoryIncr(ipKey);
  }
}

/** Clears the account counter after a successful login (IP counter keeps its window). */
export async function clearLoginFailures(email: string): Promise<void> {
  const { emailKey } = keys(email, null);
  memory.delete(emailKey);
  try {
    await redis.del(emailKey);
  } catch {
    // Redis unavailable - the in-memory entry is already cleared.
  }
}
