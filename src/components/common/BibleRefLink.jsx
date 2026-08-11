import React from 'react';
import { Link } from 'react-router-dom';

// Bảng ánh xạ các tên viết tắt sách Kinh Thánh phổ biến sang Book ID trong hệ thống
const BIBLE_BOOK_MAP = {
  'Mt': 'mt',
  'Mc': 'mc',
  'Lc': 'lc',
  'Ga': 'ga',
  'Tv': 'ps',
  'St': 'st',
  'XH': 'xh',
  'Xh': 'xh',
  'Lv': 'lv',
  'DS': 'ds',
  'Ds': 'ds',
  'ĐNL': 'dnl',
  'Is': 'is',
  'Gr': 'gr',
  'Ez': 'ez',
  'Đn': 'dn',
  'Cv': 'cv',
  'Rm': 'rm',
  '1Cv': '1co',
  '2Cv': '2co',
  'Gl': 'ga',
  'Ep': 'ep',
  'Pl': 'ph',
  'Cl': 'col',
  'Kh': 'rev'
};

/**
 * BibleRefLink Component
 * Nhận diện trích dẫn Kinh Thánh (vd: "Mt 18, 1-5" hoặc "Tv 23, 1-6")
 * và chuyển đổi thành hyperlink nội bộ truyền tải dòng chảy PageRank cho SEO.
 */
export default function BibleRefLink({ referenceText, className = "" }) {
  if (!referenceText || typeof referenceText !== 'string') return null;

  // Pattern: "Mt 18, 1-5" hoặc "Tv 23"
  const match = referenceText.match(/([0-9]?[A-Za-zÀ-ỹ]+)\s+(\d+)(?:,\s*(\d+)(?:-(\d+))?)?/);

  if (!match) {
    return <span className={`font-semibold text-amber-900 dark:text-amber-200 ${className}`}>{referenceText}</span>;
  }

  const [_, bookCode, chapter, startVerse] = match;
  const bookId = BIBLE_BOOK_MAP[bookCode] || 'mt';
  const targetUrl = `/bible/${bookId}/${chapter}${startVerse ? `#v${startVerse}` : ''}`;

  return (
    <Link
      to={targetUrl}
      title={`Mở Sách Kinh Thánh: ${referenceText}`}
      className={`inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-600 underline underline-offset-4 decoration-amber-400/50 transition-colors ${className}`}
    >
      <span>📖 {referenceText}</span>
    </Link>
  );
}
