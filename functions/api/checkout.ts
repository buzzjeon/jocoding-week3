import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';
import { getCorsHeaders, handleCorsOptions } from './_cors';

interface Env {
  POLAR_ACCESS_TOKEN: string;
  POLAR_ENV?: 'sandbox' | 'production';
  ANTI_BOT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const isSandbox = env.POLAR_ENV === 'sandbox';
  const origin = request.headers.get('Origin');
  const body = await request.json().catch(() => ({}));
  const headerLang = request.headers.get('Accept-Language')?.toLowerCase() || '';
  const lang = body?.lang === 'en' || body?.lang === 'ko'
    ? body.lang
    : (headerLang.startsWith('ko') ? 'ko' : 'en');
  const corsHeaders = getCorsHeaders(origin, { isSandbox });
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: lang === 'ko' ? '허용되지 않은 Origin입니다.' : 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`checkout:${ip}`, 6, 60_000);
    if (!limiter.allowed) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '요청이 너무 많습니다.' : 'Too many requests', retryAfter: limiter.retryAfter }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limiter.retryAfter),
          ...corsHeaders,
        },
      });
    }

    if (!env.ANTI_BOT_SECRET) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '보안 설정 오류' : 'Security configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const antiBotToken = request.headers.get('X-AntiBot-Token');
    if (!antiBotToken || !(await verifyAntiBotToken(env.ANTI_BOT_SECRET, ip, antiBotToken))) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '안티봇 토큰이 유효하지 않습니다.' : 'Invalid anti-bot token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Use a query param to avoid SPA 404s on refresh.
    const successUrl = `${origin}/?payment=success`;

    const sandboxAllowed = origin?.startsWith('http://localhost')
      || origin?.startsWith('http://127.0.0.1')
      || origin?.endsWith('.pages.dev');
    if (isSandbox && !sandboxAllowed) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '샌드박스 모드는 localhost에서만 허용됩니다.' : 'Sandbox mode is only allowed from localhost.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const polarApiBase = isSandbox
      ? 'https://sandbox-api.polar.sh'
      : 'https://api.polar.sh';
    const productId = isSandbox
      ? '4da76d3a-45ee-4f2d-a5cc-d9e5183cd38c'
      : '7e50b910-c6fe-40b6-bb6d-e4f99c040130';
    // polarEnv log removed — avoid exposing environment mode in production
    const response = await fetch(`${polarApiBase}/v1/checkouts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: [productId],
        success_url: successUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[checkout] Polar API error:', response.status, JSON.stringify(data));
      return new Response(JSON.stringify({
        error: lang === 'ko' ? 'Checkout 생성 실패' : 'Failed to create checkout',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      url: data.url,
      id: data.id,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[checkout] Server error:', error);
    return new Response(JSON.stringify({
      error: lang === 'ko' ? '서버 오류가 발생했습니다.' : 'Server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const isSandbox = context.env.POLAR_ENV === 'sandbox';
  return handleCorsOptions(context.request, { isSandbox });
};
