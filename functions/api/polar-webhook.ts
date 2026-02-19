import { supabaseRequest } from './_supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  POLAR_WEBHOOK_SECRET?: string;
}

const timingSafeEqual = async (a: string, b: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  const key = await crypto.subtle.importKey(
    'raw', crypto.getRandomValues(new Uint8Array(32)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, aBytes),
    crypto.subtle.sign('HMAC', key, bBytes),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  let result = 0;
  for (let i = 0; i < viewA.length; i++) result |= viewA[i] ^ viewB[i];
  return result === 0;
};

const verifyWebhookSignature = async (
  secret: string, body: string, signatureHeader: string | null
): Promise<boolean> => {
  if (!signatureHeader) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, signatureHeader);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const rawBody = await request.text();

    if (env.POLAR_WEBHOOK_SECRET) {
      const signature = request.headers.get('webhook-signature')
        || request.headers.get('x-polar-signature')
        || request.headers.get('x-webhook-signature');
      const valid = await verifyWebhookSignature(env.POLAR_WEBHOOK_SECRET, rawBody, signature);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event || '';
    const data = payload.data || payload.subscription || payload;

    const userId =
      data?.customer?.metadata?.user_id ||
      data?.metadata?.user_id ||
      data?.external_customer_id ||
      data?.customer?.external_id ||
      null;
    const email = data?.customer?.email || data?.email || null;
    let status = data?.status || payload?.status || null;
    if (eventType.includes('cancel')) status = 'cancelled';
    if (eventType.includes('trial')) status = status || 'trialing';
    if (eventType.includes('created')) status = status || 'active';
    if (eventType.includes('updated')) status = status || data?.status || status;
    const trialEndsAt = data?.trial_ends_at || data?.trial_end || data?.trial_end_at || null;
    const currentPeriodEnd = data?.current_period_end || data?.current_period_end_at || data?.current_period_end_date || null;
    const cancelAtPeriodEnd = data?.cancel_at_period_end ?? false;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await supabaseRequest(env, `premium_subscriptions?on_conflict=user_id`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: userId,
        email,
        status,
        trial_ends_at: trialEndsAt,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      }),
    });

    return new Response(JSON.stringify({ success: true, eventType }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Webhook processing failed',
      details: 'Internal error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
