import { resolveAudioPath, resolveLiturgyHlsPrefix } from './audioPath.js';
import { AwsClient } from 'aws4fetch';

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

const objectUrl = (path, env) => {
  const endpoint = (env.R2_S3_ENDPOINT || `https://${env.R2_STORAGE_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
  const key = path.split('/').map(encodeURIComponent).join('/');
  return `${endpoint}/${encodeURIComponent(env.R2_BUCKET_NAME)}/${key}`;
};

// Cross-account R2 access is signed inside the Worker; credentials never reach the browser.
const fetchObject = (path, env, init) => new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: 's3',
  region: 'auto',
}).fetch(objectUrl(path, env), init);

const isObjectMissing = (response) => response.status === 404;

const streamAudio = async (request, env, cors) => {
  if (await isRateLimited(request, env, 'stream')) return json({ error: 'Too many requests' }, 429, cors);
  const token = new URL(request.url).searchParams.get('token');
  const payload = token && await decryptTicket(token, env);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000) || payload.ip !== getClientIp(request)) {
    return json({ error: 'Audio token invalid or expired' }, 401, cors);
  }

  const range = request.headers.get('Range');
  const object = await fetchObject(payload.path, env, {
    method: request.method,
    headers: range ? { Range: range } : undefined,
  });
  if (isObjectMissing(object)) return json({ error: 'Audio not found' }, 404, cors);
  if (object.status === 416) {
    const headers = new Headers(cors);
    const contentRange = object.headers.get('Content-Range');
    if (contentRange) headers.set('Content-Range', contentRange);
    return new Response(null, { status: 416, headers });
  }
  if (!object.ok && object.status !== 206) return json({ error: 'Audio storage unavailable' }, 503, cors);
  const headers = new Headers(cors);
  headers.set('Content-Type', object.headers.get('Content-Type') || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  for (const name of ['Content-Length', 'Content-Range', 'Last-Modified', 'ETag']) {
    const value = object.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(request.method === 'HEAD' ? null : object.body, { status: object.status, headers });
};

const HLS_FILE_TYPES = {
  'index.m3u8': 'application/vnd.apple.mpegurl; charset=utf-8',
  'init.mp4': 'video/mp4',
};

const isSafeHlsFile = (value) => value === 'index.m3u8'
  || value === 'init.mp4'
  || /^segment-\d{5}\.m4s$/.test(value || '');

const hlsContentType = (filename) => HLS_FILE_TYPES[filename] || 'video/iso.segment';

const streamHls = async (request, env, cors) => {
  if (await isRateLimited(request, env, 'stream')) return json({ error: 'Too many requests' }, 429, cors);
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const file = url.searchParams.get('file') || 'index.m3u8';
  const payload = token && await decryptTicket(token, env);

  if (!payload || payload.scope !== 'hls' || payload.exp < Math.floor(Date.now() / 1000)
    || payload.ip !== getClientIp(request) || !isSafeHlsFile(file)) {
    return json({ error: 'HLS token invalid or expired' }, 401, cors);
  }

  const object = await fetchObject(`${payload.prefix}/${file}`, env, {
    method: request.method,
    headers: request.headers.get('Range') ? { Range: request.headers.get('Range') } : undefined,
  });
  if (isObjectMissing(object)) return json({ error: 'HLS stream not found' }, 404, cors);
  if (!object.ok && object.status !== 206) return json({ error: 'Audio storage unavailable' }, 503, cors);

  const headers = new Headers(cors);
  headers.set('Content-Type', hlsContentType(file));
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  for (const name of ['Content-Length', 'Content-Range', 'Last-Modified', 'ETag']) {
    const value = object.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (file !== 'index.m3u8' || request.method === 'HEAD') {
    return new Response(request.method === 'HEAD' ? null : object.body, { status: object.status, headers });
  }

  const playlist = await object.text();
  const base = new URL(request.url).origin;
  const streamUrlFor = (filename) => `${base}/v1/hls?token=${encodeURIComponent(token)}&file=${encodeURIComponent(filename)}`;
  const rewritten = playlist.split('\n').map((line) => {
    const filename = line.trim();
    if (filename.startsWith('#EXT-X-MAP:')) {
      return line.replace(/URI="([^"]+)"/, (match, value) => (isSafeHlsFile(value) ? `URI="${streamUrlFor(value)}"` : match));
    }
    if (!filename || filename.startsWith('#') || !isSafeHlsFile(filename)) return line;
    return streamUrlFor(filename);
  }).join('\n');
  headers.delete('Content-Length');
  return new Response(rewritten, { status: 200, headers });
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
  const exp = Math.floor(Date.now() / 1000) + Math.min(Math.max(Number(env.TICKET_TTL_SECONDS) || 120, 30), 300);
  const token = await encryptTicket({ path, exp, ip: getClientIp(request) }, env);
  return json({ exists: true, streamUrl: `${new URL(request.url).origin}/v1/stream?token=${encodeURIComponent(token)}`, expiresAt: exp }, 200, cors);
};

const handleHlsTicket = async (request, env, cors) => {
  if (await isRateLimited(request, env, 'ticket')) return json({ error: 'Too many requests' }, 429, cors);
  const authorization = request.headers.get('Authorization') || '';
  const session = await verifySession(authorization.replace(/^Bearer\s+/i, ''), request, env);
  if (!session) return json({ error: 'Audio session invalid or expired' }, 401, cors);

  const input = await request.json().catch(() => null);
  const prefix = input && resolveLiturgyHlsPrefix(input);
  if (!prefix) return json({ error: 'HLS request invalid' }, 400, cors);

  const playlist = await fetchObject(`${prefix}/index.m3u8`, env, { method: 'HEAD' });
  if (isObjectMissing(playlist)) return json({ exists: false }, 200, cors);
  if (!playlist.ok) return json({ error: 'Audio storage unavailable' }, 503, cors);

  const exp = Math.floor(Date.now() / 1000) + 7200;
  const token = await encryptTicket({ scope: 'hls', prefix, exp, ip: getClientIp(request) }, env);
  return json({
    exists: true,
    streamUrl: `${new URL(request.url).origin}/v1/hls?token=${encodeURIComponent(token)}`,
    expiresAt: exp,
  }, 200, cors);
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!enforceOrigin(request, env)) return json({ error: 'Origin not allowed' }, 403, cors);
    if (!env.R2_STORAGE_ACCOUNT_ID || !env.R2_BUCKET_NAME || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY
      || !env.AUDIO_TOKEN_ENCRYPTION_KEY || !env.AUDIO_SESSION_SIGNING_SECRET) {
      return json({ error: 'Audio gateway is not configured' }, 503, cors);
    }

    const pathname = new URL(request.url).pathname;
    if (request.method === 'POST' && pathname === '/v1/session') return handleSession(request, env, cors);
    if (request.method === 'POST' && pathname === '/v1/ticket') return handleTicket(request, env, cors);
    if (request.method === 'POST' && pathname === '/v1/hls-ticket') return handleHlsTicket(request, env, cors);
    if ((request.method === 'GET' || request.method === 'HEAD') && pathname === '/v1/stream') return streamAudio(request, env, cors);
    if ((request.method === 'GET' || request.method === 'HEAD') && pathname === '/v1/hls') return streamHls(request, env, cors);
    return json({ error: 'Not found' }, 404, cors);
  },
};
