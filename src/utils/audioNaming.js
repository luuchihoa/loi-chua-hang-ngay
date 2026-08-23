/**
 * Quy ước tên file audio phụng vụ (nguồn chân lý duy nhất cho JavaScript).
 *
 * Ref DB: "1 Cr 13,1 - 13"  -> slug: "1_Cr_13v1_to_13"
 * File bài đọc:                -> "1_Cr_13v1_to_13.mp3"
 * File Tin Mừng:               -> "1_Cr_13v1_to_13.mp3"
 *
 * Không thêm r1_/r2_ vào file nội dung: cùng một ref chỉ có một MP3.
 */
export const normalizeAudioRef = (ref) => {
  if (typeof ref !== 'string') return '';

  return ref
    .normalize('NFC')
    .trim()
    // Dấu chấm/câu cuối trích dẫn không thuộc cấu trúc ref.
    .replace(/[.,:;]+$/g, '')
    .replace(/[()\\/*?"<>|]/g, '')
    // Giữ lại cấu trúc ref thay vì xoá dấu, tránh va chạm:
    // "1,11-12" !== "11,1-12".
    .replace(/\s*[,.:]\s*/g, 'v')
    .replace(/\s*-\s*/g, '_to_')
    .replace(/\s*;\s*/g, '_and_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const getReadingAudioFilename = (ref) => {
  const slug = normalizeAudioRef(ref);
  return slug ? `${slug}.mp3` : null;
};

export const getGospelAudioFilename = (ref) => {
  const slug = normalizeAudioRef(ref);
  return slug ? `${slug}.mp3` : null;
};
