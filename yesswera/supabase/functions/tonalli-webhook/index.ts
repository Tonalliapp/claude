// Deno Edge Function: tonalli-webhook
// Called by Yesswera backend when delivery status changes.
// Forwards status updates to Tonalli API via HMAC-authenticated webhook.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const TONALLI_API = Deno.env.get('TONALLI_API_URL') ?? 'https://api.tonalli.app';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WebhookPayload {
  orderId: string;       // Yesswera order ID
  businessId: string;    // Yesswera business ID
  event: 'driver_assigned' | 'picked_up' | 'delivered';
  data?: {
    driverName?: string;
    driverPhone?: string;
    estimatedMinutes?: number;
    deliveredAt?: string;
  };
}

function signRequest(apiKey: string, timestamp: string, body: string): string {
  return createHmac('sha256', apiKey).update(timestamp + body).digest('hex');
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload: WebhookPayload = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Look up the business to get Tonalli credentials
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('tonalli_slug, tonalli_api_key, tonalli_linked')
    .eq('id', payload.businessId)
    .single();

  if (bizError || !business?.tonalli_linked) {
    return new Response(JSON.stringify({ error: 'Business not linked to Tonalli' }), { status: 400 });
  }

  // Look up the order to get Yesswera's external order ID
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, tonalli_order_id')
    .eq('id', payload.orderId)
    .single();

  if (orderError || !order?.tonalli_order_id) {
    return new Response(JSON.stringify({ error: 'Order not linked to Tonalli' }), { status: 400 });
  }

  // Build the webhook body for Tonalli
  const webhookBody = {
    slug: business.tonalli_slug,
    event: payload.event,
    externalOrderId: payload.orderId,
    data: payload.data ?? {},
  };

  const bodyStr = JSON.stringify(webhookBody);
  const timestamp = String(Date.now());
  const signature = signRequest(business.tonalli_api_key, timestamp, bodyStr);

  // Send to Tonalli
  try {
    const res = await fetch(`${TONALLI_API}/api/v1/delivery/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-delivery-platform': 'yesswera',
        'x-delivery-timestamp': timestamp,
        'x-delivery-signature': signature,
      },
      body: bodyStr,
    });

    const result = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Tonalli rejected webhook', details: result }), {
        status: res.status,
      });
    }

    return new Response(JSON.stringify({ ok: true, tonalli: result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Tonalli unreachable: ${(err as Error).message}` }), {
      status: 502,
    });
  }
});
