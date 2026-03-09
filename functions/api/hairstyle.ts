import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  OPENAI_API_KEY: string;
  ANTI_BOT_SECRET: string;
  OPENAI_PROXY_URL?: string;
  OPENAI_PROXY_SECRET?: string;
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
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

const getCorsHeaders = (origin: string | null) => {
  const isPreview = origin ? origin.endsWith('.cloudworkstations.dev') || origin.endsWith('.pages.dev') : false;
  if (!origin || (!allowedOrigins.includes(origin) && !isPreview)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AntiBot-Token',
    'Vary': 'Origin',
  };
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) return new Response('Origin not allowed', { status: 403 });
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

  const body = await request.json().catch(() => null);
  const lang = body?.lang === 'en' ? 'en' : 'ko';

  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`hairstyle:${ip}`, 3, 60_000);
    if (!limiter.allowed) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '요청이 너무 많습니다.' : 'Too many requests', retryAfter: limiter.retryAfter }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(limiter.retryAfter), ...corsHeaders },
      });
    }

    if (env.ANTI_BOT_SECRET) {
      const antiBotToken = request.headers.get('X-AntiBot-Token');
      if (!antiBotToken || !(await verifyAntiBotToken(env.ANTI_BOT_SECRET, ip, antiBotToken))) {
        return new Response(JSON.stringify({ error: lang === 'ko' ? '안티봇 토큰이 유효하지 않습니다.' : 'Invalid anti-bot token' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    const { photo, gender, lang: bodyLang } = body || {};
    if (!photo) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '사진이 필요합니다.' : 'Photo is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const genderText = (bodyLang === 'ko' || lang === 'ko')
      ? (gender === 'male' ? '남성' : '여성')
      : (gender === 'male' ? 'male' : 'female');

    const base64Data = photo.split(',')[1];
    const binaryData = atob(base64Data);
    const bytes = Uint8Array.from(binaryData, c => c.charCodeAt(0));
    const imageBlob = new Blob([bytes], { type: 'image/png' });

    const formData = new FormData();
    formData.append('image', imageBlob, 'photo.png');
    formData.append('prompt', `너는 최고의 헤어스타일리스트야. 3x3 그리드로, 어떤 헤어스타일인지 설명과 함께 첨부한 사진속 사람이랑 최고로 잘 어울리는 헤어스타일 9개 생성해줘. ${genderText}에게 어울리는 스타일로 만들어줘.`);
    formData.append('model', 'gpt-image-1');
    formData.append('n', '1');
    formData.append('size', '512x512');
    formData.append('quality', 'low');

    const proxyUrl = env.OPENAI_PROXY_URL;
    const proxySecret = env.OPENAI_PROXY_SECRET;
    const imageUrl = proxyUrl ? `${proxyUrl}/openai/v1/images/edits` : 'https://api.openai.com/v1/images/edits';
    const imageHeaders: Record<string, string> = {};
    if (proxyUrl && proxySecret) {
      imageHeaders['X-Proxy-Secret'] = proxySecret;
    } else {
      imageHeaders['Authorization'] = `Bearer ${env.OPENAI_API_KEY}`;
    }

    console.log('hairstyle: calling gpt-image-1');
    const imageResponse = await fetch(imageUrl, {
      method: 'POST',
      headers: imageHeaders,
      body: formData,
    });

    let imageData: unknown;
    try {
      imageData = await imageResponse.json();
    } catch {
      const raw = await imageResponse.text().catch(() => '');
      console.error('hairstyle non-JSON:', imageResponse.status, raw.slice(0, 200));
      return new Response(JSON.stringify({ error: `Image API ${imageResponse.status} (non-JSON)` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!imageResponse.ok) {
      const errMsg = (imageData as any)?.error?.message || JSON.stringify(imageData);
      console.error('hairstyle API error:', imageResponse.status, errMsg);
      return new Response(JSON.stringify({ error: `Image API ${imageResponse.status}: ${errMsg}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const b64 = (imageData as any)?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: 'No image data returned' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ hairstyleImage: `data:image/png;base64,${b64}` }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('hairstyle error:', errMsg);
    return new Response(JSON.stringify({ error: `서버 오류: ${errMsg}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
