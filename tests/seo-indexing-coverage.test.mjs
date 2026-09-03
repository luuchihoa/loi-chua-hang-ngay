import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const sitemapPath = path.join(rootDir, 'public/sitemap.xml');
const robotsPath = path.join(rootDir, 'public/robots.txt');
const bibleIndexPath = path.join(rootDir, 'src/data/bible/bibleIndex.json');

test('SEO & Google Indexing Coverage Suite', async (t) => {
  const bibleData = JSON.parse(fs.readFileSync(bibleIndexPath, 'utf8'));
  const allBooks = [
    ...(bibleData.old_testament || []),
    ...(bibleData.new_testament || [])
  ];

  const totalChapters = allBooks.reduce((sum, b) => sum + b.chapters, 0);
  const currentYear = new Date().getFullYear();

  await t.test('robots.txt does not block valid pages and allows full indexing', () => {
    assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
    const robotsContent = fs.readFileSync(robotsPath, 'utf8');

    // Make sure /bookmarks is NOT blocked via robots.txt (to prevent GSC "bị chặn bằng tệp robots.txt")
    assert.ok(!robotsContent.includes('Disallow: /bookmarks'), 'robots.txt must NOT disallow /bookmarks');
    assert.ok(robotsContent.includes('Allow: /'), 'robots.txt must allow root /');
    assert.ok(robotsContent.includes('Sitemap: https://loichuamoingay.org/sitemap.xml'), 'robots.txt must include Sitemap link');
  });

  await t.test('sitemap.xml contains only canonical pages with published Bible content', () => {
    assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

    const urls = (sitemapContent.match(/<loc>(.*?)<\/loc>/g) || []).map(u => 
      u.replace(/<\/?loc>/g, '')
    );

    const liturgyUrls = urls.filter((url) => url.startsWith('https://loichuamoingay.org/liturgy/'));
    const expectedTotal = 5 + allBooks.length + totalChapters + liturgyUrls.length;
    assert.equal(urls.length, expectedTotal, `Sitemap must contain exactly ${expectedTotal} canonical URLs, found ${urls.length}`);

    // Verify critical static routes
    assert.ok(urls.includes('https://loichuamoingay.org/'), 'Sitemap must include /');
    assert.ok(urls.includes('https://loichuamoingay.org/liturgy'), 'Sitemap must include /liturgy');
    assert.ok(urls.includes('https://loichuamoingay.org/bible'), 'Sitemap must include /bible');
    assert.ok(urls.includes('https://loichuamoingay.org/bible-audio'), 'Sitemap must include /bible-audio');
    assert.ok(urls.includes('https://loichuamoingay.org/calendar'), 'Sitemap must include /calendar');

    assert.ok(liturgyUrls.length > 0, 'Complete daily liturgy pages must be submitted for indexing');

    // Verify all 73 book hubs
    allBooks.forEach(b => {
      assert.ok(urls.includes(`https://loichuamoingay.org/bible/${b.id}`), `Sitemap must include hub /bible/${b.id}`);
    });

    // Verify sample chapters (first, middle, last)
    assert.ok(urls.includes('https://loichuamoingay.org/bible/st/1'), 'Sitemap must include /bible/st/1');
    assert.ok(urls.includes('https://loichuamoingay.org/bible/st/50'), 'Sitemap must include /bible/st/50');
    assert.ok(urls.includes('https://loichuamoingay.org/bible/tv/119'), 'Sitemap must include /bible/tv/119');
    assert.ok(urls.includes('https://loichuamoingay.org/bible/kh/22'), 'Sitemap must include /bible/kh/22');
  });

  await t.test('dist directory contains physical index.html AND direct .html files for zero-redirect serving', () => {
    if (!fs.existsSync(distDir)) {
      t.skip('dist directory does not exist yet (run npm run build first)');
      return;
    }

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const urls = (sitemapContent.match(/<loc>(.*?)<\/loc>/g) || []).map(u => 
      u.replace(/<\/?loc>/g, '')
    );

    const missingFiles = [];

    urls.forEach(url => {
      const route = url.replace('https://loichuamoingay.org', '');
      const indexPath = path.join(distDir, route === '' || route === '/' ? 'index.html' : `${route}/index.html`);
      if (!fs.existsSync(indexPath)) {
        missingFiles.push({ url, indexPath });
      }

      if (route && route !== '/') {
        const directHtmlPath = path.join(distDir, `${route.replace(/^\/+/, '')}.html`);
        if (!fs.existsSync(directHtmlPath)) {
          missingFiles.push({ url, directHtmlPath });
        }
      }
    });

    assert.equal(missingFiles.length, 0, `Missing ${missingFiles.length} HTML files in dist: ${JSON.stringify(missingFiles.slice(0, 5))}`);
  });

  await t.test('Bookmarks page has clean noindex and is not blocked by robots.txt', () => {
    if (!fs.existsSync(distDir)) {
      t.skip('dist directory does not exist yet');
      return;
    }

    const bookmarksHtmlPath = path.join(distDir, 'bookmarks/index.html');
    assert.ok(fs.existsSync(bookmarksHtmlPath), 'dist/bookmarks/index.html must exist');
    const html = fs.readFileSync(bookmarksHtmlPath, 'utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex, follow" />'), 'Bookmarks page must have noindex, follow meta tag');
  });

  await t.test('private pages and 404 responses are protected from indexing', () => {
    if (!fs.existsSync(distDir)) {
      t.skip('dist directory does not exist yet');
      return;
    }

    ['/admin', '/admin/reset-password'].forEach((route) => {
      const html = fs.readFileSync(path.join(distDir, `${route}/index.html`), 'utf8');
      assert.ok(html.includes('<meta name="robots" content="noindex, nofollow, noarchive" />'), `${route} must be noindex`);
    });

    const notFoundHtml = fs.readFileSync(path.join(distDir, '404.html'), 'utf8');
    assert.ok(notFoundHtml.includes('<meta name="robots" content="noindex, follow, noarchive" />'), '404 page must be noindex');
    assert.ok(notFoundHtml.includes('<title>Không tìm thấy trang | Lời Chúa Mỗi Ngày</title>'), '404 page must have a clear title');
    assert.ok(!notFoundHtml.includes('<link rel="canonical"'), '404 page must not claim another canonical URL');
  });

  await t.test('Cloudflare serves unknown paths as real 404 responses', () => {
    const config = JSON.parse(fs.readFileSync(path.join(rootDir, 'wrangler.jsonc'), 'utf8'));
    assert.equal(config.assets?.directory, './dist');
    assert.equal(config.assets?.not_found_handling, '404-page');
  });

  await t.test('Sample pre-rendered HTML files contain complete SEO meta tags & Structured Data', () => {
    if (!fs.existsSync(distDir)) {
      t.skip('dist directory does not exist yet');
      return;
    }

    const sampleRoutes = [
      '/liturgy',
      '/bible',
      '/bible-audio',
      '/calendar',
      '/bible/st',
      '/bible/st/2',
      '/bible/tv/150',
      '/bible/kh/22'
    ];

    sampleRoutes.forEach(route => {
      const filePath = path.join(distDir, `${route}/index.html`);
      assert.ok(fs.existsSync(filePath), `File must exist: ${filePath}`);

      const html = fs.readFileSync(filePath, 'utf8');

      // Title check
      assert.ok(/<title>.+?<\/title>/.test(html), `Missing <title> in ${route}`);

      // Canonical link check
      assert.ok(html.includes(`<link rel="canonical" href="https://loichuamoingay.org${route}" />`), `Missing or incorrect canonical link in ${route}`);

      // Meta description check
      assert.ok(html.includes('<meta name="description" content='), `Missing meta description in ${route}`);

      // Open Graph check
      assert.ok(html.includes('<meta property="og:title"'), `Missing og:title in ${route}`);
      assert.ok(html.includes(`<meta property="og:url" content="https://loichuamoingay.org${route}"`), `Missing og:url in ${route}`);

      // JSON-LD Structured Data check
      assert.ok(html.includes('<script type="application/ld+json">'), `Missing JSON-LD schema in ${route}`);

      if (route.startsWith('/bible/') && /\/\d+$/.test(route)) {
        assert.ok(!html.includes('Đang tải toàn văn'), `Bible chapter must contain published text in ${route}`);
      }
    });
  });
});
