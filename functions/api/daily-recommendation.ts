import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
  }

  // Fetch or generate daily market trend
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('daily_recommendations')
      .select('*')
      .eq('recommendation_date', today)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ recommendation: existing }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If not exists, generate new trend using AI
    const prompt = `Act as a global e-commerce trend analyst. 
Provide a concise 'Daily Market Trend Insight' for sellers on Amazon, eBay, and Shopify.
Include:
1. Trending Keyword of the Day (Max 10 words)
2. Hot Category Insight (What's rising today?)
3. Sourcing Tip (Where to find high-margin items)
4. Selling Point Advice (What customers want today)

Keep it professional, high-value, and concise (under 200 words). 
Format for clear reading with emojis.`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
    });

    const aiData: any = await aiRes.json();
    const recommendation = aiData.choices[0].message.content;

    // Save to DB
    const { data: saved, error: dbError } = await supabase
      .from('daily_recommendations')
      .insert({
        recommendation_date: today,
        recommendation,
        user_id: user.id // Keeping for history, though it's global trend
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      return new Response(JSON.stringify({ recommendation: { recommendation_date: today, recommendation } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ recommendation: saved }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily Recommendation Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
