import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://loichuamoingay.org';

const staticRoutes = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/liturgy', priority: '0.9', changefreq: 'daily' },
  { url: '/bible', priority: '0.9', changefreq: 'weekly' },
  { url: '/bible-audio', priority: '0.8', changefreq: 'weekly' },
  { url: '/calendar', priority: '0.7', changefreq: 'monthly' }
];

function generateSitemap() {
  console.log('🔄 Đang khởi tạo sitemap.xml...');
  const today = new Date().toISOString().split('T')[0];

  const bibleIndexPath = path.join(__dirname, '../src/data/bible/bibleIndex.json');
  const bibleData = JSON.parse(fs.readFileSync(bibleIndexPath, 'utf8'));

  const allBooks = [
    ...(bibleData.old_testament || []),
    ...(bibleData.new_testament || [])
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Trang tĩnh chính
  staticRoutes.forEach((route) => {
    xml += `  <url>\n`;
    xml += `    <loc>${DOMAIN}${route.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 2. 73 Book Hub Pages (/bible/[bookId])
  allBooks.forEach((book) => {
    xml += `  <url>\n`;
    xml += `    <loc>${DOMAIN}/bible/${book.id}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // 3. Toàn bộ 1328 Chương Kinh Thánh (73 sách x N chương)
  let totalChapters = 0;
  allBooks.forEach((book) => {
    for (let c = 1; c <= book.chapters; c++) {
      totalChapters++;
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}/bible/${book.id}/${c}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }
  });

  // 4. 365 Ngày Phụng Vụ trong năm (/liturgy/YYYY-MM-DD)
  const currentYear = new Date().getFullYear();
  const isLeap = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

  const formatDateToYYYYMMDD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let totalLiturgyDays = 0;
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(currentYear, 0, 1 + d);
    const dateStr = formatDateToYYYYMMDD(date);
    totalLiturgyDays++;
    xml += `  <url>\n`;
    xml += `    <loc>${DOMAIN}/liturgy/${dateStr}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>yearly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  const publicPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(publicPath, xml, 'utf8');
  console.log(`✅ Đã tạo thành công sitemap.xml với ${staticRoutes.length + allBooks.length + totalChapters + totalLiturgyDays} URLs tại: ${publicPath}`);
}

generateSitemap();

