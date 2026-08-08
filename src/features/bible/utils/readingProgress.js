const READING_PROGRESS_KEY = 'bible_reading_progress_v2';
const LEGACY_LAST_READ_KEY = 'bible_last_read';

const emptyProgress = () => ({ version: 2, lastBookId: null, books: {} });

const toPositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function loadReadingProgress() {
  if (typeof window === 'undefined') return emptyProgress();

  try {
    const stored = JSON.parse(window.localStorage.getItem(READING_PROGRESS_KEY) || 'null');
    if (stored?.version === 2 && stored.books && typeof stored.books === 'object') {
      return stored;
    }

    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_LAST_READ_KEY) || 'null');
    if (legacy?.bookId) {
      const migrated = {
        version: 2,
        lastBookId: legacy.bookId,
        books: {
          [legacy.bookId]: {
            chapter: toPositiveInteger(legacy.chapterNum),
            verse: 1,
            updatedAt: Date.now(),
          },
        },
      };
      window.localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // localStorage có thể bị vô hiệu hóa trong chế độ riêng tư hoặc chính sách trình duyệt.
  }

  return emptyProgress();
}

export function getBookReadingProgress(bookId) {
  const position = loadReadingProgress().books?.[bookId];
  if (!position) return null;
  return {
    chapter: toPositiveInteger(position.chapter),
    verse: toPositiveInteger(position.verse),
  };
}

export function saveBookReadingProgress(bookId, chapter, verse) {
  if (!bookId || typeof window === 'undefined') return;

  try {
    const progress = loadReadingProgress();
    progress.lastBookId = bookId;
    progress.books[bookId] = {
      chapter: toPositiveInteger(chapter),
      verse: toPositiveInteger(verse),
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Việc lưu tiến độ không được làm gián đoạn trải nghiệm đọc.
  }
}

export function getLastReadingPosition() {
  const progress = loadReadingProgress();
  if (!progress.lastBookId) return null;
  const position = progress.books?.[progress.lastBookId];
  if (!position) return null;
  return {
    bookId: progress.lastBookId,
    chapter: toPositiveInteger(position.chapter),
    verse: toPositiveInteger(position.verse),
  };
}

