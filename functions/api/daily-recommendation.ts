import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, handleCorsOptions } from './_cors';
import { getClientIp, rateLimit } from './_antibot';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
}

export const onRequestOptions: PagesFunction = async (context) => {
  return handleCorsOptions(context.request);
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const headers = (extra: Record<string, string> = {}) => ({
    'Content-Type': 'application/json',
    ...(corsHeaders || {}),
    ...extra,
  });

  const ip = getClientIp(request);
  const limiter = rateLimit(`daily-rec:${ip}`, 10, 60_000);
  if (!limiter.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: limiter.retryAfter }), {
      status: 429,
      headers: headers({ 'Retry-After': String(limiter.retryAfter) }),
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers() });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: headers() });
  }

  // Fetch or generate daily brand marketing content
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('daily_recommendations')
      .select('*')
      .eq('recommendation_date', today)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ recommendation: existing }), { headers: headers() });
    }

    // Fetch user's brand profile for personalized content
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('brand_name, industry, target_audience, brand_tone, platforms')
      .eq('user_id', user.id)
      .single();

    const brandContext = profile
      ? `Brand: ${profile.brand_name || 'Unknown'}, Industry: ${profile.industry || 'General'}, Target Audience: ${profile.target_audience || 'General'}, Tone: ${profile.brand_tone || 'professional'}, Platforms: ${(profile.platforms || []).join(', ') || 'Instagram, Twitter'}`
      : 'No brand profile set — provide general marketing content for a small business.';

    const prompt = `You are BrandForge AI, a brand marketing content strategist.
Based on this brand context: ${brandContext}

Create today's Daily Marketing Content Briefing. Include:
1. **Content Theme of the Day** (a hook or angle to build today's posts around)
2. **Instagram Post** (caption + hashtag suggestions)
3. **Twitter/X Post** (concise, engaging tweet)
4. **LinkedIn Post** (professional thought-leadership style)
5. **Trending Angle** (how to tie the brand into today's trends or seasonal events)

Keep it actionable, brand-aligned, and ready-to-post. Under 300 words total.
Format clearly with section headers.`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      }),
    });

    const aiData: any = await aiRes.json();
    const recommendation = aiData.choices?.[0]?.message?.content || '';

    if (!recommendation) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: 502, headers: headers() });
    }

    // Save to DB with user_id
    const { data: saved, error: dbError } = await supabase
      .from('daily_recommendations')
      .insert({
        recommendation_date: today,
        recommendation,
        user_id: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[daily-recommendation] DB Error:', dbError);
      return new Response(JSON.stringify({ recommendation: { recommendation_date: today, recommendation } }), {
        headers: headers(),
      });
    }

    return new Response(JSON.stringify({ recommendation: saved }), { headers: headers() });

  } catch (error) {
    console.error('[daily-recommendation] Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: headers() });
  }
};
