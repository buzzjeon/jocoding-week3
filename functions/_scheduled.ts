import { supabaseRequest } from './api/_supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  OPENWEATHER_API_KEY: string;
}

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const buildPrompt = (profile: {
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  style_preferences?: Record<string, unknown> | null;
  unit_system?: string | null;
  locale?: string | null;
}, weather: Record<string, unknown> | null) => {
  const genderText = profile.gender === 'male' ? 'male' : profile.gender === 'female' ? 'female' : 'unspecified';
  const isImperial = profile.unit_system === 'imperial';
  const heightValue = profile.height_cm ?? null;
  const weightValue = profile.weight_kg ?? null;
  const heightText = heightValue
    ? (isImperial ? `${(heightValue / 2.54).toFixed(1)} in (${heightValue} cm)` : `${heightValue} cm`)
    : 'unknown';
  const weightText = weightValue
    ? (isImperial ? `${(weightValue / 0.453592).toFixed(1)} lb (${weightValue} kg)` : `${weightValue} kg`)
    : 'unknown';
  const prefs = profile.style_preferences ? JSON.stringify(profile.style_preferences) : 'none';
  const weatherText = weather ? JSON.stringify(weather) : 'unavailable';

  const isKorean = (profile.locale || '').toLowerCase().startsWith('ko');
  if (isKorean) {
    return `당신은 전문 퍼스널 스타일리스트입니다. 오늘의 간단한 코디 추천을 작성해주세요.

사용자:
- 성별: ${genderText}
- 키: ${heightText}
- 몸무게: ${weightText}
- 선호: ${prefs}

날씨:
${weatherText}

다음을 포함하세요:
1) 한 줄 요약
2) 상의/하의/신발 추천
3) 액세서리(선택)
4) 컬러 팔레트
220단어 이하로 간결하게 작성하세요.`;
  }

  return `You are a professional personal stylist. Create a concise daily outfit recommendation.

User:
- gender: ${genderText}
- height: ${heightText}
- weight: ${weightText}
- preferences: ${prefs}

Weather:
${weatherText}

Please include:
1) A short summary line
2) Outfit suggestions (top, bottom, shoes)
3) Optional accessories
4) Color palette guidance
Keep it under 220 words.`;
};

const fetchWeather = async (env: Env, locationKey: string, lat: number, lon: number, dateStr: string) => {
  const cached = await supabaseRequest(env, `weather_cache?location_key=eq.${encodeURIComponent(locationKey)}&weather_date=eq.${dateStr}&select=*`);
  if (cached && cached.length > 0) return cached[0].data;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${env.OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  await supabaseRequest(env, `weather_cache`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      location_key: locationKey,
      weather_date: dateStr,
      data,
      fetched_at: new Date().toISOString(),
    }),
  });

  return data;
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

    const profileRows = await supabaseRequest(env, `user_profiles?user_id=eq.${userId}&select=*`);
    const profile = profileRows?.[0];
    if (!profile) continue;

    let weather: Record<string, unknown> | null = null;
    const loc = profile.last_location || {};
    const lat = Number(loc.latitude);
    const lon = Number(loc.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const locationKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      weather = await fetchWeather(env, locationKey, lat, lon, dateStr);
    }

    const prompt = buildPrompt(profile, weather);

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 400,
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
        weather,
        recommendation,
      }),
    });

    const recommendationId = recInsert?.[0]?.id;
    if (!recommendationId) continue;

    const isKorean = (profile.locale || '').toLowerCase().startsWith('ko');
    const subject = isKorean ? '오늘의 스타일 추천' : 'Your Daily Style Recommendation';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #ffffff; padding: 32px;">
        <div style="max-width: 640px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 24px;">Style<span style="color:#13c8ec;">AI</span></h1>
            <p style="color: #8a8a8a; margin: 6px 0 0;">${isKorean ? 'AI 기반 데일리 스타일 추천' : 'AI-Powered Daily Styling'}</p>
          </div>
          <div style="background:#141414;border:1px solid #2c2c2c;border-radius:16px;padding:20px;">
            <h2 style="margin:0 0 8px;font-size:20px;">${isKorean ? '오늘의 스타일 추천' : 'Your Daily Style Recommendation'}</h2>
            <p style="color:#b3b3b3;margin:0 0 16px;">${dateStr}</p>
            <div style="background:#0f0f0f;border:1px solid #262626;border-radius:12px;padding:16px;">
              <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #eaeaea; line-height:1.6;">${recommendation}</pre>
            </div>
          </div>
          <p style="color:#6f6f6f;font-size:12px;text-align:center;margin-top:16px;">
            ${isKorean ? '이 이메일은 StyleAI에서 발송되었습니다.' : 'This email was sent by StyleAI.'}
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
