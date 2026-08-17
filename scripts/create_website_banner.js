import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/tranthithuynhi/.gemini/antigravity/brain/ae7f6581-d5ce-4531-b75b-b17ceab42e22';
const publicDir = '/Users/tranthithuynhi/loi-chua-hang-ngay/public';
const logoPath = path.join(artifactDir, 'logo_loi_chua_moi_ngay_circle.png');

async function createBannersAndBadges() {
  console.log("=== TẠO LẠI BANNER KHÔNG TRÀN CHỮ & CẮT RIÊNG VIỀN BADGE WEBSITE ===");

  // =========================================================================
  // 1. BANNER NGANG 1200 x 630 px (ĐÃ SỬA TRIỆT ĐỂ LỖI TRÀN CHỮ)
  // =========================================================================
  const width = 1200;
  const height = 630;
  const logoSize = 380;
  const logoBuffer = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .toBuffer();

  const svgHorizontal = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
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

        <radialGradient id="glowGrad" cx="28%" cy="50%" r="45%">
          <stop offset="0%" stop-color="#cba135" stop-opacity="0.28" />
          <stop offset="60%" stop-color="#cba135" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.75"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bgGrad)" />
      
      <!-- Halo Glow -->
      <circle cx="270" cy="315" r="280" fill="url(#glowGrad)" />

      <!-- Double Borders -->
      <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-opacity="0.85" />
      <rect x="36" y="36" width="1128" height="558" rx="20" fill="none" stroke="url(#goldGrad)" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="8 6" />

      <!-- Corner Flourishes -->
      <path d="M 50 85 L 85 85 L 85 50" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="85" cy="85" r="3.5" fill="url(#goldGrad)" />

      <path d="M 1150 85 L 1115 85 L 1115 50" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="1115" cy="85" r="3.5" fill="url(#goldGrad)" />

      <path d="M 50 545 L 85 545 L 85 580" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="85" cy="545" r="3.5" fill="url(#goldGrad)" />

      <path d="M 1150 545 L 1115 545 L 1115 580" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
      <circle cx="1115" cy="545" r="3.5" fill="url(#goldGrad)" />

      <!-- Right Content Side Typography -->
      <!-- Category Tag -->
      <text x="500" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#E5C158" letter-spacing="5">
        PHỤNG VỤ &amp; KINH THÁNH CÔNG GIÁO
      </text>

      <!-- Main Title -->
      <text x="500" y="265" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="#FFFFFF" letter-spacing="1">
        Lời Chúa Mỗi Ngày
      </text>

      <!-- Feature Bullets -->
      <text x="500" y="318" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="400" fill="#cbd5e1" letter-spacing="0.3">
        ✦ Bài Đọc Phụng Vụ &#160;&#160;✦ 73 Sách Kinh Thánh &#160;&#160;✦ Audio Lời Chúa
      </text>

      <!-- Website Capsule Badge -->
      <g filter="url(#shadow)">
        <rect x="500" y="360" width="460" height="74" rx="37" fill="#0f1b3f" stroke="url(#goldGrad)" stroke-width="2.5" />
        
        <circle cx="542" cy="397" r="16" fill="none" stroke="url(#goldGrad)" stroke-width="2" />
        <ellipse cx="542" cy="397" rx="8" ry="16" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" />
        <line x1="526" y1="397" x2="558" y2="397" stroke="url(#goldGrad)" stroke-width="1.8" />

        <text x="575" y="407" font-family="system-ui, -apple-system, sans-serif" font-size="29" font-weight="800" fill="url(#goldGrad)" letter-spacing="1.5">
          loichuamoingay.org
        </text>
      </g>

      <!-- Bottom Tagline (Multi-line cleanly indented without overflowing) -->
      <text x="500" y="485" font-family="Georgia, serif" font-style="italic" font-size="18" fill="#94a3b8">
        “Lời Chúa là ngọn đèn soi cho con bước,
      </text>
      <text x="500" y="515" font-family="Georgia, serif" font-style="italic" font-size="18" fill="#94a3b8">
        là ánh sáng chỉ đường con đi.” (Tv 119,105)
      </text>
    </svg>
  `);

  const logoLeft = 80;
  const logoTop = Math.round((height - logoSize) / 2);

  const horizontalBuffer = await sharp(svgHorizontal)
    .composite([
      {
        input: logoBuffer,
        left: logoLeft,
        top: logoTop
      }
    ])
    .png()
    .toBuffer();

  const artifactBannerPath = path.join(artifactDir, 'khung_anh_loichuamoingay.png');
  await sharp(horizontalBuffer).toFile(artifactBannerPath);
  console.log(`✅ Đã cập nhật Banner Ngang (Chuẩn 1200x630): ${artifactBannerPath}`);

  const publicOgPath = path.join(publicDir, 'og-image.png');
  await sharp(horizontalBuffer).toFile(publicOgPath);
  console.log(`✅ Đã cập nhật public/og-image.png`);

  // =========================================================================
  // 2. CẮT RIÊNG KHUNG VIỀN CHỨA LINK WEBSITE (STANDALONE BADGE TRANSPARENT PNG)
  // =========================================================================
  // Kích thước chuẩn badge: 640 x 140 px (Ultra HD Vector Badge)
  const badgeWidth = 640;
  const badgeHeight = 140;

  const svgBadge = Buffer.from(`
    <svg width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
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

        <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>

      <!-- Standalone Capsule Badge with luxury gold rim and dark navy core -->
      <g filter="url(#badgeShadow)">
        <rect x="20" y="20" width="${badgeWidth - 40}" height="${badgeHeight - 40}" rx="${(badgeHeight - 40) / 2}" fill="url(#badgeBg)" stroke="url(#goldGrad)" stroke-width="3.5" />
        
        <!-- Globe Icon -->
        <circle cx="75" cy="${badgeHeight / 2}" r="22" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
        <ellipse cx="75" cy="${badgeHeight / 2}" rx="11" ry="22" fill="none" stroke="url(#goldGrad)" stroke-width="2.2" />
        <line x1="53" y1="${badgeHeight / 2}" x2="97" y2="${badgeHeight / 2}" stroke="url(#goldGrad)" stroke-width="2.2" />

        <!-- Domain text -->
        <text x="120" y="${badgeHeight / 2 + 13}" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="800" fill="url(#goldGrad)" letter-spacing="2">
          loichuamoingay.org
        </text>
      </g>
    </svg>
  `);

  const badgeBuffer = await sharp(svgBadge).png().toBuffer();

  const artifactBadgePath = path.join(artifactDir, 'badge_link_loichuamoingay.png');
  await sharp(badgeBuffer).toFile(artifactBadgePath);
  console.log(`✅ Đã lưu Standalone Badge: ${artifactBadgePath}`);

  const publicBadgePath = path.join(publicDir, 'badge_link_loichuamoingay.png');
  await sharp(badgeBuffer).toFile(publicBadgePath);
  console.log(`✅ Đã lưu public/badge_link_loichuamoingay.png`);

  // =========================================================================
  // 3. TẠO THÊM PHIÊN BẢN VIỀN VÀNG TRONG SUỐT (HOÀN TOÀN KHÔNG NỀN / TRANSPARENT HOLLOW BADGE)
  // =========================================================================
  const svgHollowBadge = Buffer.from(`
    <svg width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FCE881" />
          <stop offset="25%" stop-color="#CBA135" />
          <stop offset="50%" stop-color="#F5D76E" />
          <stop offset="75%" stop-color="#B8860B" />
          <stop offset="100%" stop-color="#E5C158" />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- Hollow Capsule Outline (Hoàn toàn trong suốt ở giữa) -->
      <g filter="url(#glow)">
        <rect x="20" y="20" width="${badgeWidth - 40}" height="${badgeHeight - 40}" rx="${(badgeHeight - 40) / 2}" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
        
        <!-- Globe Icon -->
        <circle cx="75" cy="${badgeHeight / 2}" r="22" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />
        <ellipse cx="75" cy="${badgeHeight / 2}" rx="11" ry="22" fill="none" stroke="url(#goldGrad)" stroke-width="2.2" />
        <line x1="53" y1="${badgeHeight / 2}" x2="97" y2="${badgeHeight / 2}" stroke="url(#goldGrad)" stroke-width="2.2" />

        <!-- Domain text -->
        <text x="120" y="${badgeHeight / 2 + 13}" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="800" fill="url(#goldGrad)" letter-spacing="2">
          loichuamoingay.org
        </text>
      </g>
    </svg>
  `);

  const hollowBadgeBuffer = await sharp(svgHollowBadge).png().toBuffer();
  const artifactHollowPath = path.join(artifactDir, 'badge_link_loichuamoingay_hollow.png');
  await sharp(hollowBadgeBuffer).toFile(artifactHollowPath);
  console.log(`✅ Đã lưu Hollow Badge (Viền trong suốt): ${artifactHollowPath}`);

  console.log("\n🎉 HOÀN TẤT TOÀN BỘ YÊU CẦU!");
}

createBannersAndBadges().catch(console.error);
