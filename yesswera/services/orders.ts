// Yesswera — Order creation with Tonalli integration
// This file shows the integration logic that Yesswera's createOrder should include.
// Adapt to Yesswera's actual codebase patterns (Supabase client, etc.)

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const TONALLI_API = process.env.TONALLI_API_URL ?? 'https://api.tonalli.app';

interface OrderItem {
  productId: string;          // Yesswera product ID
  tonalliProductId?: string;  // Mapped Tonalli product ID
  quantity: number;
  notes?: string;
}

interface CreateOrderParams {
  businessId: string;
  items: OrderItem[];
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
}

interface TonalliOrderResponse {
  tonalliOrderId: string;
  orderNumber: number;
  total: number;
  status: string;
}

function signRequest(apiKey: string, body: string): { timestamp: string; signature: string } {
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', apiKey)
    .update(timestamp + body)
    .digest('hex');
  return { timestamp, signature };
}

async function createTonalliOrder(
  slug: string,
  apiKey: string,
  externalOrderId: string,
  items: Array<{ productId: string; quantity: number; notes?: string }>,
  customerName: string,
  customerPhone: string,
  deliveryAddress: string,
  notes?: string,
): Promise<TonalliOrderResponse> {
  const body = JSON.stringify({
    slug,
    externalOrderId,
    items,
    customerName,
    customerPhone,
    deliveryAddress,
    notes,
  });

  const { timestamp, signature } = signRequest(apiKey, body);

  const res = await fetch(`${TONALLI_API}/api/v1/delivery/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-delivery-platform': 'yesswera',
      'x-delivery-timestamp': timestamp,
      'x-delivery-signature': signature,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(`Tonalli API error: ${err.error?.message ?? res.status}`);
  }

  return res.json();
}

/**
 * Creates an order in Yesswera. If the business is linked to Tonalli,
 * also creates the order in Tonalli for unified kitchen/inventory management.
 */
export async function createOrder(supabase: ReturnType<typeof createClient>, params: CreateOrderParams) {
  // 1. Look up business and check Tonalli linkage
  const { data: business } = await supabase
    .from('businesses')
    .select('id, tonalli_slug, tonalli_linked, tonalli_api_key')
    .eq('id', params.businessId)
    .single();

  // 2. Create order in Yesswera (always — this is the primary record)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      business_id: params.businessId,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      delivery_address: params.deliveryAddress,
      notes: params.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message}`);
  }

  // Insert order items
  const orderItems = params.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    notes: item.notes,
  }));

  await supabase.from('order_items').insert(orderItems);

  // 3. If linked to Tonalli, create the delivery order there too
  if (business?.tonalli_linked && business.tonalli_slug && business.tonalli_api_key) {
    try {
      // Map Yesswera product IDs → Tonalli product IDs
      const productIds = params.items.map((i) => i.productId);
      const { data: products } = await supabase
        .from('products')
        .select('id, tonalli_product_id')
        .in('id', productIds)
        .not('tonalli_product_id', 'is', null);

      const productMap = new Map((products ?? []).map((p) => [p.id, p.tonalli_product_id]));

      const tonalliItems = params.items
        .filter((item) => productMap.has(item.productId))
        .map((item) => ({
          productId: productMap.get(item.productId)!,
          quantity: item.quantity,
          notes: item.notes,
        }));

      if (tonalliItems.length > 0) {
        const tonalliResult = await createTonalliOrder(
          business.tonalli_slug,
          business.tonalli_api_key,
          order.id, // Yesswera order ID as externalOrderId
          tonalliItems,
          params.customerName,
          params.customerPhone,
          params.deliveryAddress,
          params.notes,
        );

        // Save Tonalli references back to Yesswera order
        await supabase
          .from('orders')
          .update({
            tonalli_order_id: tonalliResult.tonalliOrderId,
            tonalli_order_number: tonalliResult.orderNumber,
          })
          .eq('id', order.id);

        return { ...order, tonalli_order_id: tonalliResult.tonalliOrderId };
      }
    } catch (err) {
      // Fallback: Tonalli is down — order exists in Yesswera only.
      // A background job can retry syncing later.
      console.error('[Tonalli Integration] Failed to create delivery order:', err);
    }
  }

  return order;
}
