import { supabaseRequest } from './api/_supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
}

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const buildPrompt = (profile: {
  brand_name?: string | null;
  industry?: string | null;
  target_audience?: string | null;
  brand_tone?: string | null;
  platforms?: string[] | null;
  locale?: string | null;
}, dateStr: string) => {
  const brandName = profile.brand_name || 'Unknown Brand';
  const industry = profile.industry || 'General';
  const targetAudience = profile.target_audience || 'General audience';
  const brandTone = profile.brand_tone || 'Professional';
  const platforms = profile.platforms?.join(', ') || 'Instagram, Twitter/X, LinkedIn';

  const isKorean = (profile.locale || '').toLowerCase().startsWith('ko');
  if (isKorean) {
    return `당신은 마케팅 콘텐츠 전략가입니다. 브랜드를 위한 오늘의 콘텐츠 브리핑을 작성해주세요.

브랜드: ${brandName}
산업: ${industry}
타겟 오디언스: ${targetAudience}
톤: ${brandTone}
플랫폼: ${platforms}
날짜 컨텍스트: ${dateStr} (관련된 시즌/캘린더 컨텍스트를 포함해주세요)

다음을 작성해주세요:
1) Instagram 게시물 - 해시태그 포함 캡션 (매력적, 비주얼 중심)
2) Twitter/X 게시물 - 간결하고 임팩트 있는 트윗과 관련 해시태그
3) LinkedIn 게시물 - 전문적인 사고 리더십 콘텐츠
4) 광고 카피 - 짧은 광고 헤드라인 + 본문 텍스트
5) 캘린더 팁 - 이번 주 관련 날짜, 이벤트 또는 시즌 기회
6) 트렌드 훅 - 브랜드를 현재 트렌드나 토픽에 연결

각 섹션을 간결하고 실행 가능하게 작성하세요. 총 500단어 이하.`;
  }

  return `You are a marketing content strategist. Create today's content briefing for the brand.

Brand: ${brandName}
Industry: ${industry}
Target Audience: ${targetAudience}
Tone: ${brandTone}
Platforms: ${platforms}
Date Context: ${dateStr} (include any relevant seasonal/calendar context)

Please create:
1) Instagram Post - Caption with hashtags (engaging, visual-focused)
2) Twitter/X Post - Concise, punchy tweet with relevant hashtags
3) LinkedIn Post - Professional thought leadership content
4) Ad Copy - A short advertising headline + body text
5) Calendar Tip - Any relevant dates, events, or seasonal opportunities this week
6) Trending Hook - Connect the brand to a current trend or topic

Keep each section concise and actionable. Total under 500 words.`;
};

const sendEmail = async (env: Env, email: string, subject: string, html: string) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: email,
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || JSON.stringify(data));
  }
};

export const runDailyRecommendations = async (env: Env) => {
  const dateStr = toDateString(new Date());

  const subs = await supabaseRequest(env, `premium_subscriptions?status=in.(active,trialing)&select=*`);
  for (const sub of subs || []) {
    const userId = sub.user_id;
    const email = sub.email;
    if (!userId || !email) continue;

    const existing = await supabaseRequest(
      env,
      `daily_recommendations?user_id=eq.${userId}&recommendation_date=eq.${dateStr}&select=id`
    );
    if (existing && existing.length > 0) continue;

    const profileRows = await supabaseRequest(env, `user_profiles?user_id=eq.${userId}&select=brand_name,industry,target_audience,brand_tone,platforms,locale`);
    const profile = profileRows?.[0];
    if (!profile) continue;

    const prompt = buildPrompt(profile, dateStr);

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 700,
        temperature: 0.6,
      }),
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      continue;
    }

    const recommendation = aiData.choices?.[0]?.message?.content || '';
    const recInsert = await supabaseRequest(env, `daily_recommendations`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        email,
        recommendation_date: dateStr,
        recommendation,
      }),
    });

    const recommendationId = recInsert?.[0]?.id;
    if (!recommendationId) continue;

    const isKorean = (profile.locale || '').toLowerCase().startsWith('ko');
    const subject = isKorean ? '오늘의 콘텐츠 브리핑' : 'Your Daily Content Briefing';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #ffffff; padding: 32px;">
        <div style="max-width: 640px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 24px;">Brand<span style="color:#6C63FF;">Forge</span> AI</h1>
            <p style="color: #8a8a8a; margin: 6px 0 0;">${isKorean ? 'AI 기반 데일리 마케팅 콘텐츠' : 'AI-Powered Daily Marketing Content'}</p>
          </div>
          <div style="background:#141414;border:1px solid #2c2c2c;border-radius:16px;padding:20px;">
            <h2 style="margin:0 0 8px;font-size:20px;">${isKorean ? '오늘의 콘텐츠 브리핑' : 'Your Daily Content Briefing'}</h2>
            <p style="color:#b3b3b3;margin:0 0 16px;">${dateStr}</p>
            <div style="background:#0f0f0f;border:1px solid #262626;border-radius:12px;padding:16px;">
              <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #eaeaea; line-height:1.6;">${recommendation}</pre>
            </div>
          </div>
          <p style="color:#6f6f6f;font-size:12px;text-align:center;margin-top:16px;">
            ${isKorean ? '이 이메일은 BrandForge AI에서 발송되었습니다.' : 'This email was sent by BrandForge AI.'}
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail(env, email, subject, html);
      await supabaseRequest(env, `daily_recommendation_emails`, {
        method: 'POST',
        body: JSON.stringify({
          recommendation_id: recommendationId,
          email,
          sent_at: new Date().toISOString(),
          status: 'sent',
        }),
      });
    } catch (err) {
      await supabaseRequest(env, `daily_recommendation_emails`, {
        method: 'POST',
        body: JSON.stringify({
          recommendation_id: recommendationId,
          email,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }
};

export const scheduled: PagesScheduledFunction<Env> = async (_event, env, _ctx) => {
  await runDailyRecommendations(env);
};
