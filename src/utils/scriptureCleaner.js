// Shared Scripture Text Cleaner for UI & Web Speech TTS
export function cleanScriptureTextOnUI(text) {
  if (!text) return "";

  let cleaned = text.replace(/<[^>]*>/g, '').replace(/✠/g, "").replace(/“/g, '"').replace(/”/g, '"');
  
  // Xóa superscripts
  for (const s of "¹²³⁴⁵⁶⁷⁸⁹⁰") {
    cleaned = cleaned.replaceAll(s, "");
  }

  const vChars = "a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵĐđ";
  const vowels = "aáảãạâầấẩẫậăằắẳẵặeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ";

  // Xóa số câu dính dấu câu hoặc độc lập
  cleaned = cleaned.replace(new RegExp(`(?<=[.!?\\"\\\'\\)\\],;\\s])\\d+[a-z]?(?=\\s|[${vChars}])`, 'g'), '');
  cleaned = cleaned.replace(/^\d+[a-z]?\s*/g, '');

  // 1b. Thay thế phonetic cho chữ 'x' tiếng Việt → 's' để TTS vi-VN đọc đúng âm /s/
  // (Trong giọng Bắc chuẩn, x = s = /s/; TTS đôi khi đọc 'x' theo kiểu tiếng Anh /ks/)
  // Lưu ý kỹ thuật: từ kết thúc bằng ký tự non-ASCII (ử, ứ, ã...) KHÔNG dùng \b cuối
  // vì \b chỉ nhận biên giới với ASCII \w chars – dùng \bX thay thế (chỉ assert đầu từ)
  const xToSMap = [
    // === Kết thúc non-ASCII: chỉ dùng \b ở đầu ===
    [/\bxử/g, 'sử'],         // xử – toà xử, đầu xử, bị xử
    [/\bXử/g, 'Sử'],
    [/\bxứ/g, 'sứ'],         // xứ – xứ đạo, xứ sở
    [/\bXứ/g, 'Sứ'],
    [/\bxã/g, 'sã'],         // xã – xã hội, giáo xã
    [/\bXã/g, 'Sã'],
    // === Kết thúc ASCII: dùng \b cả hai đầu ===
    [/\bxuyên\b/g, 'suyên'],  // xuyên qua, thấu xuyên
    [/\bxúc\b/g, 'súc'],      // cảm xúc, xúc động
    [/\bxinh\b/g, 'sinh'],    // xinh đẹp
    [/\bxung\b/g, 'sung'],    // xung quanh
    [/\bxuân\b/g, 'suân'],    // mùa xuân
    [/\bXuân\b/g, 'Suân'],
    [/\bxuống\b/g, 'suống'],  // đi xuống
    [/\bxây\b/g, 'sây'],      // xây dựng
    [/\bxảy\b/g, 'sảy'],      // xảy ra
    [/\bxác\b/g, 'sác'],      // xác thịt, thân xác
    [/\bXác\b/g, 'Sác'],
    [/\bxanh\b/g, 'sanh'],    // màu xanh, xanh tươi
  ];
  for (const [pattern, replacement] of xToSMap) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // 1. CHỈ THAY CHỮ 'i' / 'I' KHÔNG DẤU ĐỨNG HOÀN TOÀN ĐỘC LẬP THÀNH 'y' / 'Y'
  // Sử dụng Regex Unicode-aware để KHÔNG BAO GIỜ chạm vào chữ i nằm trong các từ tiếng Việt (như bài, người, với, nói, khi, đi, tôi...)
  const standaloneUpperI = new RegExp(`(^|[^${vChars}])I(?=[^${vChars}]|$)`, 'g');
  const standaloneLowerI = new RegExp(`(^|[^${vChars}])i(?=[^${vChars}]|$)`, 'g');
  cleaned = cleaned.replace(standaloneUpperI, '$1Y').replace(standaloneLowerI, '$1y');

  // (Đã loại bỏ luật tách gạch nối và viết hoa nhân tạo để giữ nguyên định dạng chuẩn Kinh Thánh trên UI)

  // Các tên riêng Công Giáo dính liền không gạch nối
  const concatenatedCatholicNames = [
    [/Giuđa|Giu \u00a7Đa\u00a7/gi, "Du \u00a7Đa\u00a7"],
    [/Giuse|Giu \u00a7Se\u00a7/gi, "Du \u00a7Se\u00a7"],
    [/Giêsu|Giê \u00a7Su\u00a7/gi, "Dê \u00a7Su\u00a7"],
    [/Hêrôđê|Hê \u00a7Rô\u00a7 \u00a7Đê\u00a7/gi, "Hê \u00a7Rô\u00a7 \u00a7Đê\u00a7"],
    [/Nicôđêmô|Ni \u00a7Cô\u00a7 \u00a7Đê\u00a7 \u00a7Mô\u00a7/gi, "Ni \u00a7Cô\u00a7 \u00a7Đê\u00a7 \u00a7Mô\u00a7"],
    [/Bêtêsơđa|Bê \u00a7Tê\u00a7 \u00a7Sơ\u00a7 \u00a7Đa\u00a7/gi, "Bê \u00a7Tê\u00a7 \u00a7Sơ\u00a7 \u00a7Đa\u00a7"],
    [/Xađốc|Xa \u00a7Đốc\u00a7/gi, "Xa \u00a7Đốc\u00a7"],
    [/Giuđêa|Giu \u00a7Đê\u00a7 \u00a7A\u00a7/gi, "Du \u00a7Đê\u00a7 \u00a7A\u00a7"],
    [/Giêrusalem|Giê \u00a7Ru\u00a7 \u00a7Sa\u00a7 \u00a7Lem\u00a7/gi, "Dê \u00a7Ru\u00a7 \u00a7Sa\u00a7 \u00a7Lem\u00a7"],
    [/Capharnaum|Ca \u00a7Phơ\u00a7 \u00a7Na\u00a7 \u00a7Um\u00a7/gi, "Ca \u00a7Phơ\u00a7 \u00a7Na\u00a7 \u00a7Um\u00a7"],
    [/Ghenêsarét|Ghe \u00a7Nê\u00a7 \u00a7Sa\u00a7 \u00a7Rét\u00a7/gi, "Gơ \u00a7Nê\u00a7 \u00a7Sa\u00a7 \u00a7Rết\u00a7"],
    [/Bêthania|Bê \u00a7Tha\u00a7 \u00a7Ni\u00a7 \u00a7A\u00a7/gi, "Bê \u00a7Tha\u00a7 \u00a7Ni\u00a7 \u00a7A\u00a7"],
    [/Bêlem|Bê \u00a7Lem\u00a7/gi, "Bê \u00a7Lem\u00a7"],
    [/Giođan|Gio \u00a7Đan\u00a7/gi, "Gio \u00a7Đan\u00a7"],
    [/Giođanơ|Gio \u00a7Đa\u00a7 \u00a7Nơ\u00a7/gi, "Gio \u00a7Đa\u00a7 \u00a7Nơ\u00a7"],
    [/Đavít|Đa \u00a7Vít\u00a7/gi, "Đa \u00a7Vít\u00a7"],
    [/Salômôn|Sa \u00a7Lô\u00a7 \u00a7Môn\u00a7/gi, "Sa \u00a7Lô\u00a7 \u00a7Môn\u00a7"],
    [/Môsê|Mô \u00a7Sê\u00a7/gi, "Mô \u00a7Sê\u00a7"],
    [/Abraham|A \u00a7Bra\u00a7 \u00a7Ham\u00a7/gi, "A \u00a7Bra\u00a7 \u00a7Ham\u00a7"],
    [/Isaias|Y \u00a7Sai\u00a7 \u00a7A\u00a7/gi, "Y \u00a7Sai\u00a7 \u00a7A\u00a7"],
    [/Giêrêmia|Giê \u00a7Rê\u00a7 \u00a7Mi\u00a7 \u00a7A\u00a7/gi, "Dê \u00a7Rê\u00a7 \u00a7Mi\u00a7 \u00a7A\u00a7"],
    [/Êzêkien|Ê \u00a7Zê\u00a7 \u00a7Ki\u00a7 \u00a7En\u00a7/gi, "Ê \u00a7Zê\u00a7 \u00a7Ki\u00a7 \u00a7En\u00a7"],
    [/Galilêa|Ga \u00a7Li\u00a7 \u00a7Lê\u00a7 \u00a7A\u00a7/gi, "Ga \u00a7Li\u00a7 \u00a7Lê\u00a7 \u00a7A\u00a7"],
    [/Samaria|Sa \u00a7Ma\u00a7 \u00a7Ri\u00a7 \u00a7A\u00a7/gi, "Sa \u00a7Ma\u00a7 \u00a7Ri\u00a7 \u00a7A\u00a7"],
    [/Pharisêu|Pha \u00a7Ri\u00a7 \u00a7Sêu\u00a7/gi, "Pha \u00a7Ri\u00a7 \u00a7Sêu\u00a7"],
    [/Ítraen|Ít \u00a7Ra\u00a7 \u00a7En\u00a7/gi, "Ít \u00a7Ra\u00a7 \u00a7En\u00a7"],
    [/Israen|Is \u00a7Ra\u00a7 \u00a7En\u00a7/gi, "Ít \u00a7Ra\u00a7 \u00a7En\u00a7"],
    [/Nazarét|Na \u00a7Za\u00a7 \u00a7Rét\u00a7/gi, "Na \u00a7Za\u00a7 \u00a7Rét\u00a7"],
    [/\bA-men\b|\bA \u00a7Men\u00a7\b|\bAmen\b|\ba-men\b/gi, "A \u00a7Meng\u00a7"],
    [/\bPhải,\s/g, "Phải. "]
  ];
  for (const [pattern, replacement] of concatenatedCatholicNames) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Xóa khoảng trắng thừa đứng trước dấu câu
  cleaned = cleaned.replace(/\s+([.:;!?,])/g, '$1');

  // Chuẩn hóa khoảng trắng đứng sau dấu câu
  cleaned = cleaned
    .replace(/,([^\s])/g, ', $1')
    .replace(/;([^\s])/g, '; $1')
    .replace(/:([^\s])/g, ': $1');

  // Bỏ ký tự § để hiển thị sạch trên UI
  cleaned = cleaned.replace(/\u00a7/g, '');

  const lines = cleaned.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim());
  return lines.filter(Boolean).join('\n');
}

// Hàm dành riêng cho việc gửi text vào engine TTS (Edge TTS, Azure)
// Giúp ép giọng đọc mà không làm hỏng văn bản hiển thị trên màn hình UI
//
// THIẾT KẾ HỆ THỐNG - Cơ chế Placeholder §:
//  - cleanScriptureTextOnUI đã bọc các âm tiết con (sau dấu '-') bằng §...§
//    Ví dụ: Gio-an → "Gio §An§", gia-Gia-cô → "gia §Gia§ §Cô§"
//  - Hàm này xử lý trực tiếp từ text gốc (không qua cleanScriptureTextOnUI)
//    để giữ nguyên §...§ và áp dụng gi→d một cách có kiểm soát:
//      * Bên TRONG §...§: gi→d luôn được áp dụng (âm tiết nhân tạo)
//      * Bên NGOÀI §...§, lowercase gi: gi→d được áp dụng (từ tiếng Việt)
//      * Bên NGOÀI §...§, uppercase Gi: GIỮ NGUYÊN (tên riêng Kinh Thánh thật)
export function cleanScriptureTextForTTS(text) {
  if (!text) return "";

  // Bước 1: Chạy toàn bộ pipeline UI (bao gồm tạo §...§)
  // Nhưng ta KHÔNG gọi cleanScriptureTextOnUI vì nó đã bỏ §
  // → Tái tạo pipeline thủ công để giữ § trong suốt quá trình

  let cleaned = text.replace(/<[^>]*>/g, '').replace(/✠/g, "").replace(/"/g, '"').replace(/"/g, '"');
  for (const s of "¹²³⁴⁵⁶⁷⁸⁹⁰") cleaned = cleaned.replaceAll(s, "");

  const vChars = "a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵĐđ";
  const vowels = "aáảãạâầấẩẫậăằắẳẵặeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ";

  cleaned = cleaned.replace(new RegExp(`(?<=[.!?\"\'\'\)\],;\s])\d+[a-z]?(?=\s|[${vChars}])`, 'g'), '');
  cleaned = cleaned.replace(/^\d+[a-z]?\s*/g, '');

  const xToSMap = [
    [/\bxử/g, 'sử'], [/\bXử/g, 'Sử'], [/\bxứ/g, 'sứ'], [/\bXứ/g, 'Sứ'],
    [/\bxã/g, 'sã'], [/\bXã/g, 'Sã'], [/\bxuyên\b/g, 'suyên'], [/\bxúc\b/g, 'súc'],
    [/\bxinh\b/g, 'sinh'], [/\bxung\b/g, 'sung'], [/\bxuân\b/g, 'suân'], [/\bXuân\b/g, 'Suân'],
    [/\bxuống\b/g, 'suống'], [/\bxây\b/g, 'sây'], [/\bxảy\b/g, 'sảy'],
    [/\bxác\b/g, 'sác'], [/\bXác\b/g, 'Sác'], [/\bxanh\b/g, 'sanh'],
  ];
  for (const [p, r] of xToSMap) cleaned = cleaned.replace(p, r);

  const standaloneUpperI = new RegExp(`(^|[^${vChars}])I(?=[^${vChars}]|$)`, 'g');
  const standaloneLowerI = new RegExp(`(^|[^${vChars}])i(?=[^${vChars}]|$)`, 'g');
  cleaned = cleaned.replace(standaloneUpperI, '$1Y').replace(standaloneLowerI, '$1y');

  // Không thay dấu gạch nối bằng khoảng trắng nữa, để TTS tự hiểu đó là 1 từ ghép liên tục (tránh ngắt nghỉ sai giữa Ki-tô)

  const concatenatedCatholicNames = [
    [/Giu-đa|Giuđa|Giu \u00a7Đa\u00a7/gi, "Zu Đa"],
    [/Giu-se|Giuse|Giu \u00a7Se\u00a7/gi, "Zu Se"],
    [/Giê-su|Giêsu|Giê \u00a7Su\u00a7/gi, "Zê Su"],
    [/Hê-rô-đê|Hêrôđê|Hê \u00a7Rô\u00a7 \u00a7Đê\u00a7/gi, "Hê Rô Đê"],
    [/Ni-cô-đê-mô|Nicôđêmô/gi, "Ni Cô Đê Mô"],
    [/Bê-tê-sơ-đa|Bêtêsơđa/gi, "Bê Tê Sơ Đa"],
    [/Xa-đốc|Xađốc/gi, "Xa Đốc"],
    [/Giu-đê-a|Giuđêa/gi, "Zu Đê A"],
    [/Giê-ru-sa-lem|Giêrusalem/gi, "Zê Ru Sa Lem"],
    [/Ca-phác-na-um|Capharnaum/gi, "Ca Phác Na Um"],
    [/Ghen-nê-xa-rét|Ghenêsarét/gi, "Ghen Nê Xa Rét"],
    [/Bê-tha-ni-a|Bêthania/gi, "Bê Tha Ni A"],
    [/Bê-lem|Bêlem/gi, "Bê Lem"],
    [/Gio-đan|Giođan/gi, "Gio Đan"],
    [/Đa-vít|Đavít/gi, "Đa Vít"],
    [/Sa-lô-môn|Salômôn/gi, "Sa Lô Môn"],
    [/Mô-sê|Môsê/gi, "Mô Sê"],
    [/Áp-ra-ham|Abraham/gi, "Áp Ra Ham"],
    [/I-sai-a|Isaias/gi, "I Sai A"],
    [/Giê-rê-mi-a|Giêrêmia/gi, "Zê Rê Mi A"],
    [/Ê-zê-ki-en|Êzêkien/gi, "Ê Zê Ki En"],
    [/Ga-li-lê-a|Galilêa/gi, "Ga Li Lê A"],
    [/Sa-ma-ri-a|Samaria/gi, "Sa Ma Ri A"],
    [/Pha-ri-sêu|Pharisêu/gi, "Pha Ri Sêu"],
    [/Ít-ra-en|Ítraen|Israen/gi, "Ít Ra En"],
    [/Na-za-rét|Nazarét/gi, "Na Za Rét"],
    [/\bA-men\b|\bA \u00a7Men\u00a7\b|\bAmen\b|\ba-men\b/gi, "A Meng"],
    [/\bPhải,\s/g, "Phải. "]
  ];
  for (const [p, r] of concatenatedCatholicNames) cleaned = cleaned.replace(p, r);

  // =========================================================================
  // BƯỚC GI→Z: Xử lý có kiểm soát, không đụng vào tên riêng thật
  // =========================================================================

  // 2b. Lowercase gi... bên ngoài §: từ tiếng Việt thông thường → áp dụng gi→z
  cleaned = cleaned
    .replace(/\bgiê/g, 'zê').replace(/\bgiế/g, 'zế')
    .replace(/\bgiề/g, 'zề').replace(/\bgiể/g, 'zể')
    .replace(/\bgiễ/g, 'zễ').replace(/\bgiệ/g, 'zệ');
  cleaned = cleaned.replace(new RegExp(`\\bgi(?=[${vowels}])`, 'g'), 'z');
  cleaned = cleaned
    .replace(/\bgì\b/g, 'zì')
    .replace(/\bgìn\b/g, 'zìn');

  // 2c. Uppercase Gi...: Đổi thành Z để tránh AI tự nhận diện nhầm thành Đ (ví dụ: Gia-cóp -> Đa-cóp)
  cleaned = cleaned
    .replace(/\bGiê/g, 'Zê').replace(/\bGiế/g, 'Zế')
    .replace(/\bGiề/g, 'Zề').replace(/\bGiể/g, 'Zể')
    .replace(/\bGiễ/g, 'Zễ').replace(/\bGiệ/g, 'Zệ');
  cleaned = cleaned.replace(new RegExp(`\\bGi(?=[${vowels}])`, 'g'), 'Z');
  cleaned = cleaned
    .replace(/\bGì\b/g, 'Zì')
    .replace(/\bGìn\b/g, 'Zìn');

  // 2d. Đổi chữ D và d thành Z và z để tránh AI đọc nhầm thành Đ/đ
  // (Lưu ý: lệnh này tuyệt đối không đụng tới chữ Đ hay đ)
  cleaned = cleaned.replace(/D/g, 'Z').replace(/d/g, 'z');

  // Dọn sạch § còn sót (nếu pattern nào đó tạo ra § mà không được xử lý ở bước 2a)
  cleaned = cleaned.replace(/\u00a7/g, '');

  // Xóa khoảng trắng thừa và chuẩn hóa dấu câu
  cleaned = cleaned.replace(/\s+([.:;!?,])/g, '$1');
  cleaned = cleaned
    .replace(/,([^\s])/g, ', $1')
    .replace(/;([^\s])/g, '; $1')
    .replace(/:([^\s])/g, ': $1');

  const lines = cleaned.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim());
  return lines.filter(Boolean).join('\n');
}
