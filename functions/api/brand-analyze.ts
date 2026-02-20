import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';
import { getCorsHeaders, handleCorsOptions } from './_cors';

interface Env {
  OPENAI_API_KEY: string;
  ANTI_BOT_SECRET: string;
  POLAR_ACCESS_TOKEN: string;
  POLAR_ENV?: 'sandbox' | 'production';
}

// Sanitize user input: strip control characters and limit length
const sanitizeInput = (value: unknown, maxLen = 500): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLen);
};

export const onRequestOptions: PagesFunction = async (context) => {
  return handleCorsOptions(context.request);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const isPreview = origin ? origin.endsWith('.cloudworkstations.dev') : false;
  const corsHeaders = getCorsHeaders(origin, { isSandbox: env.POLAR_ENV === 'sandbox' });
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const headerLang = request.headers.get('Accept-Language')?.toLowerCase() || '';
  const lang = body?.lang === 'en' || body?.lang === 'ko'
    ? body.lang
    : (headerLang.startsWith('ko') ? 'ko' : 'en');

  if (!env.ANTI_BOT_SECRET) {
    return new Response(JSON.stringify({ error: lang === 'ko' ? '보안 설정 오류' : 'Security configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`brand-analyze:${ip}`, 6, 60_000);
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

    const antiBotToken = request.headers.get('X-AntiBot-Token');
    if (!antiBotToken || !(await verifyAntiBotToken(env.ANTI_BOT_SECRET, ip, antiBotToken))) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '안티봇 토큰이 유효하지 않습니다.' : 'Invalid anti-bot token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const raw = body || {} as Record<string, unknown>;
    const photo = typeof raw.photo === 'string' ? raw.photo : null;
    const brandName = sanitizeInput(raw.brandName, 200);
    const industry = sanitizeInput(raw.industry, 200);
    const targetAudience = sanitizeInput(raw.targetAudience, 300);
    const brandTone = sanitizeInput(raw.brandTone, 100);
    const platforms = Array.isArray(raw.platforms) ? raw.platforms.filter((p: unknown) => typeof p === 'string').map((p: string) => sanitizeInput(p, 50)) : [];
    const brandDescription = sanitizeInput(raw.brandDescription, 1000);
    const checkoutId = sanitizeInput(raw.checkoutId, 200);

    // 사진 크기 검증 (Base64 기준 약 7MB 제한, 바이너리 약 5MB)
    if (photo && photo.length > 7 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '사진 크기가 너무 큽니다 (최대 5MB).' : 'Photo size too large (max 5MB).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 결제 완료 서버사이드 검증
    if (!isPreview) {
      if (!checkoutId) {
        return new Response(JSON.stringify({ error: lang === 'ko' ? '결제 정보가 없습니다.' : 'Missing payment information.' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const isSandbox = env.POLAR_ENV === 'sandbox';
      const polarApiBase = isSandbox ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
      const checkoutRes = await fetch(`${polarApiBase}/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
        headers: { 'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}` },
      });
      if (!checkoutRes.ok) {
        return new Response(JSON.stringify({ error: lang === 'ko' ? '결제 정보를 확인할 수 없습니다.' : 'Unable to verify payment.' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const checkoutData = await checkoutRes.json() as { status?: string };
      if (checkoutData.status !== 'succeeded' && checkoutData.status !== 'confirmed') {
        return new Response(JSON.stringify({ error: lang === 'ko' ? '결제가 완료되지 않았습니다.' : 'Payment not completed.' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // brandName 필수 검증
    if (!brandName) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '브랜드 이름은 필수입니다.' : 'Brand name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const platformsList = platforms.join(', ');

    const userMessage = lang === 'ko'
      ? `브랜드 이름: ${brandName}${industry ? `\n산업/분야: ${industry}` : ''}${targetAudience ? `\n타겟 고객: ${targetAudience}` : ''}${brandTone ? `\n브랜드 톤: ${brandTone}` : ''}${platformsList ? `\n플랫폼: ${platformsList}` : ''}${brandDescription ? `\n브랜드 설명: ${brandDescription}` : ''}`
      : `Brand Name: ${brandName}${industry ? `\nIndustry: ${industry}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${brandTone ? `\nBrand Tone: ${brandTone}` : ''}${platformsList ? `\nPlatforms: ${platformsList}` : ''}${brandDescription ? `\nBrand Description: ${brandDescription}` : ''}`;

    const systemPrompt = lang === 'ko'
      ? `당신은 전문 브랜드 전략가이자 마케팅 컨설턴트입니다. 제공된 브랜드 정보를 바탕으로 종합적인 브랜드 분석 보고서를 작성해주세요.

다음 항목들을 포함해서 상세한 브랜드 분석 보고서를 작성해주세요:

1. **브랜드 포지셔닝** - 시장 포지셔닝 전략과 고유 가치 제안
2. **비주얼 아이덴티티** - 색상 팔레트 추천, 디자인 방향, 시각적 일관성 가이드라인
3. **타이포그래피** - 브랜드 톤에 어울리는 폰트 페어링 제안
4. **톤 & 보이스** - 커뮤니케이션 스타일 가이드와 예시 문구
5. **경쟁 분석** - 핵심 차별화 요소와 경쟁 우위
6. **플랫폼 전략** - 선택된 각 플랫폼에 맞춘 콘텐츠 전략

로고/제품 이미지가 제공된 경우, 현재 비주얼 브랜딩을 분석하고 개선점을 제안해주세요.

전문적이면서도 친근한 톤으로 작성해주세요.`
      : `You are an expert brand strategist and marketing consultant. Based on the brand information provided, create a comprehensive brand analysis report.

Include:

1. **Brand Positioning** - Market positioning strategy and unique value proposition.
2. **Visual Identity** - Color palette recommendations, design direction, and visual consistency guidelines.
3. **Typography** - Font pairing suggestions that match the brand tone.
4. **Tone & Voice** - Communication style guide with example phrases.
5. **Competitive Analysis** - Key differentiators and competitive advantages.
6. **Platform Strategy** - Tailored content strategy for each selected platform.

If a logo/product image is provided, analyze the current visual branding and suggest improvements.

Write in a professional yet approachable tone.`;

    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: 'system', content: systemPrompt }
    ];

    if (photo) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: photo } },
          { type: 'text', text: userMessage }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }

    // 브랜드 분석 리포트 생성
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1800,
        temperature: 0.6,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, JSON.stringify(data));
      return new Response(JSON.stringify({
        error: lang === 'ko' ? 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' : 'AI service is temporarily unavailable. Please try again later.',
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const report = data.choices?.[0]?.message?.content || '';

    // 사진이 있으면 마케팅 비주얼 이미지 생성
    let marketingVisual = null;
    if (photo) {
      try {
        // base64 데이터에서 실제 이미지 데이터 추출
        const base64Data = photo.split(',')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const imageBlob = new Blob([bytes], { type: 'image/png' });

        const formData = new FormData();
        formData.append('image', imageBlob, 'photo.png');
        formData.append('prompt', `You are a top-tier marketing designer. Create a professional marketing visual mockup for the brand '${brandName}' in the ${industry} industry. The visual should match a ${brandTone} tone. Create a clean, modern marketing asset suitable for social media. Include the brand name prominently.`);
        formData.append('model', 'gpt-image-1');
        formData.append('n', '1');
        formData.append('size', '512x512');
        formData.append('quality', 'low');

        const imageResponse = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        const imageData = await imageResponse.json();

        if (imageResponse.ok && imageData.data?.[0]?.b64_json) {
          marketingVisual = `data:image/png;base64,${imageData.data[0].b64_json}`;
        }
      } catch (imageError) {
        console.error('마케팅 비주얼 이미지 생성 오류:', imageError);
      }
    }

    return new Response(JSON.stringify({ report, marketingVisual }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Brand analyze error:', error);
    return new Response(JSON.stringify({
      error: '서버 오류가 발생했습니다.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
