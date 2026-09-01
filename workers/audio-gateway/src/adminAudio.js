const ADMIN_ROLES = new Set(['admin', 'audio_admin', 'feedback_admin']);
const AUDIO_DIRECTORIES = new Set(['bible', 'gospels', 'readings']);
const SAFE_AUDIO_BASENAME = /^[\p{L}\p{N}_-]+\.mp3$/u;
const BIBLE_BASENAME = /^[a-z0-9]+_[1-9]\d{0,2}\.mp3$/;

export const validateAdminAudioKey = (value) => {
  if (typeof value !== 'string' || value.length > 180 || value.includes('..')) return null;
  const parts = value.normalize('NFC').split('/');
  if (parts.length !== 2 || !AUDIO_DIRECTORIES.has(parts[0])) return null;

  const [directory, filename] = parts;
  if (!SAFE_AUDIO_BASENAME.test(filename) || filename.toLowerCase().startsWith('gospel_')) return null;
  if (directory === 'bible' && !BIBLE_BASENAME.test(filename)) return null;
  if (directory !== 'readings' && /^(r1|r2)\.mp3$/i.test(filename)) return null;

  return `${directory}/${filename}`;
};

export const verifySupabaseAdmin = async (request, env) => {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;

  const user = await response.json();
  const role = user?.app_metadata?.role;
  if (!ADMIN_ROLES.has(role)) return null;

  const allowedEmails = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (allowedEmails.length && !allowedEmails.includes((user.email || '').toLowerCase())) return null;
  return user;
};

export const getMaxUploadBytes = (env) => {
  const configured = Number(env.ADMIN_MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : 50 * 1024 * 1024;
};

export const audioIndexKeyFromObject = (key) => {
  if (!key?.startsWith('bible/') || !key.endsWith('.mp3')) return null;
  return key.slice('bible/'.length, -'.mp3'.length);
};
