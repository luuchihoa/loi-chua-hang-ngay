import fs from 'fs';
import path from 'path';
import https from 'https';

const DOMAIN = 'https://loichuamoingay.org';
const INDEXNOW_KEY = '4c9d8a1b2e3f4051a67890bcdef12345';

async function sendIndexNowPING(urls) {
  console.log('⚡ Đang phát thông báo PING Instant Indexing tới IndexNow API (Bing/Yandex)...');
  
  const payload = JSON.stringify({
    host: 'loichuamoingay.org',
    key: INDEXNOW_KEY,
    keyLocation: `${DOMAIN}/${INDEXNOW_KEY}.txt`,
    urlList: urls
  });

  return new Promise((resolve) => {
    const req = https.request('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 5000
    }, (res) => {
      console.log(`✅ IndexNow PING Response Status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.warn(`⚠️ IndexNow PING Warning: ${err.message}`);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

function initInstantIndexing() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Ghi tệp xác minh key vào public/
  fs.writeFileSync(path.join(publicDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, 'utf-8');
  console.log(`🔑 Đã tạo tệp xác minh IndexNow key tại public/${INDEXNOW_KEY}.txt`);

  // 2. Các đường dẫn PING lập chỉ mục siêu tốc
  const updatedUrls = [
    `${DOMAIN}/`,
    `${DOMAIN}/liturgy`,
    `${DOMAIN}/bible`,
    `${DOMAIN}/bible-audio`,
    `${DOMAIN}/calendar`
  ];

  sendIndexNowPING(updatedUrls);
}

initInstantIndexing();
