const gatewayBase = () => (import.meta.env.VITE_AUDIO_GATEWAY_BASE || '').replace(/\/+$/, '');

let pendingSession = null;
let session = null;

const loadTurnstile = () => new Promise((resolve, reject) => {
  if (window.turnstile) return resolve(window.turnstile);
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => resolve(window.turnstile);
  script.onerror = () => reject(new Error('Không thể tải xác minh bảo mật'));
  document.head.appendChild(script);
});

const getTurnstileToken = async () => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  const turnstile = await loadTurnstile();
  const mount = document.createElement('div');
  mount.style.display = 'none';
  document.body.appendChild(mount);

  try {
    return await new Promise((resolve, reject) => {
      const widgetId = turnstile.render(mount, {
        sitekey: siteKey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: resolve,
        'error-callback': () => reject(new Error('Xác minh bảo mật không thành công')),
        'expired-callback': () => reject(new Error('Xác minh bảo mật đã hết hạn')),
      });
      turnstile.execute(widgetId);
    });
  } finally {
    mount.remove();
  }
};

const getSession = async () => {
  if (session?.expiresAt > Date.now() + 30_000) return session.token;
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const base = gatewayBase();
    const turnstileToken = await getTurnstileToken();
    const response = await fetch(`${base}/v1/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstileToken }),
    });
    if (!response.ok) throw new Error('Không thể tạo phiên nghe audio');
    const data = await response.json();
    session = { token: data.token, expiresAt: data.expiresAt * 1000 };
    return session.token;
  })();

  try {
    return await pendingSession;
  } finally {
    pendingSession = null;
  }
};

export const isAudioGatewayEnabled = () => Boolean(gatewayBase());

export const requestAudioGatewayTicket = async (request) => {
  const base = gatewayBase();
  if (!base) return null;

  try {
    const token = await getSession();
    let response = await fetch(`${base}/v1/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
    });
    if (response.status === 401) {
      session = null;
      const refreshed = await getSession();
      response = await fetch(`${base}/v1/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshed}` },
        body: JSON.stringify(request),
      });
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data?.exists && data.streamUrl ? data : null;
  } catch (error) {
    console.warn('⚠️ Không thể lấy quyền phát audio:', error.message);
    return null;
  }
};

export const isStandaloneIOSPwa = () => {
  if (typeof window === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  return isIOS && (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches);
};

export const requestLiturgyHlsStream = async ({ date, variant = 'weekday' }) => {
  const base = gatewayBase();
  if (!base) return null;

  try {
    const token = await getSession();
    let response = await fetch(`${base}/v1/hls-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, variant }),
    });
    if (response.status === 401) {
      session = null;
      const refreshed = await getSession();
      response = await fetch(`${base}/v1/hls-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshed}` },
        body: JSON.stringify({ date, variant }),
      });
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data?.exists && data.streamUrl ? data : null;
  } catch (error) {
    console.warn('⚠️ Không thể lấy quyền phát HLS:', error.message);
    return null;
  }
};
