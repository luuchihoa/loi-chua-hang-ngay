import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = '/Users/tranthithuynhi/loi-chua-hang-ngay/public';
const artifactDir = '/Users/tranthithuynhi/.gemini/antigravity/brain/ae7f6581-d5ce-4531-b75b-b17ceab42e22';

async function generateSolidAppIcons() {
  console.log("=== TẠO APP ICON TOÀN DIỆN CHO IPHONE & ANDROID (FULL-BLEED NATIVE APP ICONS) ===");

  const logoSourcePath = path.join(publicDir, 'logo_loi_chua_moi_ngay.png');
  if (!fs.existsSync(logoSourcePath)) {
    throw new Error(`Không tìm thấy logo gốc tại ${logoSourcePath}`);
  }

  // 1. Tạo hình nền Solid Full-Bleed 1024x1024 (Đỏ rượu Phụng Vụ #600b14 kết hợp gradient hướng tâm và viền vàng tinh tế)
  const size = 1024;
  const bgSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="liturgicalGlow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stop-color="#83101c" />
          <stop offset="45%" stop-color="#600b14" />
          <stop offset="80%" stop-color="#3b050b" />
          <stop offset="100%" stop-color="#230206" />
        </radialGradient>
        <radialGradient id="subtleAura" cx="50%" cy="50%" r="48%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.25" />
          <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
        </radialGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="30" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- 1. Full-Bleed Solid Background (KHÔNG có góc trong suốt) -->
      <rect width="${size}" height="${size}" fill="url(#liturgicalGlow)" />

      <!-- 2. Sacred Aura Glow -->
      <circle cx="${size/2}" cy="${size/2}" r="440" fill="url(#subtleAura)" filter="url(#softGlow)" />

      <!-- 3. Subtle Concentric Gold Accent Ring -->
      <circle cx="${size/2}" cy="${size/2}" r="435" fill="none" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.35" />
      <circle cx="${size/2}" cy="${size/2}" r="425" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-opacity="0.2" />
    </svg>
  `;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // 2. Chuẩn bị Emblem tròn chính giữa (Scale 840x840 trong khung 1024x1024, để lại ~92px safe margin mỗi cạnh)
  const emblemSize = 840;
  const emblemBuffer = await sharp(logoSourcePath)
    .resize(emblemSize, emblemSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const offset = Math.round((size - emblemSize) / 2); // 92px

  // 3. Composite thành Master Icon 1024x1024
  const master1024Buffer = await sharp(bgBuffer)
    .composite([
      {
        input: emblemBuffer,
        top: offset,
        left: offset
      }
    ])
    .png()
    .toBuffer();

  // 4. Tạo các kích thước chuẩn Apple & Google Play / PWA
  // 4.1. Apple Touch Icon 180x180 (iOS Home Screen)
  const appleTouchIconPath = path.join(publicDir, 'apple-touch-icon.png');
  await sharp(master1024Buffer).resize(180, 180).png().toFile(appleTouchIconPath);
  console.log(`✅ Đã tạo: ${appleTouchIconPath} (180x180 solid full-bleed)`);

  const appleTouchIconPrecomposedPath = path.join(publicDir, 'apple-touch-icon-precomposed.png');
  await sharp(master1024Buffer).resize(180, 180).png().toFile(appleTouchIconPrecomposedPath);

  // 4.2. Icon 192x192 (Android Standard)
  const icon192Path = path.join(publicDir, 'icon-192x192.png');
  await sharp(master1024Buffer).resize(192, 192).png().toFile(icon192Path);
  console.log(`✅ Đã tạo: ${icon192Path} (192x192 solid full-bleed)`);

  // 4.3. Icon 512x512 (PWA Splash & High-Res Launcher)
  const icon512Path = path.join(publicDir, 'icon-512x512.png');
  await sharp(master1024Buffer).resize(512, 512).png().toFile(icon512Path);
  console.log(`✅ Đã tạo: ${icon512Path} (512x512 solid full-bleed)`);

  // 4.4. Icon Maskable 512x512 (Android Adaptive Icons với ~65% emblem scale)
  const maskableEmblemSize = 660;
  const maskableEmblemBuffer = await sharp(logoSourcePath)
    .resize(maskableEmblemSize, maskableEmblemSize, { fit: 'contain' })
    .png()
    .toBuffer();
  const maskableOffset = Math.round((size - maskableEmblemSize) / 2);
  const maskableBg = await sharp(bgBuffer).toBuffer();
  const maskableMasterBuffer = await sharp(maskableBg)
    .composite([
      {
        input: maskableEmblemBuffer,
        top: maskableOffset,
        left: maskableOffset
      }
    ])
    .png()
    .toBuffer();

  const iconMaskablePath = path.join(publicDir, 'icon-maskable-512x512.png');
  await sharp(maskableMasterBuffer).resize(512, 512).png().toFile(iconMaskablePath);
  console.log(`✅ Đã tạo: ${iconMaskablePath} (512x512 maskable safe-zone)`);

  // Lưu bản copy sang artifact để user xem
  const artifactPreview = path.join(artifactDir, 'apple-touch-icon-solid.png');
  await sharp(master1024Buffer).resize(512, 512).png().toFile(artifactPreview);

  console.log("=== HOÀN TẤT TẠO TOÀN BỘ BỘ ICON SOLID NATIVE! ===");
}

generateSolidAppIcons().catch(console.error);
