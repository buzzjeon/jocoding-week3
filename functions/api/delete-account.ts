import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';
import { getCorsHeaders, handleCorsOptions } from './_cors';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTI_BOT_SECRET: string;
}

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

    if (!context.env.ANTI_BOT_SECRET) {
      return new Response(JSON.stringify({ error: 'Security configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
      console.error('[delete-account] Supabase delete error:', deleteResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user' }),
        { status: deleteResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[delete-account] Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestOptions: PagesFunction = async (context) => {
  return handleCorsOptions(context.request);
};
