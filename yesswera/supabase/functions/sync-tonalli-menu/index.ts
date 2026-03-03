// Deno Edge Function: sync-tonalli-menu
// Runs every 15 min via pg_cron or Supabase CRON trigger.
// Fetches the public menu from Tonalli API and upserts into Yesswera products.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TONALLI_API = Deno.env.get('TONALLI_API_URL') ?? 'https://api.tonalli.app';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get all businesses linked to Tonalli
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, tonalli_slug')
    .eq('tonalli_linked', true)
    .not('tonalli_slug', 'is', null);

  if (bizError) {
    return new Response(JSON.stringify({ error: bizError.message }), { status: 500 });
  }

  const results: Array<{ businessId: string; synced: number; errors: string[] }> = [];

  for (const biz of businesses ?? []) {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Fetch public menu from Tonalli (no auth needed)
      const res = await fetch(`${TONALLI_API}/api/v1/menu/${biz.tonalli_slug}`);
      if (!res.ok) {
        errors.push(`Tonalli API returned ${res.status}`);
        results.push({ businessId: biz.id, synced, errors });
        continue;
      }

      const menu = await res.json();
      const categories: Array<{ id: string; name: string; products: Array<{
        id: string; name: string; description?: string; price: number; imageUrl?: string; available: boolean;
      }> }> = menu.categories ?? [];

      // Collect all product IDs from Tonalli
      const tonalliProductIds = new Set<string>();

      for (const cat of categories) {
        for (const product of cat.products) {
          tonalliProductIds.add(product.id);

          // Upsert product in Yesswera
          const { error: upsertErr } = await supabase
            .from('products')
            .upsert(
              {
                business_id: biz.id,
                tonalli_product_id: product.id,
                name: product.name,
                description: product.description ?? '',
                price: product.price,
                image_url: product.imageUrl ?? null,
                available: product.available,
                category_name: cat.name,
              },
              { onConflict: 'business_id,tonalli_product_id' },
            );

          if (upsertErr) {
            errors.push(`Upsert failed for ${product.id}: ${upsertErr.message}`);
          } else {
            synced++;
          }
        }
      }

      // Mark products removed from Tonalli as unavailable
      if (tonalliProductIds.size > 0) {
        await supabase
          .from('products')
          .update({ available: false })
          .eq('business_id', biz.id)
          .not('tonalli_product_id', 'is', null)
          .not('tonalli_product_id', 'in', `(${[...tonalliProductIds].map((id) => `"${id}"`).join(',')})`)
      }
    } catch (err) {
      errors.push(`Sync failed: ${(err as Error).message}`);
    }

    results.push({ businessId: biz.id, synced, errors });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
