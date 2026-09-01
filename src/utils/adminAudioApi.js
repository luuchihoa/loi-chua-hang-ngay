const gatewayBase = () => (import.meta.env.VITE_AUDIO_GATEWAY_BASE || '').replace(/\/+$/, '');

const readError = async (response, fallback) => {
  const data = await response.json().catch(() => null);
  return data?.error || fallback;
};

export const checkAdminAudioObjects = async (accessToken, keys) => {
  const base = gatewayBase();
  if (!base) throw new Error('Chưa cấu hình VITE_AUDIO_GATEWAY_BASE.');
  const objects = [];
  for (let offset = 0; offset < keys.length; offset += 40) {
    const response = await fetch(`${base}/v1/admin/audio/status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: keys.slice(offset, offset + 40) }),
    });
    if (!response.ok) throw new Error(await readError(response, 'Không thể kiểm tra dữ liệu R2.'));
    objects.push(...((await response.json()).objects || []));
  }
  return objects;
};

export const uploadAdminAudio = ({ accessToken, file, key, overwrite, onProgress }) => new Promise((resolve, reject) => {
  const base = gatewayBase();
  if (!base) {
    reject(new Error('Chưa cấu hình VITE_AUDIO_GATEWAY_BASE.'));
    return;
  }

  const request = new XMLHttpRequest();
  request.open('PUT', `${base}/v1/admin/audio?key=${encodeURIComponent(key)}`);
  request.setRequestHeader('Authorization', `Bearer ${accessToken}`);
  request.setRequestHeader('Content-Type', 'audio/mpeg');
  request.setRequestHeader('X-Audio-Overwrite', overwrite ? 'true' : 'false');
  request.upload.onprogress = (event) => {
    if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
  };
  request.onerror = () => reject(new Error('Mất kết nối khi tải file lên.'));
  request.onload = () => {
    const data = (() => {
      try { return JSON.parse(request.responseText); } catch { return null; }
    })();
    if (request.status >= 200 && request.status < 300) resolve(data);
    else reject(new Error(data?.error || `Upload thất bại (${request.status}).`));
  };
  request.send(file);
});
