import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// List of all common Vietnamese initial prefixes that often get glued to words:
// "ai", "bị", "có", "cho", "đã", "đang", "được", "khi", "người", "những", "thì", "sẽ", "là", "nói", "với", "không", "như", "ông", "bà", "anh", "em", "con", "họ", "chúng", "ta", "tôi", "mình", "ngươi"
const commonGluedPrefixes = [
    'ai', 'bị', 'có', 'cho', 'đã', 'đang', 'được', 'khi', 'người', 'những', 
    'thì', 'sẽ', 'là', 'nói', 'với', 'không', 'như', 'ông', 'bà', 'anh', 
    'em', 'con', 'họ', 'chúng', 'ta', 'tôi', 'mình', 'ngươi', 'kẻ', 'các', 'mọi', 'vẫn'
];

async function testStrict() {
    console.log("🔍 Đang tải dữ liệu Mát-thêu 5 để test dính chữ...");
    
    const { data: verses } = await supabase
        .from('verses')
        .select('book_id, chapter, verse_num, verse_text')
        .eq('book_id', 'mat')
        .eq('chapter', 5);
        
    // Standard list of valid single Vietnamese words (so we never split single words like "nhưng", "lành", "thương", "không", "người", "thiên")
    const validSingleWords = new Set([
        'nhưng', 'lành', 'thương', 'không', 'người', 'thiên', 'chúa', 'giêsu', 'thánh', 'linh',
        'trong', 'ngoài', 'trên', 'dưới', 'trước', 'sau', 'giữa', 'nhiều', 'nghèo', 'chính',
        'khiến', 'phúc', 'nước', 'trời', 'chúng', 'ngươi', 'nghiêm', 'chẳng', 'nghe', 'thấy'
    ]);
    
    // Common glued prefixes
    const prefixes = ['ai', 'bị', 'có', 'cho', 'đã', 'đang', 'được', 'khi', 'người', 'những', 'thì', 'sẽ', 'là', 'nói', 'với', 'ông', 'bà', 'anh', 'em', 'con', 'họ', 'chúng', 'ta', 'tôi', 'mình', 'ngươi', 'kẻ', 'mọi', 'vẫn'];
    
    // Valid right syllables
    const validRightSyllables = new Set([
        'có', 'bị', 'đã', 'đang', 'được', 'nói', 'cho', 'nào', 'ấy', 'họ', 'sẽ', 'nhà', 'bách', 'hại', 'nghèo', 'khó', 'trong', 'sạch', 'xót', 'thương', 'thuận', 'hòa', 'yêu', 'ghét'
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
    
    console.log(`Kiểm tra ${verses.length} câu của Mát-thêu 5:\n`);
    
    for (const v of verses) {
        let text = v.verse_text;
        const words = text.split(/(\s+|[.,;:!?!”"()\[\]–—/]+)/);
        let changed = false;
        
        const fixedWords = words.map(w => {
            if (/^[a-zà-ỹđ]{4,15}$/i.test(w)) {
                const split = splitGluedWord(w);
                if (split !== w) {
                    changed = true;
                    console.log(`  ✅ [mat 5:${v.verse_num}] Tách "${w}" ➔ "${split}"`);
                    return split;
                }
            }
            return w;
        });
    }
}

testStrict();
