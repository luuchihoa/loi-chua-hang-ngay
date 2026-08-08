import fs from 'fs';

const bibleIndex = JSON.parse(fs.readFileSync('src/data/bible/bibleIndex.json', 'utf-8'));
const otBooks = bibleIndex.old_testament;

const dbFiles = fs.readdirSync('database');
console.log(`=== AUDIT OT COVERAGE (${otBooks.length} Old Testament Books) ===`);

let missingCount = 0;
otBooks.forEach(b => {
    // Check if any SQL file contains VALUES (1, 'book_id',
    const matchedFile = dbFiles.find(f => {
        if (!f.endsWith('.sql') || f === 'bible_schema.sql' || f === 'books_insert.sql') return false;
        const content = fs.readFileSync(`database/${f}`, 'utf-8');
        return content.includes(`VALUES (1, '${b.id}',`);
    });

    if (matchedFile) {
        console.log(`✅ [${b.id.padEnd(4)}] ${b.name.padEnd(20)} (${b.chapters} ch) => ${matchedFile}`);
    } else {
        console.log(`❌ [${b.id.padEnd(4)}] ${b.name.padEnd(20)} (${b.chapters} ch) => MISSING!`);
        missingCount++;
    }
});

console.log(`\nResult: ${otBooks.length - missingCount}/${otBooks.length} Old Testament Books covered!`);
