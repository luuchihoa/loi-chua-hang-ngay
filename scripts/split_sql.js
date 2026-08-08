import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/scraped_prophets.json', 'utf8'));

const CHUNK_SIZE = 500;
let chunkIndex = 1;

for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    
    let sqlContent = `-- Dữ liệu sách Ngôn Sứ (Phần ${chunkIndex}) (${chunk.length} câu)\n`;
    sqlContent += `INSERT INTO verses (translation_id, book_id, chapter, verse_num, verse_text) VALUES\n`;
    
    const values = chunk.map(v => {
        const text = v.verse_text.replace(/'/g, "''");
        return `(${v.translation_id}, '${v.book_id}', ${v.chapter}, ${v.verse_num}, '${text}')`;
    });
    
    sqlContent += values.join(',\n') + `\nON CONFLICT (translation_id, book_id, chapter, verse_num) DO UPDATE \nSET verse_text = EXCLUDED.verse_text;\n`;
    
    fs.writeFileSync(`database/prophets_insert_part${chunkIndex}.sql`, sqlContent);
    console.log(`Created database/prophets_insert_part${chunkIndex}.sql`);
    chunkIndex++;
}

console.log("All chunks created!");
