import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  OPENAI_API_KEY: string;
  ANTI_BOT_SECRET: string;
  POLAR_ACCESS_TOKEN: string;
  POLAR_ENV?: 'sandbox' | 'production';
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
  const isPreview = origin ? origin.endsWith('.cloudworkstations.dev') : false;
  if (!origin || (!allowedOrigins.includes(origin) && !isPreview)) {
    return null;
  }
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
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const isPreview = origin ? origin.endsWith('.cloudworkstations.dev') : false;
  const corsHeaders = getCorsHeaders(origin);
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
    const limiter = rateLimit(`consult:${ip}`, 6, 60_000);
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

    const { photo, gender, height, weight, unitSystem, checkoutId } = body || {};

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
    const heightValue = Number(height);
    const weightValue = Number(weight);
    if (!Number.isFinite(heightValue) || !Number.isFinite(weightValue)) {
      return new Response(JSON.stringify({ error: lang === 'ko' ? '키와 몸무게를 확인해주세요.' : 'Please check your height and weight.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const isImperial = unitSystem === 'imperial';
    const heightCm = isImperial ? heightValue * 2.54 : heightValue;
    const weightKg = isImperial ? weightValue * 0.453592 : weightValue;

    const genderText = lang === 'ko'
      ? (gender === 'male' ? '남성' : '여성')
      : (gender === 'male' ? 'male' : 'female');
    const userMessage = lang === 'ko'
      ? (isImperial
        ? `${genderText}, 키 ${heightValue}in (${heightCm.toFixed(1)}cm), 몸무게 ${weightValue}lb (${weightKg.toFixed(1)}kg)`
        : `${genderText}, 키 ${heightCm.toFixed(1)}cm, 몸무게 ${weightKg.toFixed(1)}kg`)
      : (isImperial
        ? `${genderText}, height ${heightValue} in (${heightCm.toFixed(1)} cm), weight ${weightValue} lb (${weightKg.toFixed(1)} kg)`
        : `${genderText}, height ${heightCm.toFixed(1)} cm, weight ${weightKg.toFixed(1)} kg`);

    const systemPrompt = lang === 'ko'
      ? `당신은 전문 퍼스널 스타일리스트입니다. 사용자의 성별, 키, 몸무게 정보를 바탕으로 맞춤형 스타일 컨설팅 보고서를 작성해주세요.

다음 항목들을 포함해서 상세한 스타일 컨설팅 보고서를 작성해주세요:

1. **체형 분석**: 키와 몸무게를 기반으로 한 체형 분석
2. **추천 스타일**: 체형에 어울리는 옷 스타일 추천
3. **컬러 추천**: 어울리는 색상 조합 추천
4. **피해야 할 스타일**: 체형에 맞지 않는 스타일
5. **코디 예시**: 계절별 코디 추천 (봄/여름, 가을/겨울)
6. **액세서리 추천**: 어울리는 액세서리 제안

사진이 제공된 경우, 현재 스타일에 대한 피드백과 개선점도 제안해주세요.

친근하고 전문적인 톤으로 작성해주세요.`
      : `You are a professional personal stylist. Based on the user's gender, height, and weight, write a customized style consulting report.

Please include the following sections:

1. **Body Analysis**: Analyze body type based on height and weight
2. **Recommended Styles**: Styles that flatter the body type
3. **Color Recommendations**: Color combinations that suit the user
4. **Styles to Avoid**: Styles that do not complement the body type
5. **Outfit Examples**: Seasonal outfit ideas (spring/summer, fall/winter)
6. **Accessory Suggestions**: Accessories that complement the look

If a photo is provided, include feedback on the current style and improvement tips.

Write in a friendly, professional tone.`;

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

    // 스타일 컨설팅 리포트 생성
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1200,
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

    // 사진이 있으면 헤어스타일 이미지 생성
    let hairstyleImage = null;
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
        formData.append('prompt', `너는 최고의 헤어스타일리스트야. 3x3 그리드로, 어떤 헤어스타일인지 설명과 함께 첨부한 사진속 사람이랑 최고로 잘 어울리는 헤어스타일 9개 생성해줘. ${genderText}에게 어울리는 스타일로 만들어줘.`);
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
          hairstyleImage = `data:image/png;base64,${imageData.data[0].b64_json}`;
        }
      } catch (imageError) {
        console.error('헤어스타일 이미지 생성 오류:', imageError);
      }
    }

    return new Response(JSON.stringify({ report, hairstyleImage }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Consult error:', error);
    return new Response(JSON.stringify({
      error: '서버 오류가 발생했습니다.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
