/**
 * In-memory account lockout — blocks IP after MAX_ATTEMPTS failed logins for LOCKOUT_DURATION_MS.
 * Works alongside Express rate-limit and Nginx rate-limit for triple-layer brute-force protection.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;
}

const store = new Map<string, LockoutEntry>();

// Cleanup old entries every 30 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      store.delete(key);
    }
  }
}, 30 * 60 * 1000);

export function isLocked(ip: string): boolean {
  const entry = store.get(ip);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    store.delete(ip);
    return false;
  }
  return true;
}

export function recordFailedAttempt(ip: string): void {
  const entry = store.get(ip) || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  store.set(ip, entry);
}

export function clearAttempts(ip: string): void {
  store.delete(ip);
}

export function getRemainingLockoutSeconds(ip: string): number {
  const entry = store.get(ip);
  if (!entry?.lockedUntil) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
}
