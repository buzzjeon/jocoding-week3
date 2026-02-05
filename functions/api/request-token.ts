import { createAntiBotToken, getClientIp, rateLimit } from './_antibot';

interface Env {
  ANTI_BOT_SECRET: string;
}

const allowedOrigins = [
  'https://jocoding-week3.pages.dev',
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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.ANTI_BOT_SECRET) {
    return new Response(JSON.stringify({ error: 'Missing ANTI_BOT_SECRET' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const ip = getClientIp(request);
  const limiter = rateLimit(`token:${ip}`, 20, 60_000);
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

  const { token, expiresAt } = await createAntiBotToken(env.ANTI_BOT_SECRET, ip, 5 * 60_000);

  return new Response(JSON.stringify({ token, expiresAt }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
};
