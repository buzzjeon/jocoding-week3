import { supabaseRequest } from './_supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const getUserIdFromToken = async (env: Env, token: string) => {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.id || null;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = await getUserIdFromToken(env, token);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const limit = Math.min(14, Math.max(1, Number(url.searchParams.get('limit') || 7)));
    const rows = await supabaseRequest(
      env,
      `daily_recommendations?user_id=eq.${userId}&order=recommendation_date.desc&limit=${limit}`
    );
    const latest = rows?.[0] || null;
    return new Response(JSON.stringify({ recommendation: latest, list: rows || [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch recommendation',
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
