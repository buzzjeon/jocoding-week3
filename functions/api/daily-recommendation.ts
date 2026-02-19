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

    // Generate new market trend using AI if not exists for today
    const prompt = `Act as an expert global e-commerce trend analyst.
Provide a concise "Daily Market Trend Insight" for sellers on Amazon, eBay, and Shopify.
The insight must include:
1. 🔥 Trending Product Categories of the Day
2. 💡 Hot Keyword of the Moment
3. 📦 Sourcing Tip (Where to find profitable items)
4. 🚀 Selling Strategy (How to beat competition today)

Keep the tone professional, high-value, and concise (under 200 words).
Use emojis for better readability.`;

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
    const trendText = aiData.choices[0].message.content;

    // Save to DB so all users see the same trend for today
    const { data: saved, error: dbError } = await supabase
      .from('daily_recommendations')
      .insert({
        recommendation_date: today,
        recommendation: trendText,
        user_id: user.id // Keeping for compatibility, though it's global trend
      })
      .select()
      .single();

    if (dbError) {
      console.error('Trend Save DB Error:', dbError);
      return new Response(JSON.stringify({ recommendation: { recommendation_date: today, recommendation: trendText } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ recommendation: saved }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Market Trend Error:', error);
    return new Response(JSON.stringify({ error: 'Market insight engine error' }), { status: 500 });
  }
};
