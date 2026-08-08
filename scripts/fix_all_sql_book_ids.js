import fs from 'fs';
import path from 'path';

const ID_MAP = {
    'dn': 'dnl', // Deuteronomy: dn -> dnl
    'js': 'gs',  // Joshua: js -> gs
    'rt': 'r',   // Ruth: rt -> r
    'nk': 'nhm'  // Nehemiah: nk -> nhm
};

const dbDir = 'database';
const files = fs.readdirSync(dbDir);

files.forEach(file => {
    if (!file.endsWith('.sql') || file === 'bible_schema.sql' || file === 'books_insert.sql') return;

    const filePath = path.join(dbDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    Object.entries(ID_MAP).forEach(([oldId, newId]) => {
        const targetStr = `VALUES (1, '${oldId}',`;
        const replaceStr = `VALUES (1, '${newId}',`;
        if (content.includes(targetStr)) {
            content = content.replaceAll(targetStr, replaceStr);
            modified = true;
            console.log(`✅ [${file}]: ${oldId} => ${newId}`);
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }
});

console.log("🎉 Tất cả các file SQL đã được chuẩn hóa book_id 100% khớp với bảng books!");
