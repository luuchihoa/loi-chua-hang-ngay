import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('❌ Không tìm thấy dist/index.html. Vui lòng chạy vite build trước.');
  process.exit(1);
}

const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const bibleIndexPath = path.join(__dirname, '../src/data/bible/bibleIndex.json');
const bibleData = JSON.parse(fs.readFileSync(bibleIndexPath, 'utf8'));

const allBooks = [
  ...(bibleData.old_testament || []),
  ...(bibleData.new_testament || [])
];

console.log('🚀 Đang Pre-render HTML tĩnh cho các đường dẫn chính, 73 Sách Hub Pages và Kinh Thánh...');

function createStaticPage(routePath, title, description, jsonLdSchema = null) {
  const targetDir = path.join(DIST_DIR, routePath);
  fs.mkdirSync(targetDir, { recursive: true });

  let html = TEMPLATE;
  html = html.replace(/<title>.*?<\/title>/, `<title>${title} | Lời Chúa Mỗi Ngày</title>`);

  let metaTags = `
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta property="og:title" content="${title} | Lời Chúa Mỗi Ngày" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="https://loichuamoingay.org${routePath}" />
    <meta property="og:image" content="https://loichuamoingay.org/logo_loi_chua_moi_ngay.png" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Lời Chúa Mỗi Ngày" />
    <link rel="canonical" href="https://loichuamoingay.org${routePath}" />
  `;

  if (jsonLdSchema) {
    metaTags += `\n    <script type="application/ld+json">${JSON.stringify(jsonLdSchema)}</script>`;
  }

  html = html.replace(/<meta name="description" content=".*?" \/>/, metaTags);
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');
}

// 1. Pre-render Trang Tĩnh Chính
createStaticPage('/liturgy', 'Phụng Vụ Lời Chúa Hàng Ngày', 'Đọc và nghe bài đọc Phụng vụ hằng ngày cùng bài suy niệm Lời Chúa Công giáo.');
createStaticPage('/bible', 'Kinh Thánh Công Giáo Trọn Bộ 73 Sách', 'Đọc và tra cứu trọn bộ 73 sách Kinh Thánh Công giáo Cựu Ước và Tân Ước.');
createStaticPage('/bible-audio', 'Kinh Thánh Audio Giọng Đọc Truyền Cảm', 'Nghe đọc Kinh Thánh Công giáo trọn bộ với âm thanh chất lượng cao.');
createStaticPage('/calendar', 'Lịch Phụng Vụ Công Giáo', 'Tra cứu màu áo lễ, các lễ trọng, lễ kính và mùa Phụng vụ Công giáo.');

// 2. Pre-render 73 Hub Pages cho 73 Sách Kinh Thánh (/bible/[bookId]) & Chương 1
allBooks.forEach((book) => {
  const isOT = (bibleData.old_testament || []).some(b => b.id === book.id);
  const testamentName = isOT ? 'Cựu Ước' : 'Tân Ước';

  // Hub Page đại diện cho Sách
  createStaticPage(
    `/bible/${book.id}`,
    `Sách ${book.name} - Kinh Thánh Công Giáo 73 Sách`,
    `Đọc trọn bộ Sách ${book.name} (${book.chapters} chương) thuộc ${testamentName} Kinh Thánh Công giáo.`,
    {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": book.name,
      "bookEdition": "Kinh Thánh Công Giáo Việt Nam",
      "numberOfPages": book.chapters,
      "url": `https://loichuamoingay.org/bible/${book.id}`
    }
  );

  // Pre-render Chương 1
  createStaticPage(
    `/bible/${book.id}/1`,
    `Sách ${book.name} - Chương 1`,
    `Đọc Kinh Thánh Công giáo: Sách ${book.name} chương 1. Lời Chúa mỗi ngày.`
  );
});

console.log(`✅ Đã hoàn tất Pre-rendering static HTML cho ${staticRoutesLength()} đường dẫn tĩnh!`);

function staticRoutesLength() {
  return 4 + allBooks.length * 2;
}
