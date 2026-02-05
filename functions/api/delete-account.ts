import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTI_BOT_SECRET: string;
}

const allowedOrigins = [
  'https://buzzstyle.work',
  'https://www.buzzstyle.work',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const getCorsHeaders = (origin: string | null) => {
  if (!origin || !allowedOrigins.includes(origin)) {
    return null;
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AntiBot-Token',
    'Vary': 'Origin',
  };
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!context.env.ANTI_BOT_SECRET) {
      return new Response(JSON.stringify({ error: 'Missing ANTI_BOT_SECRET' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const ip = getClientIp(context.request);
    const limiter = rateLimit(`delete-account:${ip}`, 4, 60_000);
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

    const antiBotToken = context.request.headers.get('X-AntiBot-Token');
    if (!antiBotToken || !(await verifyAntiBotToken(context.env.ANTI_BOT_SECRET, ip, antiBotToken))) {
      return new Response(JSON.stringify({ error: 'Invalid anti-bot token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get the authorization header
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = authHeader.split(' ')[1];

    // First, get the user ID from the access token
    const userResponse = await fetch(
      `${context.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': context.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the user using Admin API
    const deleteResponse = await fetch(
      `${context.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': context.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      return new Response(
        JSON.stringify({ error: errorData.message || 'Failed to delete user' }),
        { status: deleteResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, {
    headers: corsHeaders,
  });
};
