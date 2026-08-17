import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcPath = '/Users/tranthithuynhi/.gemini/antigravity/brain/ae7f6581-d5ce-4531-b75b-b17ceab42e22/.user_uploaded/media_1786954795446.jpg';
const artifactDir = '/Users/tranthithuynhi/.gemini/antigravity/brain/ae7f6581-d5ce-4531-b75b-b17ceab42e22';
const publicDir = '/Users/tranthithuynhi/loi-chua-hang-ngay/public';

async function cropCircularLogo() {
  console.log("=== BẮT ĐẦU CẮT LOGO TRÒN TRONG SUỐT (CIRCULAR TRANSPARENT LOGO) ===");

  // Center and dimensions
  // Left = 46, Right = 526, Top = 268, Bottom = 754
  // CenterX = 286, CenterY = 511
  // Diameter = 480, Radius = 240
  const centerX = 286;
  const centerY = 511;
  const radius = 240;
  const diameter = radius * 2; // 480

  const cropLeft = centerX - radius; // 46
  const cropTop = centerY - radius;  // 271

  console.log(`Bounding Box: Left=${cropLeft}, Top=${cropTop}, Size=${diameter}x${diameter}`);

  // Create an ultra-smooth antialiased SVG circle mask
  const circleSvgMask = Buffer.from(`
    <svg width="${diameter}" height="${diameter}">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white" />
    </svg>
  `);

  // Step 1: Crop the square around the circle and apply the circular mask
  const croppedCircleBuffer = await sharp(srcPath)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: diameter,
      height: diameter
    })
    .composite([
      {
        input: circleSvgMask,
        blend: 'dest-in'
      }
    ])
    .png()
    .toBuffer();

  // Save full-res master PNG in artifact directory
  const artifactMasterPath = path.join(artifactDir, 'logo_loi_chua_moi_ngay_circle.png');
  await sharp(croppedCircleBuffer).toFile(artifactMasterPath);
  console.log(`✅ Đã lưu Master PNG: ${artifactMasterPath}`);

  // Save 512x512 Master in public
  const publicLogoPath = path.join(publicDir, 'logo_loi_chua_moi_ngay.png');
  await sharp(croppedCircleBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(publicLogoPath);
  console.log(`✅ Đã lưu: ${publicLogoPath} (512x512)`);

  const publicIcon512 = path.join(publicDir, 'icon-512x512.png');
  await sharp(croppedCircleBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(publicIcon512);
  console.log(`✅ Đã lưu: ${publicIcon512}`);

  const publicIcon192 = path.join(publicDir, 'icon-192x192.png');
  await sharp(croppedCircleBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(publicIcon192);
  console.log(`✅ Đã lưu: ${publicIcon192}`);

  const publicLogo96 = path.join(publicDir, 'logo_96.png');
  await sharp(croppedCircleBuffer)
    .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(publicLogo96);
  console.log(`✅ Đã lưu: ${publicLogo96}`);

  const publicLogo48 = path.join(publicDir, 'logo_48.png');
  await sharp(croppedCircleBuffer)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(publicLogo48);
  console.log(`✅ Đã lưu: ${publicLogo48}`);

  console.log("\n🎉 HOÀN TẤT TẤT CẢ CÁC KÍCH THƯỚC LOGO TRÒN TRONG SUỐT!");
}

cropCircularLogo().catch(console.error);
