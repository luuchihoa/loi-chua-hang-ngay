import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/scraped_history.json', 'utf8'));

const seen = new Set();
const duplicates = [];

for (const v of data) {
    const key = `${v.translation_id}-${v.book_id}-${v.chapter}-${v.verse_num}`;
    if (seen.has(key)) {
        duplicates.push(v);
    } else {
        seen.add(key);
    }
}

console.log(`Found ${duplicates.length} duplicates.`);
if (duplicates.length > 0) {
    console.log("First few duplicates:");
    console.log(duplicates.slice(0, 10));
}

// Remove duplicates and save a clean file
const uniqueData = [];
const seenForSave = new Set();
for (const v of data) {
    const key = `${v.translation_id}-${v.book_id}-${v.chapter}-${v.verse_num}`;
    if (!seenForSave.has(key)) {
        seenForSave.add(key);
        uniqueData.push(v);
    }
}

fs.writeFileSync('scripts/scraped_history_unique.json', JSON.stringify(uniqueData, null, 2));
console.log(`Saved ${uniqueData.length} unique verses to scraped_history_unique.json.`);
