import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_SERVICE_ROLE_KEY trong .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Single words that must never be split
const validSingleWords = new Set([
    'nhưng', 'lành', 'thương', 'không', 'người', 'thiên', 'chúa', 'giêsu', 'thánh', 'linh',
    'trong', 'ngoài', 'trên', 'dưới', 'trước', 'sau', 'giữa', 'nhiều', 'nghèo', 'chính',
    'khiến', 'phúc', 'nước', 'trời', 'chúng', 'ngươi', 'nghiêm', 'chẳng', 'nghe', 'thấy',
    'tươi', 'duyên', 'xuyên', 'khoen', 'biên', 'vuốt', 'vuông', 'doanh', 'khiên', 'khuyến',
    'khoăn', 'toán', 'thuần', 'thuyền', 'khuôn', 'quên', 'khuyên', 'truyền', 'nguyện', 'chuyên'
]);

// Glued prefixes
const prefixes = [
    'ai', 'bị', 'có', 'cho', 'đã', 'đang', 'được', 'khi', 'người', 'những', 
    'thì', 'sẽ', 'là', 'nói', 'với', 'ông', 'bà', 'anh', 'em', 'con', 
    'họ', 'chúng', 'ta', 'tôi', 'mình', 'ngươi', 'kẻ', 'mọi', 'vẫn', 
    'trong', 'đến', 'nào', 'về', 'qua', 'theo', 'như', 'bởi'
];

// Glued right syllables
const validRightSyllables = new Set([
    'có', 'bị', 'đã', 'đang', 'được', 'nói', 'cho', 'nào', 'ấy', 'họ', 'sẽ', 'nhà', 
    'bách', 'hại', 'nghèo', 'khó', 'trong', 'sạch', 'xót', 'thương', 'thuận', 'hòa', 
    'yêu', 'ghét', 'ông', 'bà', 'cha', 'mẹ', 'con', 'ta', 'tôi', 'mình', 'kẻ', 
    'người', 'này', 'kia', 'nọ', 'đó', 'đây', 'thì', 'là', 'lại', 'ra', 'vào', 
    'lên', 'xuống', 'đến', 'về', 'qua', 'đi', 'đó', 'sau', 'trước', 'nữa', 'cũng', 
    'đều', 'chỉ', 'mới', 'chưa', 'không', 'chẳng', 'nghe', 'thấy', 'biết', 'muốn', 
    'phải', 'thấy', 'nhìn', 'làm', 'tạo', 'sinh', 'truyền', 'dạy', 'bảo', 'ăn', 'uống'
]);

function splitGluedWord(w) {
    const lower = w.toLowerCase();
    if (validSingleWords.has(lower)) return w;
    
    for (const p of prefixes) {
        if (lower.startsWith(p) && lower.length > p.length) {
            const rest = lower.slice(p.length);
            if (validRightSyllables.has(rest)) {
                return `${w.slice(0, p.length)} ${w.slice(p.length)}`;
            }
        }
    }
    return w;
}

function cleanVerseText(text) {
    if (!text) return text;
    
    let cleaned = text;
    // 1. Remove invisible chars & non-breaking spaces
    cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    cleaned = cleaned.replace(/\u00A0/g, ' ');
    
    // 1b. Fix embedded subverse markers like .4a, .17a, .19a, ,4b, ”25b
    cleaned = cleaned.replace(/([.,;:!?!”"()])\s*[0-9]{1,2}[a-zđĐ]\s+([A-ZÀ-ỸđĐa-zà-ỹ])/gu, '$1 $2');

    // 2. Fix Punctuation + Letter
    cleaned = cleaned.replace(/([.,;:!?])([\p{L}])/gu, '$1 $2');
    cleaned = cleaned.replace(/([”"\])])([\p{L}])/gu, '$1 $2');
    cleaned = cleaned.replace(/([\p{L}])([“"\[(])/gu, '$1 $2');
    
    // 3. Fix Lowercase + Uppercase
    cleaned = cleaned.replace(/([\p{Ll}])([\p{Lu}])/gu, '$1 $2');
    
    // 4. Fix Glued Words (aicó -> ai có, aibị -> ai bị, ngườinào -> người nào)
    const parts = cleaned.split(/(\s+|[.,;:!?!”"()\[\]–—/]+)/);
    cleaned = parts.map(p => {
        if (/^[a-zà-ỹđ]{4,20}$/i.test(p)) {
            return splitGluedWord(p);
        }
        return p;
    }).join('');
    
    // 5. Normalize multiple spaces
    cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
    return cleaned;
}

async function runCleanup() {
    console.log("📡 Đang quét toàn bộ bảng `verses` trên Supabase...");
    
    const { count, error: countErr } = await supabase
        .from('verses')
        .select('*', { count: 'exact', head: true });
        
    if (countErr) {
        console.error("💥 Lỗi đọc DB:", countErr.message);
        return;
    }
    
    console.log(`📊 Tổng số câu trong bảng verses: ${count} câu.`);
    
    const pageSize = 1000;
    let totalUpdated = 0;
    const changedLog = [];
    
    for (let from = 0; from < count; from += pageSize) {
        const to = from + pageSize - 1;
        const { data: rows, error: fetchErr } = await supabase
            .from('verses')
            .select('id, translation_id, book_id, chapter, verse_num, verse_text')
            .range(from, to);
            
        if (fetchErr) {
            console.error(`💥 Lỗi tải từ dòng ${from}:`, fetchErr.message);
            continue;
        }
        
        const updates = [];
        
        for (const row of rows) {
            const origText = row.verse_text;
            const fixedText = cleanVerseText(origText);
            
            if (fixedText !== origText) {
                updates.push({
                    id: row.id,
                    translation_id: row.translation_id,
                    book_id: row.book_id,
                    chapter: row.chapter,
                    verse_num: row.verse_num,
                    verse_text: fixedText
                });
                
                changedLog.push({
                    citation: `${row.book_id} ${row.chapter}:${row.verse_num}`,
                    before: origText,
                    after: fixedText
                });
            }
        }
        
        if (updates.length > 0) {
            const { error: updateErr } = await supabase
                .from('verses')
                .upsert(updates, { onConflict: 'id' });
                
            if (updateErr) {
                console.error("❌ Lỗi cập nhật:", updateErr.message);
            } else {
                totalUpdated += updates.length;
                console.log(`  ✅ [${from + 1}..${Math.min(to + 1, count)}] Đã sửa +${updates.length} câu bị dính từ (Tổng số câu đã sửa: ${totalUpdated})`);
            }
        }
    }
    
    console.log(`\n==================================================`);
    console.log(`🎉 HOÀN THÀNH TÁCH TỪ DÍNH TRÊN TOÀN BỘ DATABASE!`);
    console.log(`- Tổng số câu Kinh Thánh đã được sửa: ${totalUpdated} câu`);
    console.log(`==================================================\n`);
    
    fs.writeFileSync('database/changed_words_report.json', JSON.stringify(changedLog, null, 2));
    console.log("📄 Báo cáo chi tiết đã lưu vào file database/changed_words_report.json!");
}

runCleanup();
