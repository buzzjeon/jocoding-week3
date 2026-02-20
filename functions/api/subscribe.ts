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
  const origin = request.headers.get('Origin') || null;
  const corsHeaders = getCorsHeaders(origin, { isSandbox });
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({})) as {
      origin?: string;
      userId?: string;
      email?: string;
      lang?: string;
    };
    const headerLang = request.headers.get('Accept-Language')?.toLowerCase() || '';
    const lang = body.lang === 'en' || body.lang === 'ko'
      ? body.lang
      : (headerLang.startsWith('ko') ? 'ko' : 'en');

    const ip = getClientIp(request);
    const limiter = rateLimit(`subscribe:${ip}`, 6, 60_000);
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

    // Use the validated Origin header to prevent open-redirects.
    const successUrl = `${origin}/subscription-success`;

    // BrandForge Daily Premium subscription product ID
    const SUBSCRIPTION_PRODUCT_ID = isSandbox
      ? '6c3bb3df-11fc-4ef7-980f-4be61ce5f883'
      : '50ac0439-8520-47e8-a496-25a96d7a56b3';

    const checkoutData: Record<string, unknown> = {
      products: [SUBSCRIPTION_PRODUCT_ID],
      success_url: successUrl,
    };

    // Link to user if provided
    if (body.userId) {
      checkoutData.external_customer_id = body.userId;
      checkoutData.metadata = { user_id: body.userId };
    }

    // Pre-fill email if provided
    if (body.email) {
      checkoutData.customer_email = body.email;
    }

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
      console.error('[subscribe] Polar API error:', response.status, JSON.stringify(data));
      return new Response(JSON.stringify({
        error: lang === 'ko' ? '구독 체크아웃 생성에 실패했습니다.' : 'Subscription checkout failed',
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
    console.error('[subscribe] Server error:', error);
    return new Response(JSON.stringify({
      error: 'Server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const isSandbox = context.env.POLAR_ENV === 'sandbox';
  return handleCorsOptions(context.request, { isSandbox });
};
