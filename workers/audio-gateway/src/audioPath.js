const MUSIC_FILES = {
  intro: 'liturgy_intro_v5.mp3',
  transition: 'reading_transition_v5.mp3',
  outro: 'liturgy_outro_v5.mp3',
};

export const normalizeAudioRef = (ref) => {
  if (typeof ref !== 'string') return '';

  return ref
    .normalize('NFC')
    .trim()
    .replace(/[.,:;]+$/g, '')
    .replace(/[()\\/*?"<>|]/g, '')
    .replace(/\s*[,.:]\s*/g, 'v')
    .replace(/\s*-\s*/g, '_to_')
    .replace(/\s*;\s*/g, '_and_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const isSafeIdentifier = (value) => typeof value === 'string' && /^[a-z0-9-]+$/i.test(value);

export const resolveAudioPath = ({ kind, ref, section, music, bookId, chapter }) => {
  if (kind === 'music' && MUSIC_FILES[music]) return `music/${MUSIC_FILES[music]}`;

  if (kind === 'reading-intro' && (section === 'r1' || section === 'r2')) {
    return `readings/${section}.mp3`;
  }

  if (kind === 'reading' || kind === 'gospel') {
    const slug = normalizeAudioRef(ref);
    if (!slug) return null;
    return `${kind === 'gospel' || section === 'gospel' ? 'gospels' : 'readings'}/${slug}.mp3`;
  }

  if (kind === 'bible' && isSafeIdentifier(bookId) && Number.isInteger(chapter) && chapter > 0 && chapter <= 200) {
    return `bible/${bookId.toLowerCase()}_${chapter}.mp3`;
  }

  return null;
};

export const resolveLiturgyHlsPrefix = ({ date, variant = 'default' }) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^[a-z0-9_-]+$/i.test(variant)) return null;
  return `hls/liturgy/${date}/${variant}`;
};
