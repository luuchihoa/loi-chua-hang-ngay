import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12 text-center">
      <SEO
        title="Không tìm thấy trang"
        description="Đường dẫn này không tồn tại trên Lời Chúa Mỗi Ngày."
        robots="noindex, follow, noarchive"
      />
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-12">
        <p className="font-serif text-6xl font-bold text-amber-700">404</p>
        <h1 className="mt-4 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          Không tìm thấy trang
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-bold text-white hover:bg-amber-800" to="/">
            <ArrowLeft size={16} /> Về trang Lời Chúa
          </Link>
          <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 px-5 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800" to="/bible">
            <BookOpen size={16} /> Đọc Kinh Thánh
          </Link>
        </div>
      </div>
    </main>
  );
}
