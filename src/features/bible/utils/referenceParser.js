export function parseBibleReference(input, allBooks) {
  if (!input?.trim()) return null;

  const normalized = input.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^([1-3]?\s*[a-zA-ZÀ-ỹ\s]+?)\s*(\d+)(?:[,:\/\s]\s*(\d+))?/i);
  if (!match) return null;

  const [, bookPart, chapterInput, verseInput] = match;
  const normalize = (value) => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const targetBook = normalize(bookPart.trim());
  const candidates = allBooks.map((candidate) => ({
    candidate,
    shortName: normalize(candidate.short),
    fullName: normalize(candidate.name),
  }));

  // Ưu tiên khớp chính xác để "Ga" không bị nhận nhầm thành "G" (sách Gióp).
  const exactMatch = candidates.find(({ shortName, fullName }) =>
    shortName === targetBook || fullName === targetBook
  );
  const fullNameMatch = candidates
    .filter(({ fullName }) => fullName.startsWith(targetBook))
    .sort((a, b) => a.fullName.length - b.fullName.length)[0];
  const shortNameMatch = candidates
    .filter(({ shortName }) => targetBook.startsWith(shortName))
    .sort((a, b) => b.shortName.length - a.shortName.length)[0];
  const book = (exactMatch || fullNameMatch || shortNameMatch)?.candidate;

  if (!book) return null;

  return {
    bookId: book.id,
    chapter: Math.min(Math.max(Number.parseInt(chapterInput, 10), 1), book.chapters),
    verse: verseInput ? Number.parseInt(verseInput, 10) : null,
  };
}
