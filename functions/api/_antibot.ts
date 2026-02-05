const encoder = new TextEncoder();

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const hmacSign = async (secret: string, data: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(signature);
};

export const getClientIp = (request: Request) => {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown'
  );
};

export const rateLimit = (key: string, max: number, windowMs: number) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= max) {
    const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
};

export const createAntiBotToken = async (secret: string, ip: string, ttlMs: number) => {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${expiresAt}.${ip}`;
  const signature = await hmacSign(secret, payload);
  return { token: `${expiresAt}.${signature}`, expiresAt };
};

export const verifyAntiBotToken = async (secret: string, ip: string, token: string) => {
  const [expiresAtRaw, signature] = token.split('.');
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAt || !signature || Number.isNaN(expiresAt)) {
    return false;
  }
  if (Date.now() > expiresAt) {
    return false;
  }

  const expected = await hmacSign(secret, `${expiresAt}.${ip}`);
  return expected === signature;
};
