import { resolveAudioPath } from './audioPath.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const memoryLimits = new Map();

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
});

const base64urlEncode = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64urlDecode = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const getClientIp = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';

const allowedOrigins = (env) => (env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins(env).includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, HEAD, OPTIONS',
    Vary: 'Origin',
  };
};

const enforceOrigin = (request, env) => {
  const origin = request.headers.get('Origin');
  return !origin || allowedOrigins(env).includes(origin);
};

const getLimit = (kind) => ({ session: 6, ticket: 12, stream: 40 }[kind] || 12);

const isRateLimited = async (request, env, kind) => {
  const windowSeconds = 60;
  const key = `rl:${kind}:${getClientIp(request)}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const limit = getLimit(kind);

  if (env.AUDIO_RATE_LIMITS) {
    const current = Number(await env.AUDIO_RATE_LIMITS.get(key) || '0');
    if (current >= limit) return true;
    await env.AUDIO_RATE_LIMITS.put(key, String(current + 1), { expirationTtl: windowSeconds + 5 });
    return false;
  }

  const current = memoryLimits.get(key) || 0;
  if (current >= limit) return true;
  memoryLimits.set(key, current + 1);
  return false;
};

const getAesKey = (env) => crypto.subtle.importKey(
  'raw',
  base64urlDecode(env.AUDIO_TOKEN_ENCRYPTION_KEY),
  { name: 'AES-GCM' },
  false,
  ['encrypt', 'decrypt'],
);

const encryptTicket = async (payload, env) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getAesKey(env),
    encoder.encode(JSON.stringify(payload)),
  ));
  const token = new Uint8Array(iv.length + encrypted.length);
  token.set(iv);
  token.set(encrypted, iv.length);
  return base64urlEncode(token);
};

const decryptTicket = async (token, env) => {
  try {
    const raw = base64urlDecode(token);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12) },
      await getAesKey(env),
      raw.slice(12),
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
};

const getSessionKey = (env) => crypto.subtle.importKey(
  'raw',
  encoder.encode(env.AUDIO_SESSION_SIGNING_SECRET),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
);

const signSession = async (payload, env) => {
  const body = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await getSessionKey(env), encoder.encode(body));
  return `${body}.${base64urlEncode(new Uint8Array(signature))}`;
};

const verifySession = async (token, request, env) => {
  if (!token?.includes('.')) return null;
  const [body, signature] = token.split('.');
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getSessionKey(env),
      base64urlDecode(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(base64urlDecode(body)));
    return payload.exp > Math.floor(Date.now() / 1000) && payload.ip === getClientIp(request) ? payload : null;
  } catch {
    return null;
  }
};

const verifyTurnstile = async (token, request, env) => {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  body.append('remoteip', getClientIp(request));
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = await response.json();
  return result.success === true;
};

const parseRange = (value, size) => {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return 'invalid';
  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) return 'invalid';
  const start = startRaw ? Number(startRaw) : Math.max(0, size - Number(endRaw));
  const end = endRaw ? Math.min(Number(endRaw), size - 1) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) return 'invalid';
  return { offset: start, length: end - start + 1 };
};

const streamAudio = async (request, env, cors) => {
  if (await isRateLimited(request, env, 'stream')) return json({ error: 'Too many requests' }, 429, cors);
  const token = new URL(request.url).searchParams.get('token');
  const payload = token && await decryptTicket(token, env);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000) || payload.ip !== getClientIp(request)) {
    return json({ error: 'Audio token invalid or expired' }, 401, cors);
  }

  const objectHead = await env.AUDIO_BUCKET.head(payload.path);
  if (!objectHead) return json({ error: 'Audio not found' }, 404, cors);
  const range = parseRange(request.headers.get('Range'), objectHead.size);
  if (range === 'invalid') {
    return new Response(null, { status: 416, headers: { ...cors, 'Content-Range': `bytes */${objectHead.size}` } });
  }

  const object = await env.AUDIO_BUCKET.get(payload.path, range ? { range } : undefined);
  if (!object) return json({ error: 'Audio not found' }, 404, cors);
  const headers = new Headers(cors);
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (range) {
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${objectHead.size}`);
    headers.set('Content-Length', String(range.length));
  } else {
    headers.set('Content-Length', String(objectHead.size));
  }
  return new Response(request.method === 'HEAD' ? null : object.body, { status: range ? 206 : 200, headers });
};

const handleSession = async (request, env, cors) => {
  if (await isRateLimited(request, env, 'session')) return json({ error: 'Too many requests' }, 429, cors);
  const { turnstileToken } = await request.json().catch(() => ({}));
  if (!(await verifyTurnstile(turnstileToken, request, env))) return json({ error: 'Human verification failed' }, 403, cors);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.min(Math.max(Number(env.SESSION_TTL_SECONDS) || 1800, 300), 3600);
  const token = await signSession({ exp, ip: getClientIp(request) }, env);
  return json({ token, expiresAt: exp }, 200, cors);
};

const handleTicket = async (request, env, cors) => {
  if (await isRateLimited(request, env, 'ticket')) return json({ error: 'Too many requests' }, 429, cors);
  const authorization = request.headers.get('Authorization') || '';
  const session = await verifySession(authorization.replace(/^Bearer\s+/i, ''), request, env);
  if (!session) return json({ error: 'Audio session invalid or expired' }, 401, cors);
  const input = await request.json().catch(() => null);
  const path = input && resolveAudioPath(input);
  if (!path) return json({ error: 'Audio request invalid' }, 400, cors);
  const object = await env.AUDIO_BUCKET.head(path);
  if (!object) return json({ exists: false }, 404, cors);
  const exp = Math.floor(Date.now() / 1000) + Math.min(Math.max(Number(env.TICKET_TTL_SECONDS) || 120, 30), 300);
  const token = await encryptTicket({ path, exp, ip: getClientIp(request) }, env);
  return json({ exists: true, streamUrl: `${new URL(request.url).origin}/v1/stream?token=${encodeURIComponent(token)}`, expiresAt: exp }, 200, cors);
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!enforceOrigin(request, env)) return json({ error: 'Origin not allowed' }, 403, cors);
    if (!env.AUDIO_BUCKET || !env.AUDIO_TOKEN_ENCRYPTION_KEY || !env.AUDIO_SESSION_SIGNING_SECRET) {
      return json({ error: 'Audio gateway is not configured' }, 503, cors);
    }

    const pathname = new URL(request.url).pathname;
    if (request.method === 'POST' && pathname === '/v1/session') return handleSession(request, env, cors);
    if (request.method === 'POST' && pathname === '/v1/ticket') return handleTicket(request, env, cors);
    if ((request.method === 'GET' || request.method === 'HEAD') && pathname === '/v1/stream') return streamAudio(request, env, cors);
    return json({ error: 'Not found' }, 404, cors);
  },
};
