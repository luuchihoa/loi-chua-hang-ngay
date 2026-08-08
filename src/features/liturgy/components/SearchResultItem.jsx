import { ArrowRight } from 'lucide-react';

export default function SearchResultItem({ item, query, onSelect, theme, highlightSearchText }) {
  const previewText = item.quote || item.gospel_intro || item.r1_intro || item.r2_intro;

  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left p-3 rounded-2xl bg-stone-50/70 dark:bg-stone-800/50 hover:bg-amber-50/80 dark:hover:bg-stone-800/80 border border-stone-200/60 dark:border-stone-800 hover:border-amber-300/80 dark:hover:border-amber-700/80 transition-all flex items-start justify-between gap-3 group active:scale-[0.99]"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
            {highlightSearchText(item.title, query)}
          </span>
          {item.cycle && item.cycle !== 'all' && (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${theme.badgeBg}`}>
              Năm {item.cycle}
            </span>
          )}
        </div>

        <div className="text-[12px] text-stone-500 dark:text-stone-400 font-medium flex items-center gap-2 flex-wrap mb-1">
          {item.gospel_ref && <span>Phúc Âm: {highlightSearchText(item.gospel_ref, query)}</span>}
          {item.r1_ref && <span>• Bài đọc 1: {highlightSearchText(item.r1_ref, query)}</span>}
          {item.r2_ref && <span>• Bài đọc 2: {highlightSearchText(item.r2_ref, query)}</span>}
        </div>

        {previewText && (
          <p className={`text-[12px] italic ${theme.accentText} line-clamp-1 font-serif`}>
            “{highlightSearchText(previewText, query)}”
          </p>
        )}
      </div>

      <div className="p-1.5 rounded-xl bg-white dark:bg-stone-700/60 text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-950/60 transition-all self-center flex-shrink-0">
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}
