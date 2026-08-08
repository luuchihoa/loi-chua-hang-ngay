import fs from 'fs';
import path from 'path';

const datasets = [
    { json: 'scripts/scraped_pentateuch.json', prefix: 'pentateuch_insert', label: 'Ngũ Thư' },
    { json: 'scripts/scraped_history_unique.json', fallbackJson: 'scripts/scraped_history.json', prefix: 'history_insert', label: 'Lịch Sử' },
    { json: 'scripts/scraped_psalms.json', prefix: 'psalms_insert', label: 'Thánh Vịnh' },
    { json: 'scripts/scraped_wisdom.json', prefix: 'wisdom_insert', label: 'Giáo Huấn' },
    { json: 'scripts/scraped_prophets.json', prefix: 'prophets_insert', label: 'Ngôn Sứ' }
];

const CHUNK_SIZE = 500;

for (const ds of datasets) {
    let jsonPath = ds.json;
    if (!fs.existsSync(jsonPath) && ds.fallbackJson && fs.existsSync(ds.fallbackJson)) {
        jsonPath = ds.fallbackJson;
    }
    
    if (!fs.existsSync(jsonPath)) {
        console.log(`Skipping ${ds.label}, file not found: ${jsonPath}`);
        continue;
    }

    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    
    // Deduplicate
    const uniqueVerses = [];
    const seen = new Set();
    for (const v of data) {
        const key = `${v.translation_id}-${v.book_id}-${v.chapter}-${v.verse_num}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueVerses.push(v);
        }
    }

    let chunkIndex = 1;
    for (let i = 0; i < uniqueVerses.length; i += CHUNK_SIZE) {
        const chunk = uniqueVerses.slice(i, i + CHUNK_SIZE);
        
        let sqlContent = `-- Dữ liệu ${ds.label} (Phần ${chunkIndex}) (${chunk.length} câu)\n`;
        sqlContent += `INSERT INTO verses (translation_id, book_id, chapter, verse_num, verse_text) VALUES\n`;
        
        const values = chunk.map(v => {
            const text = v.verse_text.replace(/'/g, "''");
            return `(${v.translation_id}, '${v.book_id}', ${v.chapter}, ${v.verse_num}, '${text}')`;
        });
        
        sqlContent += values.join(',\n') + `\nON CONFLICT (translation_id, book_id, chapter, verse_num) DO UPDATE \nSET verse_text = EXCLUDED.verse_text;\n`;
        
        const fileName = `database/${ds.prefix}_part${chunkIndex}.sql`;
        fs.writeFileSync(fileName, sqlContent);
        chunkIndex++;
    }
    console.log(`Generated ${chunkIndex - 1} SQL chunk files for ${ds.label} (${uniqueVerses.length} verses).`);
}
