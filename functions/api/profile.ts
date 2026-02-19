import { getClientIp, rateLimit } from './_antibot';
import { supabaseRequest } from './_supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const getUserIdFromToken = async (env: Env, token: string): Promise<string | null> => {
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = getClientIp(request);
  const limiter = rateLimit(`profile:${ip}`, 20, 60_000);
  if (!limiter.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: limiter.retryAfter }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(limiter.retryAfter),
        ...corsHeaders,
      },
    });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const accessToken = authHeader.split(' ')[1];
    const authenticatedUserId = await getUserIdFromToken(env, accessToken);
    if (!authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await request.json() as {
      userId?: string;
      email?: string;
      locale?: string;
      timezone?: string;
      unitSystem?: string;
      gender?: string;
      heightCm?: number;
      weightKg?: number;
      stylePreferences?: Record<string, unknown>;
    };

    if (body.userId && body.userId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'userId does not match authenticated user' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const cf = (request as Request & { cf?: Record<string, unknown> }).cf || {};
    const location = {
      city: cf.city || null,
      country: cf.country || null,
      latitude: cf.latitude || null,
      longitude: cf.longitude || null,
      timezone: cf.timezone || null,
    };

    const payload = {
      user_id: authenticatedUserId,
      email: body.email || null,
      locale: body.locale || null,
      timezone: body.timezone || location.timezone || null,
      unit_system: body.unitSystem || 'metric',
      gender: body.gender || null,
      height_cm: body.heightCm || null,
      weight_kg: body.weightKg || null,
      style_preferences: body.stylePreferences || null,
      last_location: location,
      updated_at: new Date().toISOString(),
    };

    await supabaseRequest(env, `user_profiles?on_conflict=user_id`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to update profile',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
