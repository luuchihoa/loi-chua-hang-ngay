import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCompletePrimaryLiturgyContent, resolveLiturgyContentForDate } from '../src/utils/liturgyContentResolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const rows = JSON.parse(fs.readFileSync(path.join(rootDir, 'liturgy_contents_rows.json'), 'utf8'));

test('Daily liturgy SEO prerendering', async (t) => {
  await t.test('merges cycle-specific readings with shared Gospel content', () => {
    const { content } = resolveLiturgyContentForDate(new Date(2026, 8, 3), rows);
    assert.equal(content.r1_ref, '1 Cr 3,18-23');
    assert.equal(content.gospel_ref, 'Lc 5,1-11');
    assert.ok(hasCompletePrimaryLiturgyContent(content));
  });

  await t.test('only marks dates with all primary reading sections as complete', () => {
    assert.equal(hasCompletePrimaryLiturgyContent({
      r1_ref: 'St 1,1-5',
      r1_content: 'Nội dung bài đọc.',
      psalm_content: 'Đáp ca.',
      gospel_ref: 'Ga 1,1-5',
      gospel_content: 'Nội dung Tin Mừng.',
    }), true);
    assert.equal(hasCompletePrimaryLiturgyContent({
      r1_ref: 'St 1,1-5',
      r1_content: 'Nội dung bài đọc.',
      gospel_ref: 'Ga 1,1-5',
      gospel_content: 'Nội dung Tin Mừng.',
    }), false);
  });

  await t.test('publishes full HTML and sitemap entry for a complete date', () => {
    const htmlPath = path.join(rootDir, 'dist/liturgy/2026-09-03/index.html');
    if (!fs.existsSync(htmlPath)) {
      t.skip('Run the SEO generator before checking rendered output');
      return;
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const sitemap = fs.readFileSync(path.join(rootDir, 'public/sitemap.xml'), 'utf8');
    assert.ok(html.includes('<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />'));
    assert.ok(html.includes('Bài đọc I'));
    assert.ok(html.includes('1 Cr 3,18-23'));
    assert.ok(html.includes('Lc 5,1-11'));
    assert.ok(!html.includes('Đang tải toàn văn'));
    assert.ok(sitemap.includes('<loc>https://loichuamoingay.org/liturgy/2026-09-03</loc>'));
  });
});
