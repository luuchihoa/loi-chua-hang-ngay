import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/tranthithuynhi/.gemini/antigravity/brain/ae7f6581-d5ce-4531-b75b-b17ceab42e22';
const publicDir = '/Users/tranthithuynhi/loi-chua-hang-ngay/public';
const logoPath = path.join(artifactDir, 'logo_loi_chua_moi_ngay_circle.png');

async function createWebsiteBanner() {
  console.log("=== TẠO KHUNG ẢNH CHIA SẺ & BANNER CHỨA LINK WEBSITE loichuamoingay.org ===");

  // 1. Kích thước chuẩn Open Graph / Facebook / Zalo Social Share (1200 x 630 px)
  const width = 1200;
  const height = 630;

  // Prepare resized logo (diameter 380px)
  const logoSize = 380;
  const logoBuffer = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .toBuffer();

  // Create Luxury Catholic Gold & Royal Navy Background Frame SVG
  const svgFrame = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradients -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a1128" />
          <stop offset="50%" stop-color="#0f1b3f" />
          <stop offset="100%" stop-color="#070c1e" />
        </linearGradient>

        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FCE881" />
          <stop offset="25%" stop-color="#CBA135" />
          <stop offset="50%" stop-color="#F5D76E" />
          <stop offset="75%" stop-color="#B8860B" />
          <stop offset="100%" stop-color="#E5C158" />
        </linearGradient>

        <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#CBA135" />
          <stop offset="50%" stop-color="#F5D76E" />
          <stop offset="100%" stop-color="#CBA135" />
        </linearGradient>

        <radialGradient id="glowGrad" cx="30%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#cba135" stop-opacity="0.25" />
          <stop offset="60%" stop-color="#cba135" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.7"/>
        </filter>
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#fce881" flood-opacity="0.4"/>
        </filter>
      </defs>

      <!-- Background with Rich Royal Navy Texture -->
      <rect width="100%" height="100%" fill="url(#bgGrad)" />
      
      <!-- Ambient Glow Behind Logo -->
      <circle cx="270" cy="315" r="280" fill="url(#glowGrad)" />

      <!-- Outer Luxury Double Border -->
      <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-opacity="0.85" />
      <rect x="36" y="36" width="1128" height="558" rx="20" fill="none" stroke="url(#goldGrad)" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="8 6" />

      <!-- Corner Liturgical Flourishes -->
      <path d="M 50 85 L 85 85 L 85 50" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="85" cy="85" r="3.5" fill="url(#goldGrad)" />

      <path d="M 1150 85 L 1115 85 L 1115 50" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="1115" cy="85" r="3.5" fill="url(#goldGrad)" />

      <path d="M 50 545 L 85 545 L 85 580" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="85" cy="545" r="3.5" fill="url(#goldGrad)" />

      <path d="M 1150 545 L 1115 545 L 1115 580" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="1115" cy="545" r="3.5" fill="url(#goldGrad)" />

      <!-- Right Content Side Typography -->
      <!-- Sub-headline -->
      <text x="510" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#E5C158" letter-spacing="6">
        PHỤNG VỤ &amp; KINH THÁNH CÔNG GIÁO
      </text>

      <!-- Main App Title -->
      <text x="510" y="285" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#FFFFFF" letter-spacing="1">
        Lời Chúa Mỗi Ngày
      </text>

      <!-- Description / Value Props -->
      <text x="510" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#cbd5e1" letter-spacing="0.5">
        ✦ Bài Đọc Phụng Vụ &#160;&#160;✦ Trọn Bộ 73 Sách Kinh Thánh &#160;&#160;✦ Audio Đọc
      </text>

      <!-- Website URL Badge Capsule -->
      <g filter="url(#shadow)">
        <rect x="510" y="390" width="460" height="74" rx="37" fill="#0f1b3f" stroke="url(#goldGrad)" stroke-width="2.5" />
        
        <!-- Globe Icon SVG embedded -->
        <circle cx="552" cy="427" r="16" fill="none" stroke="url(#goldGrad)" stroke-width="2" />
        <ellipse cx="552" cy="427" rx="8" ry="16" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" />
        <line x1="536" y1="427" x2="568" y2="427" stroke="url(#goldGrad)" stroke-width="1.8" />

        <!-- Domain text -->
        <text x="585" y="437" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" fill="url(#goldGrad)" letter-spacing="1.5">
          loichuamoingay.org
        </text>
      </g>

      <!-- Bottom Tagline -->
      <text x="515" y="515" font-family="Georgia, serif" font-style="italic" font-size="19" fill="#94a3b8">
        “Lời Chúa là ngọn đèn soi cho con bước, là ánh sáng chỉ đường con đi.” (Tv 119,105)
      </text>
    </svg>
  `);

  // Composite SVG Background + Logo Image
  const logoLeft = 80;
  const logoTop = Math.round((height - logoSize) / 2); // (630 - 380) / 2 = 125

  const finalImageBuffer = await sharp(svgFrame)
    .composite([
      {
        input: logoBuffer,
        left: logoLeft,
        top: logoTop
      }
    ])
    .png()
    .toBuffer();

  // Save to Artifact directory for user download & preview
  const artifactBannerPath = path.join(artifactDir, 'khung_anh_loichuamoingay.png');
  await sharp(finalImageBuffer).toFile(artifactBannerPath);
  console.log(`✅ Đã tạo Banner Khung Ảnh (1200x630): ${artifactBannerPath}`);

  // Save to public directory for OpenGraph & Web Share
  const publicOgPath = path.join(publicDir, 'og-image.png');
  await sharp(finalImageBuffer).toFile(publicOgPath);
  console.log(`✅ Đã cập nhật OpenGraph Image: ${publicOgPath}`);

  // 2. Tạo thêm Phiên Bản Khung Vuông Poster (1080 x 1080 px) cho Avatar / Instagram / Zalo Post
  const squareSize = 1080;
  const squareLogoSize = 520;
  const squareLogoBuffer = await sharp(logoPath)
    .resize(squareLogoSize, squareLogoSize, { fit: 'contain' })
    .toBuffer();

  const squareSvgFrame = Buffer.from(`
    <svg width="${squareSize}" height="${squareSize}" viewBox="0 0 ${squareSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sqBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a1128" />
          <stop offset="50%" stop-color="#0f1b3f" />
          <stop offset="100%" stop-color="#070c1e" />
        </linearGradient>

        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FCE881" />
          <stop offset="25%" stop-color="#CBA135" />
          <stop offset="50%" stop-color="#F5D76E" />
          <stop offset="75%" stop-color="#B8860B" />
          <stop offset="100%" stop-color="#E5C158" />
        </linearGradient>

        <radialGradient id="sqGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#cba135" stop-opacity="0.3" />
          <stop offset="70%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#sqBg)" />
      <circle cx="540" cy="410" r="380" fill="url(#sqGlow)" />

      <!-- Borders -->
      <rect x="36" y="36" width="1008" height="1008" rx="36" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" stroke-opacity="0.85" />
      <rect x="52" y="52" width="976" height="976" rx="26" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.4" stroke-dasharray="10 8" />

      <!-- Top Text -->
      <text x="540" y="115" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#E5C158" letter-spacing="8">
        PHỤNG VỤ &amp; KINH THÁNH CÔNG GIÁO
      </text>

      <!-- Title Below Logo -->
      <text x="540" y="750" text-anchor="middle" font-family="Georgia, serif" font-size="58" font-weight="bold" fill="#FFFFFF" letter-spacing="1">
        Lời Chúa Mỗi Ngày
      </text>

      <text x="540" y="805" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#cbd5e1" letter-spacing="0.5">
        Bài Đọc Phụng Vụ • 73 Sách Kinh Thánh • Audio Lời Chúa
      </text>

      <!-- Website Capsule Badge -->
      <g filter="url(#shadow)">
        <rect x="290" y="855" width="500" height="82" rx="41" fill="#0f1b3f" stroke="url(#goldGrad)" stroke-width="3" />
        
        <circle cx="340" cy="896" r="18" fill="none" stroke="url(#goldGrad)" stroke-width="2.2" />
        <ellipse cx="340" cy="896" rx="9" ry="18" fill="none" stroke="url(#goldGrad)" stroke-width="2" />
        <line x1="322" y1="896" x2="358" y2="896" stroke="url(#goldGrad)" stroke-width="2" />

        <text x="375" y="907" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800" fill="url(#goldGrad)" letter-spacing="2">
          loichuamoingay.org
        </text>
      </g>

      <!-- Bottom Tagline -->
      <text x="540" y="990" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="20" fill="#94a3b8">
        “Lời Chúa là ngọn đèn soi cho con bước” (Tv 119,105)
      </text>
    </svg>
  `);

  const squareLogoLeft = Math.round((squareSize - squareLogoSize) / 2); // (1080 - 520) / 2 = 280
  const squareLogoTop = 150;

  const finalSquareBuffer = await sharp(squareSvgFrame)
    .composite([
      {
        input: squareLogoBuffer,
        left: squareLogoLeft,
        top: squareLogoTop
      }
    ])
    .png()
    .toBuffer();

  const artifactSquarePath = path.join(artifactDir, 'khung_anh_vuong_loichuamoingay.png');
  await sharp(finalSquareBuffer).toFile(artifactSquarePath);
  console.log(`✅ Đã tạo Khung Ảnh Vuông (1080x1080): ${artifactSquarePath}`);

  const publicSquarePath = path.join(publicDir, 'share-card-square.png');
  await sharp(finalSquareBuffer).toFile(publicSquarePath);
  console.log(`✅ Đã lưu Public Square Share Card: ${publicSquarePath}`);

  console.log("\n🎉 HOÀN TẤT TẤT CẢ CÁC BẢN THIẾT KẾ KHUNG ẢNH CHỨA LINK WEBSITE!");
}

createWebsiteBanner().catch(console.error);
