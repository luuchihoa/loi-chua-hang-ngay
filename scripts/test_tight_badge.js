import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/tranthithuynhi/.gemini/antigravity/brain/ae7f6581-d5ce-4531-b75b-b17ceab42e22';
const publicDir = '/Users/tranthithuynhi/loi-chua-hang-ngay/public';

async function measureAndTrim() {
  console.log("=== ĐO VÀ CẮT GỌN TỐI ĐA PHẦN SAU CHỮ ORG ===");

  // Let's create candidate badges with widths: 400, 420, 440, 460
  // and see which one has perfectly tight, symmetrical padding.
  
  // Let's test widths from 380px to 440px
  for (const w of [380, 400, 420, 440]) {
    const h = 100;
    const pad = 8;
    const capW = w - pad * 2;
    const capH = h - pad * 2;
    const rx = capH / 2;

    const svg = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCE881" />
            <stop offset="25%" stop-color="#CBA135" />
            <stop offset="50%" stop-color="#F5D76E" />
            <stop offset="75%" stop-color="#B8860B" />
            <stop offset="100%" stop-color="#E5C158" />
          </linearGradient>

          <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0a1128" stop-opacity="0.95" />
            <stop offset="50%" stop-color="#0f1b3f" stop-opacity="0.98" />
            <stop offset="100%" stop-color="#070c1e" stop-opacity="0.95" />
          </linearGradient>
        </defs>

        <rect x="${pad}" y="${pad}" width="${capW}" height="${capH}" rx="${rx}" fill="url(#badgeBg)" stroke="url(#goldGrad)" stroke-width="2.5" />
        
        <!-- Globe Icon at x=38 -->
        <circle cx="38" cy="${h / 2}" r="15" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" />
        <ellipse cx="38" cy="${h / 2}" rx="7.5" ry="15" fill="none" stroke="url(#goldGrad)" stroke-width="1.6" />
        <line x1="23" y1="${h / 2}" x2="53" y2="${h / 2}" stroke="url(#goldGrad)" stroke-width="1.6" />

        <!-- Domain text at x=64 -->
        <text x="64" y="${h / 2 + 9}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="26" font-weight="800" fill="url(#goldGrad)" letter-spacing="0.5">
          loichuamoingay.org
        </text>
      </svg>
    `;

    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    await sharp(buf).toFile(path.join(artifactDir, `badge_w${w}.png`));
    console.log(`Saved badge_w${w}.png`);
  }
}

measureAndTrim().catch(console.error);
