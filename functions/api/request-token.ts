import { createAntiBotToken, getClientIp, rateLimit } from './_antibot';
import { getCorsHeaders, handleCorsOptions } from './_cors';

interface Env {
  ANTI_BOT_SECRET: string;
}

export const onRequestOptions: PagesFunction = async (context) => {
  return handleCorsOptions(context.request);
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
    return new Response(JSON.stringify({ token: null, expiresAt: 0, disabled: true }), {
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
