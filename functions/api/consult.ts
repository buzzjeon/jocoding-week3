import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  OPENAI_API_KEY: string;
  ANTI_BOT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AntiBot-Token',
};

export const onRequestOptions: PagesFunction = () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = getClientIp(request);

  if (rateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body: any = await request.json();
    const { photo, gender: category, height: targetMarket, weight: targetPrice, unitSystem, lang } = body || {};

    if (!photo) {
      return new Response(JSON.stringify({ error: 'Product photo is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const isKorean = lang === 'ko';
    const listingStyle = unitSystem === 'metric' ? 'Professional SEO optimized' : 'Creative, catchy, and high-converting';
    
    const prompt = `You are an expert global e-commerce listing consultant for platforms like Amazon, eBay, and Shopify.
Analyze the provided product image and generate a high-quality sales listing.

Product Context:
- Category: ${category}
- Target Market: ${targetMarket}
- Target Price: ${targetPrice} USD
- Style: ${listingStyle}

Please provide the following sections in your response:
1. Recommended SEO Title (Max 200 characters, optimized for search)
2. 5 Key Product Features (Bullet points highlighting unique value propositions)
3. Product Description (Compelling storytelling emphasizing quality, utility, and benefits)
4. 20 Optimized Search Keywords/Tags (Separated by commas)
5. Pricing & Competition Insight (Brief comment on the competitiveness of ${targetPrice} USD in ${targetMarket})

Language: Please write the entire report in ${isKorean ? 'Korean' : 'English'}.
Format: Use clear Markdown headings and bullet points. Do not include introductory or concluding conversational text.`;

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
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: photo } }
            ],
          },
        ],
        max_tokens: 1500,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('OpenAI Error:', data);
      return new Response(JSON.stringify({ error: 'AI Analysis failed. Please try again later.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      report: data.choices[0].message.content,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Consult API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
