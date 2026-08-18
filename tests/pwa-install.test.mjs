import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Installation Configuration Tests', () => {
  const rootDir = process.cwd();

  it('verifies index.html has complete iOS and PWA meta tags', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    assert.ok(indexContent.includes('rel="apple-touch-icon"'), 'Must have apple-touch-icon link');
    assert.ok(indexContent.includes('name="apple-mobile-web-app-capable" content="yes"'), 'Must enable apple-mobile-web-app-capable');
    assert.ok(indexContent.includes('name="apple-mobile-web-app-status-bar-style"'), 'Must set status-bar-style');
    assert.ok(indexContent.includes('name="mobile-web-app-capable" content="yes"'), 'Must enable mobile-web-app-capable');
    assert.ok(indexContent.includes('name="theme-color"'), 'Must specify theme-color');
    assert.ok(indexContent.includes('viewport-fit=cover'), 'Must have viewport-fit=cover for safe-area insets');
  });

  it('verifies PWA icon assets exist in public folder', () => {
    const icon192 = path.join(rootDir, 'public', 'icon-192x192.png');
    const icon512 = path.join(rootDir, 'public', 'icon-512x512.png');
    const logo48 = path.join(rootDir, 'public', 'logo_48.png');

    assert.ok(fs.existsSync(icon192), 'icon-192x192.png must exist');
    assert.ok(fs.existsSync(icon512), 'icon-512x512.png must exist');
    assert.ok(fs.existsSync(logo48), 'logo_48.png must exist');
  });

  it('verifies vite.config.js includes correct VitePWA manifest and cache settings', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.js');
    const viteContent = fs.readFileSync(viteConfigPath, 'utf-8');

    assert.ok(viteContent.includes('VitePWA'), 'VitePWA plugin must be imported');
    assert.ok(viteContent.includes("display: 'standalone'"), 'Display mode must be standalone');
    assert.ok(viteContent.includes('registerType: \'autoUpdate\''), 'Register type must be autoUpdate');
  });

  it('verifies PWA components exist and are correctly structured', () => {
    const contextPath = path.join(rootDir, 'src', 'context', 'PWAInstallContext.jsx');
    const modalPath = path.join(rootDir, 'src', 'components', 'pwa', 'InstallAppModal.jsx');
    const bannerPath = path.join(rootDir, 'src', 'components', 'pwa', 'InstallAppBanner.jsx');

    assert.ok(fs.existsSync(contextPath), 'PWAInstallContext.jsx must exist');
    assert.ok(fs.existsSync(modalPath), 'InstallAppModal.jsx must exist');
    assert.ok(fs.existsSync(bannerPath), 'InstallAppBanner.jsx must exist');

    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(modalContent.includes('Thêm vào MH chính'), 'iOS guide must mention Thêm vào MH chính');
    assert.ok(modalContent.includes('Chia sẻ'), 'iOS guide must mention Chia sẻ');
  });
});
