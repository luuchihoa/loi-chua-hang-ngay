import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * DirectAnswerBox Component
 * Cấu trúc khối trả lời trực tiếp (45-60 từ) tối ưu cho Google Featured Snippets (Vị trí 0) & PAA
 */
export default function DirectAnswerBox({ question, answer, listItems = [] }) {
  if (!question || !answer) return null;

  return (
    <section 
      aria-label="Tóm tắt nhanh câu hỏi Phụng Vụ & Kinh Thánh"
      className="my-6 p-5 rounded-2xl bg-amber-50/80 dark:bg-stone-900/80 border border-amber-200/60 dark:border-stone-800 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2.5 text-amber-900 dark:text-amber-200 font-serif font-bold text-base sm:text-lg">
        <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <h2>{question}</h2>
      </div>
      
      {/* Khối văn bản trả lời trực tiếp 45-60 từ tối ưu cho Google Bot Crawler */}
      <p className="text-stone-700 dark:text-stone-300 text-xs sm:text-sm leading-relaxed font-sans">
        {answer}
      </p>

      {listItems && listItems.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 list-disc list-inside font-sans">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-snug">{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
