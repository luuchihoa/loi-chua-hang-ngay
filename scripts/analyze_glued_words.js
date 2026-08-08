import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// List of all 7400+ valid Vietnamese syllables (unaccented + accented)
// Or a regex pattern to detect obvious concatenated syllables

async function analyze() {
    console.log("🔍 Đang tải mẫu dữ liệu từ bảng `verses` trên Supabase để phân tích các từ bị dính...");
    
    // Fetch a sample of 2000 verses across different books
    const { data: sampleVerses, error } = await supabase
        .from('verses')
        .select('id, book_id, chapter, verse_num, verse_text')
        .limit(3000);
        
    if (error) {
        console.error("Lỗi đọc DB:", error.message);
        return;
    }
    
    console.log(`Đã nạp ${sampleVerses.length} câu để kiểm tra.\n`);
    
    const lowercaseGluePattern = /[a-zà-ỹ]{2,}/gi;
    
    // Pattern 1: Lowercase followed by Uppercase (e.g., "tôiChúa")
    const lowerUpperPattern = /([\p{Ll}])([\p{Lu}])/gu;
    
    // Pattern 2: Punctuation followed by letter (e.g., "này.Khi", "ta,nhưng")
    const punctLetterPattern = /([.,;:!?])([\p{L}])/gu;
    
    // Pattern 3: Letter followed by number or vice versa (e.g. "câu12")
    const letterNumPattern = /([\p{L}])(\d)|(\d)([\p{L}])/gu;
    
    let lowerUpperCount = 0;
    let punctLetterCount = 0;
    let letterNumCount = 0;
    let suspectedGluedWords = new Set();
    
    for (const v of sampleVerses) {
        const text = v.verse_text;
        if (!text) continue;
        
        if (lowerUpperPattern.test(text)) {
            lowerUpperCount++;
            const matches = text.match(/[\p{Ll}][\p{Lu}]/gu);
            if (matches) matches.forEach(m => suspectedGluedWords.add(`[Thường+Hoa] ${m}`));
        }
        
        if (punctLetterPattern.test(text)) {
            punctLetterCount++;
            const matches = text.match(/[.,;:!?][\p{L}]/gu);
            if (matches) matches.forEach(m => suspectedGluedWords.add(`[Dấu+Chữ] ${m}`));
        }
        
        // Find words with multiple tone marks or suspicious concatenated syllables
        // In Vietnamese, a single syllable has AT MOST 1 tone mark (á, à, ả, ã, ạ, ê, ế, ề...)
        // If a single word token has >= 2 tone marks or 2 vowels separated by consonants like "aikhát", "emkhi"
        const words = text.split(/\s+/);
        for (const w of words) {
            // Count tone marks in word token
            const toneMatches = w.match(/[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi);
            if (toneMatches && toneMatches.length >= 2) {
                suspectedGluedWords.add(`[Multi-Tone] ${w} (ở câu ${v.book_id} ${v.chapter}:${v.verse_num})`);
            }
        }
    }
    
    console.log(`=== BÁO CÁO PHÂN TÍCH TỪ DÍNH TRÊN DATABASE ===`);
    console.log(`- Số câu bị dính Thường+Hoa (ví dụ "tôiChúa"): ${lowerUpperCount}`);
    console.log(`- Số câu bị dính Dấu+Chữ (ví dụ "này.Khi"):     ${punctLetterCount}`);
    console.log(`\nMột số ví dụ phát hiện được:`);
    Array.from(suspectedGluedWords).slice(0, 35).forEach(ex => console.log(`  • ${ex}`));
}

analyze();
