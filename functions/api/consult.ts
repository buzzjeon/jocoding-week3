import { getClientIp, rateLimit } from './_antibot';

interface Env {
  OPENAI_API_KEY: string;
  ANTI_BOT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anti-Bot-Token',
};

export const onRequestOptions: PagesFunction = () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = getClientIp(request);

  const limiter = rateLimit(`consult:${ip}`, 6, 60_000);
  if (!limiter.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: limiter.retryAfter }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body: any = await request.json();
    const {
      photo,
      productName,
      brandName,
      category,
      price,
      targetAudience,
      keyFeatures,
      tone,
      platform,
      keywords,
      lang,
    } = body || {};

    if (!productName || !category || !keyFeatures) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const isKorean = lang === 'ko';
    const prompt = isKorean
      ? `당신은 커머스 전문 카피라이터입니다. 아래 상품 정보를 바탕으로 바로 사용 가능한 "카피팩"을 만들어주세요.

상품명: ${productName}
브랜드: ${brandName || '-'}
카테고리: ${category}
가격: ${price || '-'}
타겟 고객: ${targetAudience || '-'}
핵심 특징: ${keyFeatures}
톤: ${tone || 'premium'}
플랫폼: ${platform || 'all'}
키워드: ${keywords || '-'}

아래 형식을 반드시 지켜 Markdown으로 작성하세요:
1. **상품 요약** (2~3문장)
2. **핵심 장점** (불릿 4~6개)
3. **상세 설명**
4. **플랫폼별 카피**
   - 스마트스토어/쿠팡/인스타그램/틱톡/쇼피파이 각각:
     - 제목 1개
     - 불릿 3개
     - 광고용 짧은 문장 1개
5. **추천 키워드 & 해시태그**
6. **피해야 할 과장 표현**
7. **CTA 문구 3개**

톤과 플랫폼 선호를 반영하고, 확인 불가한 주장/효능은 피하세요.`
      : `You are a commerce copywriter. Build a ready-to-publish "copy pack" from the product details below.

Product name: ${productName}
Brand: ${brandName || '-'}
Category: ${category}
Price: ${price || '-'}
Target audience: ${targetAudience || '-'}
Key features: ${keyFeatures}
Tone: ${tone || 'premium'}
Platform: ${platform || 'all'}
Keywords: ${keywords || '-'}

Follow this Markdown format exactly:
1. **Product Summary** (2-3 sentences)
2. **Key Benefits** (4-6 bullets)
3. **Detailed Description**
4. **Platform Copy**
   - For Smartstore, Coupang, Instagram, TikTok, Shopify:
     - 1 title
     - 3 bullets
     - 1 short ad line
5. **Suggested Keywords & Hashtags**
6. **Claims to Avoid**
7. **CTA Lines (3)**

Respect the requested tone and platform. Avoid unverifiable claims or exaggerated promises.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: photo
              ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: photo } }]
              : [{ type: 'text', text: prompt }],
          },
        ],
        max_tokens: 1500,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('OpenAI Error:', data);
      return new Response(JSON.stringify({ error: 'AI Analysis failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      report: data.choices[0].message.content,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Consult Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
