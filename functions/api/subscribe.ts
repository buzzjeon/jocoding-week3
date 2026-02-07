import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  POLAR_ACCESS_TOKEN: string;
  POLAR_ENV?: 'sandbox' | 'production';
  ANTI_BOT_SECRET: string;
}

const allowedOrigins = [
  'https://buzzstyle.work',
  'https://www.buzzstyle.work',
  'https://jocoding-week3.pages.dev',
  'http://buzzstyle.work',
  'http://www.buzzstyle.work',
  'http://jocoding-week3.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const getCorsHeaders = (origin: string | null) => {
  if (!origin || !allowedOrigins.includes(origin)) {
    return null;
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AntiBot-Token',
    'Vary': 'Origin',
  };
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  try {
    const body = await request.json().catch(() => ({})) as {
      origin?: string;
      userId?: string;
      email?: string;
    };

    const origin = request.headers.get('Origin') || body.origin || null;
    const corsHeaders = getCorsHeaders(origin);
    if (!corsHeaders) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ip = getClientIp(request);
    const limiter = rateLimit(`subscribe:${ip}`, 6, 60_000);
    if (!limiter.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: limiter.retryAfter }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limiter.retryAfter),
          ...corsHeaders,
        },
      });
    }

    const antiBotToken = request.headers.get('X-AntiBot-Token');
    if (env.ANTI_BOT_SECRET) {
      if (!antiBotToken || !(await verifyAntiBotToken(env.ANTI_BOT_SECRET, ip, antiBotToken))) {
        return new Response(JSON.stringify({ error: 'Invalid anti-bot token' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Use the validated Origin header to prevent open-redirects.
    const successUrl = `${origin}/subscription-success`;

    // StyleAI Daily Premium subscription product ID
    const SUBSCRIPTION_PRODUCT_ID = env.POLAR_ENV === 'sandbox'
      ? '6c3bb3df-11fc-4ef7-980f-4be61ce5f883'
      : '50ac0439-8520-47e8-a496-25a96d7a56b3';

    const checkoutData: Record<string, unknown> = {
      products: [SUBSCRIPTION_PRODUCT_ID],
      success_url: successUrl,
    };

    // Link to user if provided
    if (body.userId) {
      checkoutData.external_customer_id = body.userId;
    }

    // Pre-fill email if provided
    if (body.email) {
      checkoutData.customer_email = body.email;
    }

    const isSandbox = env.POLAR_ENV === 'sandbox';
    if (isSandbox && !origin?.startsWith('http://localhost') && !origin?.startsWith('http://127.0.0.1')) {
      return new Response(JSON.stringify({ error: 'Sandbox mode is only allowed from localhost.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const polarApiBase = isSandbox
      ? 'https://sandbox-api.polar.sh'
      : 'https://api.polar.sh';
    console.log(`[subscribe] polarEnv=${isSandbox ? 'sandbox' : 'production'}`);
    const response = await fetch(`${polarApiBase}/v1/checkouts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Subscription checkout failed',
        details: data.detail || JSON.stringify(data)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      url: data.url,
      id: data.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, {
    headers: {
      ...corsHeaders,
    },
  });
};
