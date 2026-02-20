/**
 * Shared CORS configuration for BrandForge API endpoints.
 * Single source of truth — all API files import from here.
 */

const ALLOWED_ORIGINS = [
  'https://brandforge.buzzstyle.work',
  'https://www.brandforge.buzzstyle.work',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export const getCorsHeaders = (
  origin: string | null,
  options: { isSandbox?: boolean } = {},
): Record<string, string> | null => {
  if (!origin) return null;
  const { isSandbox = false } = options;
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.cloudworkstations.dev') ||
    (isSandbox && origin.endsWith('.pages.dev'));
  if (!allowed) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AntiBot-Token',
    'Vary': 'Origin',
  };
};

export const handleCorsOptions = (
  request: Request,
  options: { isSandbox?: boolean } = {},
): Response => {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin, options);
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders });
};
