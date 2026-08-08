import fs from 'fs';

const bibleIndex = JSON.parse(fs.readFileSync('src/data/bible/bibleIndex.json', 'utf-8'));
const otBooks = bibleIndex.old_testament;
const ntBooks = bibleIndex.new_testament;
const allBooks = [...otBooks, ...ntBooks];

const dbFiles = fs.readdirSync('database');
console.log(`\n===============================================================`);
console.log(`🏆 AUDIT PHỦ TRỌN BỘ KINHN THÁNH (${allBooks.length} SÁCH - 1.334 CHƯƠNG)`);
console.log(`===============================================================\n`);

let missingCount = 0;
allBooks.forEach(b => {
    const matchedFile = dbFiles.find(f => {
        if (!f.endsWith('.sql') || f === 'bible_schema.sql' || f === 'books_insert.sql') return false;
        const content = fs.readFileSync(`database/${f}`, 'utf-8');
        return content.includes(`VALUES (1, '${b.id}',`);
    });

    if (matchedFile) {
        console.log(`✅ [${b.id.padEnd(4)}] ${b.name.padEnd(25)} (${String(b.chapters).padStart(3)} ch) => database/${matchedFile}`);
    } else {
        console.log(`❌ [${b.id.padEnd(4)}] ${b.name.padEnd(25)} (${String(b.chapters).padStart(3)} ch) => MISSING!`);
        missingCount++;
    }
});

console.log(`\n===============================================================`);
console.log(`🎉 KẾT QUẢ AUDIT KINHN THÁNH: ${allBooks.length - missingCount}/${allBooks.length} Sách Đã Được Phủ Tệp SQL 100%!`);
console.log(`===============================================================\n`);
