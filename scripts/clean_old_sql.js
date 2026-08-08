import fs from 'fs';
import path from 'path';

const dbDir = 'database';
const filesToKeep = new Set([
    'bible_schema.sql',
    'books_insert.sql',
    'proverbs_all_chapters.sql',
    'ecclesiastes_all_chapters.sql',
    'song_of_songs_all_chapters.sql'
]);

const files = fs.readdirSync(dbDir);
const deletedFiles = [];

files.forEach(file => {
    if (!filesToKeep.has(file)) {
        const fullPath = path.join(dbDir, file);
        fs.unlinkSync(fullPath);
        deletedFiles.push(file);
    }
});

console.log(`🧹 Đã xóa ${deletedFiles.length} file SQL/JSON cũ không còn dùng:`);
deletedFiles.forEach(f => console.log(` - ${f}`));
