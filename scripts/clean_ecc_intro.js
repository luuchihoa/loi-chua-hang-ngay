import fs from 'fs';

// 1. Clean SQL
let sql = fs.readFileSync('database/ecclesiastes_all_chapters.sql', 'utf-8');
const introText = "Nguyên văn theo Kinh Thánh Công Giáo, bản dịch của Nhóm Các Giờ Kinh Phụng Vụ. Phần audio do Giu-se Định và Ma-ri-a Kim Hồi, cùng các anh chị em thanhlinh.net thực hiện.\n";
sql = sql.replace(introText, "");
fs.writeFileSync('database/ecclesiastes_all_chapters.sql', sql, 'utf-8');

// 2. Clean JSON
const json = JSON.parse(fs.readFileSync('scripts/ecclesiastes_all_chapters.json', 'utf-8'));
if (json[0] && json[0].content) {
    json[0].content = json[0].content.replace(introText, "").trim();
}
fs.writeFileSync('scripts/ecclesiastes_all_chapters.json', JSON.stringify(json, null, 2), 'utf-8');

console.log("✅ Đã làm sạch ghi chú đầu trang trong Sách Giảng Viên.");
