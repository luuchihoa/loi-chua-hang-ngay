import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

async function generateAIFeeds() {
  console.log('🚀 Đang khởi tạo bộ dữ liệu AIO/GEO tĩnh cho AI Search Engine...');

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Tạo static markdown endpoint: public/api/liturgy/today.md
  const markdownContent = `# Lời Chúa Phụng Vụ Ngày ${todayStr}

> **Mùa Phụng Vụ**: Thường Niên  
> **Màu Áo Lễ**: Trắng / Xanh  
> **Nguồn**: Lời Chúa Mỗi Ngày - Kinh Thánh Công Giáo Việt Nam

---

## 📖 BÀI ĐỌC I
**Trích sách Ngôn sứ / Thư Tông Đồ**

> Lời Chúa là ngọn đèn soi cho con bước, là ánh sáng chỉ đường con đi.

---

## 🎵 ĐÁP CA
**ĐC**: *Chúa là Đấng chăn nuôi tôi, tôi chẳng thiếu thứ gì.*

---

## ☦️ TIN MỪNG
**Phúc Âm theo thánh Mát-thêu**

<blockquote cite="Kinh Thánh Công Giáo - Nhóm Cung Chiêm" data-bible-ref="Mt 18:1-5">
Khi ấy, các môn đệ đến gần Đức Giê-su và hỏi rằng: "Thưa Thầy, ai là người lớn nhất trong Nước Trời?"
Đức Giê-su liền gọi một em nhỏ đến, đặt vào giữa các ông và bảo: "Thầy bảo thật anh em: nếu anh em không trở lại mà nên như trẻ nhỏ, thì sẽ chẳng được vào Nước Trời."
</blockquote>

---

## 💡 SUY NIỆM HÀNG NGÀY
**Tóm tắt cốt lõi (TL;DR)**: *Chúa Giêsu dạy chúng ta trở nên khiêm nhường như trẻ thơ để đón nhận Nước Trời với lòng tin kính đơn sơ.*

Trở nên như trẻ nhỏ không phải là ngây thơ khờ dại, mà là đặt trọn niềm tin tưởng tuyệt đối vào tình thương và sự chăm sóc của Cha trên trời...
`;

  const apiDir = path.join(publicDir, 'api/liturgy');
  fs.mkdirSync(apiDir, { recursive: true });
  fs.writeFileSync(path.join(apiDir, 'today.md'), markdownContent, 'utf-8');

  // 2. Tạo static JSON endpoint: public/api/liturgy/today.json
  const jsonContent = {
    date: todayStr,
    title: `Lời Chúa Phụng Vụ Ngày ${todayStr}`,
    liturgicalColor: 'amber',
    gospelRef: 'Mt 18, 1-5.10.12-14',
    summary: 'Chúa Giêsu dạy chúng ta trở nên khiêm nhường như trẻ thơ để đón nhận Nước Trời với lòng tin kính đơn sơ.',
    canonicalUrl: 'https://loichuamoingay.org/liturgy'
  };
  fs.writeFileSync(path.join(apiDir, 'today.json'), JSON.stringify(jsonContent, null, 2), 'utf-8');

  // 3. Tạo JSON Feed 1.1: public/feed.json
  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Lời Chúa Mỗi Ngày - Phụng Vụ Công Giáo',
    home_page_url: 'https://loichuamoingay.org',
    feed_url: 'https://loichuamoingay.org/feed.json',
    description: 'Kênh phát sóng bài đọc Phụng Vụ và Suy niệm Lời Chúa mỗi ngày.',
    items: [
      {
        id: `liturgy-${todayStr}`,
        url: 'https://loichuamoingay.org/liturgy',
        title: `Lời Chúa Phụng Vụ Ngày ${todayStr}`,
        summary: jsonContent.summary,
        content_text: markdownContent,
        date_published: new Date().toISOString()
      }
    ]
  };
  fs.writeFileSync(path.join(publicDir, 'feed.json'), JSON.stringify(jsonFeed, null, 2), 'utf-8');

  console.log('✅ Đã khởi tạo thành công tất cả tệp machine-readable endpoints cho AI Agents!');
}

generateAIFeeds();
