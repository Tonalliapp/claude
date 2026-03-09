/**
 * Account lockout using Redis — dual-key protection:
 *   - Per-IP: blocks brute-force from a single source
 *   - Per-account (email+username): blocks distributed attacks across rotating IPs
 *
 * Survives server restarts. Redis TTL handles auto-cleanup.
 */

import { redis } from '../config/redis';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes
const ATTEMPT_WINDOW_SECONDS = 10 * 60; // 10-minute sliding window for attempt counting

function ipKey(ip: string) {
  return `lockout:ip:${ip}`;
}

function accountKey(email: string, username: string) {
  return `lockout:acct:${email}:${username}`;
}

export async function isLocked(ip: string, email?: string, username?: string): Promise<boolean> {
  const keys = [ipKey(ip)];
  if (email && username) keys.push(accountKey(email, username));

  for (const key of keys) {
    const locked = await redis.get(`${key}:locked`);
    if (locked) return true;
  }
  return false;
}

export async function recordFailedAttempt(ip: string, email?: string, username?: string): Promise<void> {
  const keys = [ipKey(ip)];
  if (email && username) keys.push(accountKey(email, username));

  for (const key of keys) {
    const attemptsKey = `${key}:attempts`;
    const lockedKey = `${key}:locked`;

    const current = await redis.incr(attemptsKey);
    if (current === 1) {
      // First attempt — set sliding window expiry
      await redis.expire(attemptsKey, ATTEMPT_WINDOW_SECONDS);
    }

    if (current >= MAX_ATTEMPTS) {
      await redis.set(lockedKey, '1', 'EX', LOCKOUT_SECONDS);
      await redis.del(attemptsKey);
    }
  }
}

export async function clearAttempts(ip: string, email?: string, username?: string): Promise<void> {
  const keys = [ipKey(ip)];
  if (email && username) keys.push(accountKey(email, username));

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.del(`${key}:attempts`);
    pipeline.del(`${key}:locked`);
  }
  await pipeline.exec();
}

export async function getRemainingLockoutSeconds(ip: string, email?: string, username?: string): Promise<number> {
  const keys = [ipKey(ip)];
  if (email && username) keys.push(accountKey(email, username));

  let maxTtl = 0;
  for (const key of keys) {
    const ttl = await redis.ttl(`${key}:locked`);
    if (ttl > maxTtl) maxTtl = ttl;
  }
  return maxTtl;
}
