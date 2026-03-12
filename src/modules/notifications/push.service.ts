import webPush from 'web-push';
import { redis } from '../../config/redis';
import { env } from '../../config/env';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    `mailto:${env.VAPID_EMAIL}`,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
}

function subsKey(tenantId: string) {
  return `push-subs:${tenantId}`;
}

export async function subscribe(tenantId: string, userId: string, subscription: webPush.PushSubscription) {
  const entry = JSON.stringify({ userId, subscription });
  await redis.sadd(subsKey(tenantId), entry);
}

export async function unsubscribe(tenantId: string, endpoint: string) {
  const members = await redis.smembers(subsKey(tenantId));
  for (const m of members) {
    const parsed = JSON.parse(m) as { subscription: { endpoint: string } };
    if (parsed.subscription.endpoint === endpoint) {
      await redis.srem(subsKey(tenantId), m);
      break;
    }
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

export async function notifyTenant(tenantId: string, payload: PushPayload) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;

  const members = await redis.smembers(subsKey(tenantId));
  const data = JSON.stringify(payload);

  const stale: string[] = [];

  await Promise.allSettled(
    members.map(async (m) => {
      const { subscription } = JSON.parse(m) as { subscription: webPush.PushSubscription };
      try {
        await webPush.sendNotification(subscription, data);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          stale.push(m);
        }
      }
    }),
  );

  // Clean up expired subscriptions
  if (stale.length > 0) {
    for (const s of stale) await redis.srem(subsKey(tenantId), s);
  }
}

export function getVapidPublicKey(): string | undefined {
  return env.VAPID_PUBLIC_KEY;
}

/**
 * Cleanup stale push subscriptions across all tenants.
 * Sends a silent test push; removes subs that return 404/410.
 */
export async function cleanupStalePushSubs() {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;

  const keys = await redis.keys('push-subs:*');
  let cleaned = 0;

  for (const key of keys) {
    const members = await redis.smembers(key);
    const stale: string[] = [];

    await Promise.allSettled(
      members.map(async (m) => {
        const { subscription } = JSON.parse(m) as { subscription: webPush.PushSubscription };
        try {
          // Send empty payload to test if subscription is still valid
          await webPush.sendNotification(subscription, null, { TTL: 0 });
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            stale.push(m);
          }
        }
      }),
    );

    for (const s of stale) await redis.srem(key, s);
    cleaned += stale.length;
  }

  if (cleaned > 0) {
    console.log(`[Push] Cleaned ${cleaned} stale subscriptions`);
  }
}
