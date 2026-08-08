import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Valid 1-2 letter words in Vietnamese (like "y", "ý", "ở", "ổ", "ổn", "ảo", "ăn", "âm", "ân", "ơi", "ơi", "đi", "đã", "đó", "đây", "uy", "vú", "về", "có", "ai", "bị", "bà", "v.v.")
// Standalone consonant clusters like "nh", "ng", "kh", "ch", "th", "ph", "tr", "gh", "gi", "qu", "nh" are INVALID!

const invalidStandaloneWords = new Set([
    'nh', 'ng', 'kh', 'ch', 'th', 'ph', 'tr', 'gh', 'gi', 'qu',
    'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x'
]);

async function findInvalidWords() {
    console.log("🔍 Đang nạp toàn bộ 35,337 câu từ Supabase để tìm các từ vô nghĩa (nh, ng, kh...)...");
    
    const { count } = await supabase
        .from('verses')
        .select('*', { count: 'exact', head: true });
        
    const pageSize = 2000;
    const suspiciousList = [];
    
    for (let from = 0; from < count; from += pageSize) {
        const to = from + pageSize - 1;
        const { data: rows, error } = await supabase
            .from('verses')
            .select('book_id, chapter, verse_num, verse_text')
            .range(from, to);
            
        if (error) {
            console.error("Lỗi:", error.message);
            continue;
        }
        
        for (const r of rows) {
            if (!r.verse_text) continue;
            // Tokenize words
            const tokens = r.verse_text.split(/[\s.,;:!?!”"()\[\]–—/\-]+/);
            for (const t of tokens) {
                const lower = t.toLowerCase().trim();
                // Check if lower is a standalone invalid consonant or meaningless fragment
                if (invalidStandaloneWords.has(lower)) {
                    suspiciousList.push({
                        citation: `${r.book_id} ${r.chapter}:${r.verse_num}`,
                        word: t,
                        verse: r.verse_text
                    });
                }
                
                // Also check if word has NO VOWELS (a, e, i, o, u, y, á, à, ả, ã, ạ...) and length >= 2
                if (/^[a-zđ]{2,6}$/i.test(lower) && !/[aeiouyàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(lower)) {
                    // Ignore Roman numerals like "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "XV", "XX"
                    if (!/^(i|v|x)+$/i.test(lower) && !invalidStandaloneWords.has(lower)) {
                        suspiciousList.push({
                            citation: `${r.book_id} ${r.chapter}:${r.verse_num}`,
                            word: t,
                            verse: r.verse_text
                        });
                    }
                }
            }
        }
    }
    
    console.log(`\n==================================================`);
    console.log(`📊 PHÁT HIỆN TỔNG CỘNG ${suspiciousList.length} CÂU CHỨA TỪ VÔ NGHĨA!`);
    console.log(`==================================================\n`);
    
    suspiciousList.forEach((item, idx) => {
        console.log(`${idx + 1}. [${item.citation}] Từ vô nghĩa: "${item.word}"`);
        console.log(`   Câu: "${item.verse}"\n`);
    });
}

findInvalidWords();
