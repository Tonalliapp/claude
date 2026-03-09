import { useEffect, useState } from 'react';
import { apiFetch } from '@/config/api';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Register the push service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/push-sw.js').catch(() => {});
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      await subscribeToPush();
      return true;
    }
    return false;
  };

  const subscribeToPush = async () => {
    try {
      const { publicKey } = await apiFetch<{ publicKey: string | null }>('/push/vapid-key');
      if (!publicKey) return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        await sendSubscription(existing);
        setSubscribed(true);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await sendSubscription(subscription);
      setSubscribed(true);
    } catch {
      // Push not supported or user denied
    }
  };

  const sendSubscription = async (sub: PushSubscription) => {
    const json = sub.toJSON();
    await apiFetch('/push/subscribe', {
      method: 'POST',
      body: {
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: json.keys?.p256dh || '',
            auth: json.keys?.auth || '',
          },
        },
      },
      auth: true,
    });
  };

  return { permission, subscribed, requestPermission };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
