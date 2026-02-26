import { runDailyRecommendations } from '../_scheduled';

interface Env {
  DAILY_RECOMMEND_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token');
  if (!env.DAILY_RECOMMEND_SECRET || token !== env.DAILY_RECOMMEND_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await runDailyRecommendations(env);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to run daily recommendations',
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
