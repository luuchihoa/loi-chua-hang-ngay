const DIRECTORY_ALIASES = {
  bible: 'bible',
  gospel: 'gospels',
  gospels: 'gospels',
  reading: 'readings',
  readings: 'readings',
  r1: 'readings',
  r2: 'readings',
};

const SAFE_AUDIO_BASENAME = /^[\p{L}\p{N}_-]+\.mp3$/u;
const BIBLE_BASENAME = /^[a-z0-9]+_[1-9]\d{0,2}\.mp3$/;

export const AUDIO_DIRECTORY_LABELS = {
  readings: 'Bài đọc',
  gospels: 'Tin Mừng',
  bible: 'Kinh Thánh',
};

export const inferAudioDirectory = (file, fallback = 'readings', relativePath = '') => {
  const path = relativePath || file.webkitRelativePath || '';
  const segments = path.split('/').map((part) => part.toLowerCase());
  const fromPath = segments.map((part) => DIRECTORY_ALIASES[part]).find(Boolean);
  if (fromPath) return fromPath;
  if (BIBLE_BASENAME.test(file.name)) return 'bible';
  if (/^(r1|r2)\.mp3$/i.test(file.name)) return 'readings';
  return fallback;
};

export const validateAdminAudioFile = (file, directory) => {
  const filename = file?.name?.normalize('NFC') || '';
  if (!file || !filename.toLowerCase().endsWith('.mp3')) return 'Chỉ chấp nhận file MP3.';
  if (!SAFE_AUDIO_BASENAME.test(filename)) return 'Tên file chỉ được chứa chữ, số, dấu gạch ngang và gạch dưới.';
  if (filename.toLowerCase().startsWith('gospel_')) return 'Hãy bỏ tiền tố gospel_ khỏi tên file.';
  if (!AUDIO_DIRECTORY_LABELS[directory]) return 'Chưa xác định được thư mục đích.';
  if (directory === 'bible' && !BIBLE_BASENAME.test(filename)) return 'File Kinh Thánh phải có dạng mt_1.mp3.';
  if (directory !== 'readings' && /^(r1|r2)\.mp3$/i.test(filename)) return 'r1.mp3 và r2.mp3 chỉ thuộc thư mục readings.';
  if (file.size <= 0) return 'File không có dữ liệu.';
  if (file.size > 50 * 1024 * 1024) return 'File vượt quá giới hạn 50 MB.';
  return '';
};

export const makeAdminAudioItem = ({ file, relativePath = '' }, directory, id) => {
  const targetDirectory = inferAudioDirectory(file, directory, relativePath);
  const error = validateAdminAudioFile(file, targetDirectory);
  return {
    id,
    file,
    directory: targetDirectory,
    key: `${targetDirectory}/${file.name.normalize('NFC')}`,
    error,
    exists: false,
    status: error ? 'invalid' : 'unchecked',
    progress: 0,
  };
};

const readDirectoryEntries = (reader) => new Promise((resolve, reject) => {
  const entries = [];
  const read = () => reader.readEntries((batch) => {
    if (!batch.length) resolve(entries);
    else {
      entries.push(...batch);
      read();
    }
  }, reject);
  read();
});

const collectEntry = async (entry, prefix = '') => {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, relativePath: `${prefix}${file.name}` }];
  }
  if (!entry.isDirectory) return [];
  const children = await readDirectoryEntries(entry.createReader());
  const nested = await Promise.all(children.map((child) => collectEntry(child, `${prefix}${entry.name}/`)));
  return nested.flat();
};

export const collectDroppedAudioFiles = async (dataTransfer) => {
  const entries = [...(dataTransfer.items || [])]
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);
  if (entries.length) return (await Promise.all(entries.map((entry) => collectEntry(entry)))).flat();
  return [...(dataTransfer.files || [])].map((file) => ({ file, relativePath: file.webkitRelativePath || '' }));
};
