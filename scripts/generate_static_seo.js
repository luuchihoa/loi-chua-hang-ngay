import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const DIST_DIR = path.join(__dirname, '../dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('❌ Không tìm thấy dist/index.html. Vui lòng chạy vite build trước.');
  process.exit(1);
}

const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const bibleIndexPath = path.join(__dirname, '../src/data/bible/bibleIndex.json');
const bibleData = JSON.parse(fs.readFileSync(bibleIndexPath, 'utf8'));

import { getLiturgyInfo } from '../src/utils/liturgyCalendar.js';

const allBooks = [
  ...(bibleData.old_testament || []).map(b => ({ ...b, testament: 'old' })),
  ...(bibleData.new_testament || []).map(b => ({ ...b, testament: 'new' }))
];

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY để prerender nội dung Kinh Thánh.');
}

const seoSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const chapterKey = (bookId, chapter) => `${bookId}:${chapter}`;

const loadChapterContent = async () => {
  const contentByChapter = new Map();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await seoSupabase
      .from('chapters')
      .select('book_id, chapter, content')
      .order('book_id', { ascending: true })
      .order('chapter', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Không thể tải chapters từ Supabase: ${error.message}`);
    for (const row of data || []) {
      if (row.book_id && Number.isInteger(row.chapter) && row.content?.trim()) {
        contentByChapter.set(chapterKey(row.book_id, row.chapter), row.content.trim());
      }
    }
    if (!data || data.length < pageSize) break;
  }

  const missing = allBooks.flatMap((book) => Array.from(
    { length: book.chapters },
    (_, index) => chapterKey(book.id, index + 1),
  )).filter((key) => !contentByChapter.has(key));

  if (missing.length) {
    throw new Error(`Thiếu nội dung ${missing.length} chương Kinh Thánh; dừng build để không phát hành HTML mỏng. Ví dụ: ${missing.slice(0, 8).join(', ')}`);
  }

  return contentByChapter;
};

const bibleChapterContent = await loadChapterContent();

console.log('🚀 Đang prerender trang chính, 73 sách và toàn văn 1328 chương Kinh Thánh...');

const DOMAIN = 'https://loichuamoingay.org';
const DEFAULT_IMAGE = `${DOMAIN}/og-image.png`;

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderChapterContent = (content) => content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const part = /^\[(?:PART|SECTION)\]\s*(.+)$/i.exec(line);
    if (part) return `<h2 class="mt-8 text-xl font-serif font-bold text-amber-900 dark:text-amber-100">${escapeHtml(part[1])}</h2>`;

    const verse = /^\(([^)]+)\)\s*(.*)$/.exec(line);
    if (verse) return `<p class="leading-8 text-stone-800 dark:text-stone-100"><sup class="mr-1 font-semibold text-amber-800 dark:text-amber-300">${escapeHtml(verse[1])}</sup>${escapeHtml(verse[2])}</p>`;

    return `<p class="leading-8 text-stone-800 dark:text-stone-100">${escapeHtml(line)}</p>`;
  })
  .join('\n');

function createStaticPage(routePath, title, description, jsonLdSchema = null, bodySkeleton = '', robots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1') {
  const targetDir = path.join(DIST_DIR, routePath);
  fs.mkdirSync(targetDir, { recursive: true });

  let html = TEMPLATE;
  const fullTitle = `${title} | Lời Chúa Mỗi Ngày`;
  const canonicalUrl = `${DOMAIN}${routePath}`;

  html = html.replace(/<title>.*?<\/title>/, `<title>${fullTitle}</title>`);

  let metaTags = `
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robots}" />
    <meta property="og:title" content="${fullTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${DEFAULT_IMAGE}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Lời Chúa Mỗi Ngày" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${fullTitle}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${DEFAULT_IMAGE}" />
    <link rel="canonical" href="${canonicalUrl}" />
  `;

  if (jsonLdSchema) {
    metaTags += `\n    <script type="application/ld+json">${JSON.stringify(jsonLdSchema)}</script>`;
  }

  // Xóa sạch các thẻ meta/canonical cũ của template trước khi chèn thẻ mới để tránh trùng lặp
  html = html
    .replace(/<meta name="description" content=".*?" \/>/g, '')
    .replace(/<meta name="robots" content=".*?" \/>/g, '')
    .replace(/<link rel="canonical" href=".*?" \/>/g, '')
    .replace(/<meta property="og:.*?" content=".*?" \/>/g, '')
    .replace(/<meta name="twitter:.*?" content=".*?" \/>/g, '');

  html = html.replace('</head>', `${metaTags}\n  </head>`);

  const fallbackSkeleton = `
    <div class="min-h-screen bg-stone-50 dark:bg-stone-950 p-4">
      <header class="max-w-4xl mx-auto py-6 border-b border-stone-200 dark:border-stone-800">
        <h1 class="text-2xl md:text-3xl font-serif font-bold text-amber-900 dark:text-amber-100">${title}</h1>
        <p class="text-sm text-stone-600 dark:text-stone-400 mt-2">${description}</p>
      </header>
    </div>
  `;

  const finalSkeleton = bodySkeleton || fallbackSkeleton;
  html = html.replace('<div id="root"></div>', `<div id="root">${finalSkeleton}</div>`);

  // 1. Ghi file dạng directory/index.html (cho URL có trailing slash /liturgy/)
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');

  // 2. Ghi file dạng routePath.html (cho URL không có trailing slash /liturgy trên GitHub Pages)
  // Giúp GitHub Pages phục vụ HTTP 200 OK trực tiếp, triệt tiêu hoàn toàn 301 Redirect!
  const cleanRoute = routePath.replace(/^\/+/, '');
  if (cleanRoute) {
    const directHtmlPath = path.join(DIST_DIR, `${cleanRoute}.html`);
    const directParentDir = path.dirname(directHtmlPath);
    if (!fs.existsSync(directParentDir)) {
      fs.mkdirSync(directParentDir, { recursive: true });
    }
    fs.writeFileSync(directHtmlPath, html, 'utf8');
  }
}

let generatedCount = 0;

// ─────────────────────────────────────────────────────────────
// 1. PRE-RENDER CÁC TRANG TĨNH CHÍNH
// ─────────────────────────────────────────────────────────────
const staticPages = [
  {
    path: '/liturgy',
    title: 'Lời Chúa Hôm Nay – Bài Đọc & Tin Mừng Phụng Vụ',
    description: 'Đọc và nghe Lời Chúa hôm nay, bài đọc Phụng vụ Thánh Lễ, bài đọc 1, đáp ca, Tin Mừng và suy niệm Lời Chúa mỗi ngày theo Lịch Công giáo Việt Nam.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Lời Chúa Hôm Nay – Bài Đọc & Tin Mừng Phụng Vụ | Lời Chúa Mỗi Ngày",
      "url": `${DOMAIN}/liturgy`,
      "description": "Đọc và nghe Lời Chúa hôm nay, bài đọc Phụng vụ Thánh Lễ, bài đọc 1, đáp ca, Tin Mừng và suy niệm Lời Chúa mỗi ngày theo Lịch Công giáo Việt Nam."
    }
  },
  {
    path: '/bible',
    title: 'Kinh Thánh Công Giáo Trọn Bộ 73 Sách',
    description: 'Đọc và tra cứu trọn bộ 73 sách Kinh Thánh Công giáo Cựu Ước và Tân Ước chuẩn xác kèm audio nghe đọc.',
    schema: {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": "Kinh Thánh Công Giáo Trọn Bộ 73 Sách",
      "bookEdition": "Kinh Thánh Công Giáo Việt Nam",
      "url": `${DOMAIN}/bible`
    }
  },
  {
    path: '/bible-audio',
    title: 'Kinh Thánh Audio Giọng Đọc Truyền Cảm',
    description: 'Nghe đọc Kinh Thánh Công giáo trọn bộ 73 sách Cựu Ước và Tân Ước với âm thanh chất lượng cao truyền cảm.',
    schema: {
      "@context": "https://schema.org",
      "@type": "AudioObject",
      "name": "Kinh Thánh Audio Giọng Đọc Truyền Cảm",
      "description": "Nghe đọc Kinh Thánh Công giáo trọn bộ 73 sách Cựu Ước và Tân Ước với âm thanh chất lượng cao.",
      "contentUrl": `${DOMAIN}/bible-audio`
    }
  },
  {
    path: '/calendar',
    title: 'Lịch Phụng Vụ Công Giáo',
    description: 'Tra cứu lịch Phụng vụ Công giáo, màu áo lễ, các lễ trọng, lễ kính và mùa Phụng vụ trong năm.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Lịch Phụng Vụ Công Giáo | Lời Chúa Mỗi Ngày",
      "url": `${DOMAIN}/calendar`
    }
  },
  {
    path: '/bookmarks',
    title: 'Bài Đọc Đã Lưu',
    description: 'Danh sách bài đọc Lời Chúa bạn đã đánh dấu yêu thích trên Lời Chúa Mỗi Ngày.',
    robots: 'noindex, follow',
    schema: null
  }
];

staticPages.forEach((page) => {
  createStaticPage(page.path, page.title, page.description, page.schema, '', page.robots || undefined);
  generatedCount++;
});

// ─────────────────────────────────────────────────────────────
// 2. PRE-RENDER 365 NGÀY PHỤNG VỤ TRONG NĂM (/liturgy/YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const isLeap = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
const totalDays = isLeap ? 366 : 365;

const formatDateToYYYYMMDD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

for (let d = 0; d < totalDays; d++) {
  const date = new Date(currentYear, 0, 1 + d);
  const dateStr = formatDateToYYYYMMDD(date);
  const formattedDate = date.toLocaleDateString('vi-VN');
  const info = getLiturgyInfo(date);

  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = formatDateToYYYYMMDD(prevDate);

  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = formatDateToYYYYMMDD(nextDate);

  const liturgySkeleton = `
    <div class="min-h-screen bg-stone-50 dark:bg-stone-950 p-4 md:p-8 text-stone-800 dark:text-stone-200">
      <div class="max-w-4xl mx-auto">
        <nav aria-label="Đường dẫn trang" class="mb-4 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
          <a href="/" class="hover:underline">Trang chủ</a>
          <span>›</span>
          <a href="/liturgy" class="hover:underline">Phụng Vụ</a>
          <span>›</span>
          <span class="text-amber-800 dark:text-amber-300 font-semibold">Ngày ${formattedDate}</span>
        </nav>
        <header class="py-6 border-b border-stone-200 dark:border-stone-800 mb-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 mb-3 border border-amber-300 dark:border-amber-800">
            <span>${info.displayName || 'Phụng Vụ Ngày'}</span>
            <span>•</span>
            <span>Mùa Phụng Vụ: ${info.season || 'Thường'}</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-serif font-bold text-amber-900 dark:text-amber-100">Lời Chúa Ngày ${formattedDate} - ${info.displayName}</h1>
          <p class="text-sm text-stone-600 dark:text-stone-400 mt-2">Bài đọc Phụng Vụ Thánh Lễ và Suy niệm Tin Mừng ngày ${formattedDate}. Lời Chúa Mỗi Ngày.</p>
        </header>

        <nav aria-label="Điều hướng ngày" class="flex items-center justify-between gap-3 mb-8">
          <a href="/liturgy/${prevDateStr}" class="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-amber-600 hover:text-white transition-colors">‹ Ngày trước (${prevDate.toLocaleDateString('vi-VN')})</a>
          <a href="/calendar" class="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline">Lịch Phụng Vụ Tháng</a>
          <a href="/liturgy/${nextDateStr}" class="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-amber-600 hover:text-white transition-colors">Ngày sau (${nextDate.toLocaleDateString('vi-VN')}) ›</a>
        </nav>

        <div class="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm text-center">
          <p class="text-sm font-medium text-stone-600 dark:text-stone-300">Đang tải toàn văn Bài Đọc I, Đáp Ca, Tin Mừng và bài suy niệm Lời Chúa ngày ${formattedDate}...</p>
        </div>
      </div>
    </div>
  `;

  createStaticPage(
    `/liturgy/${dateStr}`,
    `Lời Chúa Ngày ${formattedDate} - ${info.displayName || 'Phụng Vụ'}`,
    `Bài đọc Phụng Vụ Thánh Lễ và Suy niệm Tin Mừng ngày ${formattedDate} (${info.displayName || ''}). Lời Chúa Mỗi Ngày.`,
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${DOMAIN}/#organization`,
          "name": "Lời Chúa Mỗi Ngày",
          "url": DOMAIN,
          "logo": DEFAULT_IMAGE
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${DOMAIN}/liturgy/${dateStr}#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": DOMAIN },
            { "@type": "ListItem", "position": 2, "name": "Phụng Vụ", "item": `${DOMAIN}/liturgy` },
            { "@type": "ListItem", "position": 3, "name": `Ngày ${formattedDate}`, "item": `${DOMAIN}/liturgy/${dateStr}` }
          ]
        },
        {
          "@type": "Article",
          "headline": `Lời Chúa Ngày ${formattedDate} - ${info.displayName || 'Phụng Vụ'}`,
          "description": `Bài đọc Phụng Vụ Thánh Lễ và Suy niệm Tin Mừng ngày ${formattedDate}.`,
          "inLanguage": "vi",
          "mainEntityOfPage": `${DOMAIN}/liturgy/${dateStr}`,
          "datePublished": `${dateStr}T00:00:00+07:00`
        }
      ]
    },
    liturgySkeleton,
    'noindex, follow'
  );
  generatedCount++;
}

// ─────────────────────────────────────────────────────────────
// 3. PRE-RENDER 73 HUB PAGES CHO 73 SÁCH KINH THÁNH (/bible/[bookId])
// ─────────────────────────────────────────────────────────────
const bibleSitemapUrls = [];
allBooks.forEach((book) => {
  const isOT = book.testament === 'old';
  const testamentName = isOT ? 'Cựu Ước' : 'Tân Ước';

  const chapterLinks = Array.from({ length: book.chapters }, (_, i) => i + 1)
    .map(c => `<a href="/bible/${book.id}/${c}" class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-200 hover:bg-amber-600 hover:text-white transition-colors">${c}</a>`)
    .join('\n        ');

  const hubSkeleton = `
    <div class="min-h-screen bg-stone-50 dark:bg-stone-950 p-4 md:p-8 text-stone-800 dark:text-stone-200">
      <div class="max-w-4xl mx-auto">
        <nav aria-label="Đường dẫn trang" class="mb-4 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
          <a href="/" class="hover:underline">Trang chủ</a>
          <span>›</span>
          <a href="/bible" class="hover:underline">Kinh Thánh</a>
          <span>›</span>
          <span class="text-amber-800 dark:text-amber-300 font-semibold">Sách ${book.name}</span>
        </nav>
        <header class="py-6 border-b border-stone-200 dark:border-stone-800 mb-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 mb-3 border border-amber-300 dark:border-amber-800">
            <span>${testamentName}</span>
            <span>•</span>
            <span>${book.category}</span>
            <span>•</span>
            <span>${book.chapters} chương</span>
          </div>
          <h1 class="text-3xl md:text-4xl font-serif font-bold text-amber-900 dark:text-amber-100">Sách ${book.name} (${book.short})</h1>
          <p class="text-base text-stone-600 dark:text-stone-400 mt-3">Đọc trọn bộ Sách ${book.name} gồm ${book.chapters} chương thuộc ${testamentName} Kinh Thánh Công giáo Việt Nam.</p>
        </header>

        <section class="mb-8">
          <h2 class="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">Danh Sách Các Chương</h2>
          <div class="flex flex-wrap gap-2">
            ${chapterLinks}
          </div>
        </section>

        <section class="p-5 rounded-2xl bg-amber-50/60 dark:bg-stone-900/60 border border-amber-200 dark:border-stone-800 text-sm">
          <p class="font-medium text-stone-700 dark:text-stone-300">Lời Chúa Mỗi Ngày hỗ trợ tra cứu toàn văn Lời Chúa, nghe đọc audio chất lượng cao, đánh dấu câu và ghi chú suy niệm cá nhân.</p>
          <div class="mt-4 flex gap-3">
            <a href="/bible/${book.id}/1" class="px-4 py-2 rounded-xl bg-amber-700 text-white font-medium text-sm hover:bg-amber-800 transition-colors">Bắt đầu đọc Chương 1</a>
            <a href="/bible-audio" class="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">Nghe Audio</a>
          </div>
        </section>
      </div>
    </div>
  `;

  createStaticPage(
    `/bible/${book.id}`,
    `Sách ${book.name} - Kinh Thánh Công Giáo 73 Sách`,
    `Đọc trọn bộ Sách ${book.name} (${book.chapters} chương) thuộc ${testamentName} Kinh Thánh Công giáo. Bản dịch chuẩn Công Giáo Việt Nam có audio nghe đọc.`,
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${DOMAIN}/#organization`,
          "name": "Lời Chúa Mỗi Ngày",
          "url": DOMAIN,
          "logo": DEFAULT_IMAGE
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${DOMAIN}/bible/${book.id}#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": DOMAIN },
            { "@type": "ListItem", "position": 2, "name": "Kinh Thánh", "item": `${DOMAIN}/bible` },
            { "@type": "ListItem", "position": 3, "name": `Sách ${book.name}`, "item": `${DOMAIN}/bible/${book.id}` }
          ]
        },
        {
          "@type": "Book",
          "name": `Sách ${book.name}`,
          "bookEdition": "Kinh Thánh Công Giáo Việt Nam",
          "numberOfPages": book.chapters,
          "url": `${DOMAIN}/bible/${book.id}`
        }
      ]
    },
    hubSkeleton
  );
  generatedCount++;

  // ─────────────────────────────────────────────────────────────
  // 3. PRE-RENDER TOÀN BỘ 1328 CHƯƠNG KINH THÁNH (/bible/[bookId]/[chapter])
  // ─────────────────────────────────────────────────────────────
  for (let c = 1; c <= book.chapters; c++) {
    const prevLink = c > 1 
      ? `<a href="/bible/${book.id}/${c - 1}" class="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-amber-600 hover:text-white transition-colors">‹ Chương ${c - 1}</a>`
      : '';
    const nextLink = c < book.chapters 
      ? `<a href="/bible/${book.id}/${c + 1}" class="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-amber-600 hover:text-white transition-colors">Chương ${c + 1} ›</a>`
      : '';

    const chapterContent = bibleChapterContent.get(chapterKey(book.id, c));
    const chapterSkeleton = `
      <div class="min-h-screen bg-stone-50 dark:bg-stone-950 p-4 md:p-8 text-stone-800 dark:text-stone-200">
        <div class="max-w-4xl mx-auto">
          <nav aria-label="Đường dẫn trang" class="mb-4 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
            <a href="/" class="hover:underline">Trang chủ</a>
            <span>›</span>
            <a href="/bible" class="hover:underline">Kinh Thánh</a>
            <span>›</span>
            <a href="/bible/${book.id}" class="hover:underline">Sách ${book.name}</a>
            <span>›</span>
            <span class="text-amber-800 dark:text-amber-300 font-semibold">Chương ${c}</span>
          </nav>
          
          <header class="py-6 border-b border-stone-200 dark:border-stone-800 mb-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 mb-3 border border-amber-300 dark:border-amber-800">
              <span>${testamentName}</span>
              <span>•</span>
              <span>${book.category}</span>
              <span>•</span>
              <span>Chương ${c}/${book.chapters}</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-serif font-bold text-amber-900 dark:text-amber-100">Sách ${book.name} - Chương ${c}</h1>
            <p class="text-sm text-stone-600 dark:text-stone-400 mt-2">Đọc Kinh Thánh Công giáo: Sách ${book.name} (${book.short}) chương ${c}. Trọn bộ 73 sách Kinh Thánh Công giáo Việt Nam.</p>
          </header>

          <nav aria-label="Điều hướng chương" class="flex items-center justify-between gap-3 mb-8">
            <div>${prevLink}</div>
            <a href="/bible/${book.id}" class="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline">Tất cả chương Sách ${book.name}</a>
            <div>${nextLink}</div>
          </nav>

          <article class="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-stone-200 dark:bg-stone-900 dark:border-stone-800" aria-label="Toàn văn Sách ${book.name} chương ${c}">
            ${renderChapterContent(chapterContent)}
          </article>
        </div>
      </div>
    `;

    createStaticPage(
      `/bible/${book.id}/${c}`,
      `Sách ${book.name} - Chương ${c}`,
      `Đọc Kinh Thánh Công giáo: Sách ${book.name} (${book.short}) chương ${c}. Trọn bộ 73 sách Kinh Thánh Công giáo Việt Nam có audio nghe đọc.`,
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${DOMAIN}/#organization`,
            "name": "Lời Chúa Mỗi Ngày",
            "url": DOMAIN,
            "logo": DEFAULT_IMAGE
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${DOMAIN}/bible/${book.id}/${c}#breadcrumb`,
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": DOMAIN },
              { "@type": "ListItem", "position": 2, "name": "Kinh Thánh", "item": `${DOMAIN}/bible` },
              { "@type": "ListItem", "position": 3, "name": `Sách ${book.name}`, "item": `${DOMAIN}/bible/${book.id}` },
              { "@type": "ListItem", "position": 4, "name": `Chương ${c}`, "item": `${DOMAIN}/bible/${book.id}/${c}` }
            ]
          },
          {
            "@type": "Article",
            "headline": `Sách ${book.name} - Chương ${c}`,
            "description": `Đọc Kinh Thánh Công giáo: Sách ${book.name} (${book.short}) chương ${c}. Trọn bộ 73 sách Kinh Thánh Công giáo Việt Nam.`,
            "inLanguage": "vi",
            "mainEntityOfPage": `${DOMAIN}/bible/${book.id}/${c}`,
            "isPartOf": {
              "@type": "Book",
              "name": `Sách ${book.name}`,
              "url": `${DOMAIN}/bible/${book.id}`
            }
          }
        ]
      },
      chapterSkeleton
    );
    bibleSitemapUrls.push(`${DOMAIN}/bible/${book.id}/${c}`);
    generatedCount++;
  }
});

const staticSitemapUrls = [`${DOMAIN}/`, ...staticPages
  .filter((page) => page.path !== '/bookmarks')
  .map((page) => `${DOMAIN}${page.path}`)];
const bookSitemapUrls = allBooks.map((book) => `${DOMAIN}/bible/${book.id}`);
const sitemapUrls = [...staticSitemapUrls, ...bookSitemapUrls, ...bibleSitemapUrls];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;

fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), sitemapXml, 'utf8');
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

console.log(`✅ Đã hoàn tất Pre-rendering static HTML cho toàn bộ ${generatedCount} đường dẫn tĩnh trong dist/!`);
