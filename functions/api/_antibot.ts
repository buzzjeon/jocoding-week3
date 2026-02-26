const encoder = new TextEncoder();

// TODO: In-memory rate limiting is per-isolate on Cloudflare Workers and is
// ineffective under distributed load. Migrate to Cloudflare KV or Durable Objects
// for production-grade rate limiting.
// Example: https://developers.cloudflare.com/workers/runtime-apis/kv/
type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const BUCKET_CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

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

  // Periodically purge expired buckets to prevent unbounded memory growth
  if (now - lastCleanup > BUCKET_CLEANUP_INTERVAL) {
    for (const [k, v] of rateLimitBuckets) {
      if (v.resetAt <= now) rateLimitBuckets.delete(k);
    }
    lastCleanup = now;
  }

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
  if (typeof token !== 'string' || token.length > 512) return false;

  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const expiresAtRaw = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAt || !signature || Number.isNaN(expiresAt)) {
    return false;
  }
  if (Date.now() > expiresAt) {
    return false;
  }

  const expected = await hmacSign(secret, `${expiresAt}.${ip}`);
  // Constant-time comparison via HMAC to prevent timing attacks.
  // Both values are re-signed with a random key so the comparison
  // of the resulting MACs runs in constant time regardless of input.
  if (expected.length !== signature.length) return false;
  const key = await crypto.subtle.importKey(
    'raw', crypto.getRandomValues(new Uint8Array(32)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(expected)),
    crypto.subtle.sign('HMAC', key, encoder.encode(signature)),
  ]);
  const a = new Uint8Array(sigA);
  const b = new Uint8Array(sigB);
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
};
