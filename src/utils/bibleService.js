import bibleIndex from '../data/bible/bibleIndex.json';
import { supabase } from '../lib/supabase.js';

export const getAllBooks = () => {
  const oldT = (bibleIndex.old_testament || []).map(b => ({ ...b, testament: 'old' }));
  const newT = (bibleIndex.new_testament || []).map(b => ({ ...b, testament: 'new' }));
  return [...oldT, ...newT];
};

export const getOldTestamentBooks = () => {
  return (bibleIndex.old_testament || []).map(b => ({ ...b, testament: 'old' }));
};

export const getNewTestamentBooks = () => {
  return (bibleIndex.new_testament || []).map(b => ({ ...b, testament: 'new' }));
};

export const getBookById = (bookId) => {
  if (!bookId) return null;
  const all = getAllBooks();
  return all.find(b => b.id.toLowerCase() === bookId.toLowerCase() || b.short.toLowerCase() === bookId.toLowerCase());
};

export const getChapterContent = async (bookId, chapterNum) => {
  const book = getBookById(bookId);
  if (!book) return { bookName: '', bookShort: '', chapter: parseInt(chapterNum, 10) || 1, verses: [] };

  const cNum = parseInt(chapterNum, 10);

  try {
    // Truy vấn trực tiếp từ bảng chapters (Full Chapter Storage)
    const { data: chapRow } = await supabase
      .from('chapters')
      .select('content')
      .eq('book_id', book.id)
      .eq('chapter', cNum)
      .maybeSingle();

    if (chapRow?.content) {
      return {
        bookName: book.name,
        bookShort: book.short,
        chapter: cNum,
        fullContent: chapRow.content,
        verses: []
      };
    }

    // Fallback cho Sách Châm Ngôn (cn) Chương 1 nếu chưa nạp DB
    if ((book.id === 'cn' || book.id === 'pro') && cNum === 1) {
      const pro1Content = `[PART] ĐỀ TỰA TỔNG QUÁT\n(1) Đây là những châm ngôn của Sa-lô-môn, ông là con vua Đa-vít và là vua Ít-ra-en.\n(2) Các châm ngôn này nhằm giúp con người\nbiết lẽ khôn ngoan và nhận lời nghiêm huấn,\nhiểu được những lời lẽ thâm thúy cao sâu,\n(3) đón nhận lời nghiêm huấn để biết cách xử sự khôn ngoan:\nbiết sống công bằng, công minh và chính trực.\n(4) Các châm ngôn này\ncũng nhằm giúp cho kẻ ngây thơ nên sáng suốt,\ncho giới trẻ thêm hiểu biết và thận trọng.\n(5) Người khôn ngoan hãy nghe để được thêm kiến thức;\nngười hiểu biết hãy nghe, và sẽ tìm được lời hướng dẫn.\n(6) Các châm ngôn này còn nhằm giúp ta hiểu\nnhững châm ngôn và những lời bóng bẩy,\nnhững ngôn từ và câu đố của các bậc hiền nhân.\n(7) Kính sợ ĐỨC CHÚA là bước đầu của tri thức.\nKẻ ngu si khinh thường khôn ngoan và lời nghiêm huấn.\n\n[PART] I. PHẦN MỞ ĐẦU NHỮNG LỜI HUẤN DỤ CỦA KHÔN NGOAN\n[SECTION] Người khôn tránh bạn xấu\n(8) Này con, giáo huấn của cha, con hãy nghe,\nlời dạy của mẹ, con đừng gạt bỏ.\n(9) Vì những lời ấy sẽ là vòng hoa xinh con đội lên đầu,\nlà vòng kiềng con đeo vào cổ.\n(10) Này con, nếu bọn người tội lỗi có rủ rê con,\ncon chớ bao giờ ưng thuận.\n(11) Có thể chúng sẽ nói: “Lại đây với bọn tao.\nTa hãy nằm chờ để ra tay hạ sát,\nrình cả đứa vô tội chẳng hề làm gì ta.\n(12) Như tử thần, ta hãy nuốt sống ăn tươi bọn chúng,\ncho chúng phải sa vào âm phủ\nngay lúc còn khỏe mạnh an lành.\n(13) Mọi của cải quý giá, ta sẽ chiếm hữu;\ncủa cướp được, ta sẽ chất đầy nhà.\n(14) Hãy cùng bọn tao đồng thuyền đồng hội,\nrồi ta sẽ ăn đủ chia đều.”\n(15) Này con, nếu chúng nói như vậy,\ncon cũng đừng đi một đường với chúng,\ncố giữ chân con xa khỏi lối chúng đi.\n(16) Chúng nhanh chân chạy theo điều dữ,\nlại vội vàng đổ máu người ta.\n(17) Thật hoàn toàn vô ích\nkhi chim nhìn thấy lưới người giăng.\n(18) Chúng có ngờ đâu\nchính chúng đang nằm chờ bị người ta sát hại,\ndang rình gây tai hại cho chính mình.\n(19) Ai manh tâm trục lợi, số phận là thế đó.\nCủa phi nghĩa cướp đi sinh mạng người chiếm đoạt.\n\n[SECTION] Đức Khôn Ngoan kêu gọi người khờ dại\n(20) Đức Khôn Ngoan kêu to ngoài đường phố,\ncất tiếng nơi quảng trường,\n(21) kêu gọi chỗ ồn ào náo nhiệt,\ntuyên bố nơi cổng thành:\n(22) “Hỡi những kẻ ngây thơ khờ dại,\ncác ngươi còn chuộng sự ngu dốt đến bao giờ?\nĐến bao giờ kẻ nhạo báng còn ưa chế giễu,\nđứa ngu si còn khinh sự hiểu biết?\n(23) Hãy quay về nghe lời ta sửa dạy.\nNày ta tuôn đổ thần khí ta trên các ngươi,\nkhiến các ngươi hiểu rõ lời ta dạy bảo.\n(24) Vì khi ta gọi, các ngươi đã khước từ;\nta đưa tay ra, chẳng ai buồn để ý.\n(25) Các ngươi đã coi thường mọi lời ta khuyên nhủ,\nđã không chấp nhận lời sửa dạy của ta.\n(26) Còn ta, ta sẽ nhạo cười ngày ngươi gặp họa,\nsẽ chế giễu khi kinh hoàng ập xuống trên ngươi,\n(27) khi kinh hoàng ập xuống như cơn bão\nvà tai họa đến tựa cuồng phong,\nkhi cùng quẫn với đau thương\ncứ trên ngươi mà giáng xuống.\n(28) Lúc ấy thiên hạ sẽ kêu đến ta, nhưng ta chẳng đáp lời,\nsẽ kiếm tìm ta, nhưng không sao gặp được.\n(29) Vì hiểu biết Đức Chúa, chúng chẳng ưa,\nkính sợ ĐỨC CHÚA, chúng không chọn,\n(30) vì chúng không chấp nhận lời ta khuyên răn,\nvà khinh nhờn điều ta sửa dạy,\n(31) nên chúng phải gánh hậu quả việc chúng làm,\nchuốc vào thân hết mọi điều chúng toan tính.\n(32) Ngây thơ mà bướng bỉnh, ắt sẽ phải thiệt thân;\nngu đần mà vô tâm, tránh sao khỏi tự diệt.\n(33) Ai nghe ta sẽ sống an toàn,\nđược yên ổn, chẳng sợ chi tai họa.”`;
      return {
        bookName: book.name,
        bookShort: book.short,
        chapter: cNum,
        fullContent: pro1Content,
        verses: []
      };
    }

    return {
      bookName: book.name,
      bookShort: book.short,
      chapter: cNum,
      fullContent: null,
      verses: []
    };
  } catch (err) {
    console.warn(`⚠️ Lỗi truy vấn getChapterContent:`, err.message);
    return { bookName: book.name, bookShort: book.short, chapter: cNum, fullContent: null, verses: [] };
  }
};

export const searchBible = async (query) => {
  if (!query || !query.trim()) return [];
  const cleanQ = query.trim();

  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('id, book_id, chapter, content')
      .ilike('content', `%${cleanQ}%`)
      .limit(30);

    if (error || !data) return [];

    const allBooksMap = new Map(getAllBooks().map(b => [b.id.toLowerCase(), b]));

    return data.map((c) => {
      const book = allBooksMap.get((c.book_id || '').toLowerCase());
      const bookShort = book ? book.short : c.book_id;
      const bookName = book ? book.name : c.book_id;

      // Trích xuất dòng chứa từ khóa tìm kiếm
      const lines = (c.content || '').split('\n');
      const matchingLine = lines.find(l => l.toLowerCase().includes(cleanQ.toLowerCase())) || lines[0] || '';
      const cleanSnippet = matchingLine.replace(/\[PART\]|\[SECTION\]|\(\d+[a-z]?\)|\(\d+-\d+\)/g, '').trim();

      return {
        type: 'chapter',
        bookId: c.book_id,
        chapter: c.chapter,
        title: `${bookShort} ${c.chapter}`,
        bookName: bookName,
        text: cleanSnippet
      };
    });
  } catch (err) {
    console.warn('⚠️ Lỗi searchBible Supabase:', err.message);
    return [];
  }
};

export const getBibleAudioFilename = (bookIdOrShort, chapter) => {
  if (!bookIdOrShort) return '';
  const book = getBookById(bookIdOrShort);
  const shortCode = book?.short || bookIdOrShort;
  const cleanCode = shortCode.toLowerCase().replace(/\s+/g, '');
  return `${cleanCode}_c${chapter}.mp3`;
};

const getAudioApiBase = () => {
  const base = import.meta.env.VITE_AUDIO_API_BASE || (import.meta.env.DEV ? 'http://localhost:5005' : '');
  return base.replace(/\/+$/, '');
};

// ── CÁC HELPER TRUY CẤP AUDIO BẢO VỆ BẰNG SIGNED STREAM URL ────────
export const fetchAudioAccessStreamUrl = async (trackId) => {
  if (!trackId) return null;
  const apiBase = getAudioApiBase();
  if (!apiBase) return null;
  try {
    const res = await fetch(`${apiBase}/api/audio-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.streamPath) {
        return `${apiBase}${data.streamPath}`;
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi xin cấp token phát audio:', err.message);
  }
  return null;
};

export const fetchBibleAudioAvailability = async (bookId) => {
  if (!bookId) return [];
  const apiBase = getAudioApiBase();
  if (!apiBase) return [];
  try {
    const res = await fetch(`${apiBase}/api/bible-audio-availability?bookId=${encodeURIComponent(bookId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.availableChapters)) {
        return data.availableChapters; // Array of { chapter, trackId }
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi kiểm tra chương Kinh Thánh khả dụng:', err.message);
  }
  return [];
};
