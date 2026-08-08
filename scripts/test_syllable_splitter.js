import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSplitter() {
    console.log("📡 Đang tải 5,000 câu từ Supabase để thu thập bộ từ điển âm tiết tiếng Việt...");
    
    const { data: sampleVerses, error } = await supabase
        .from('verses')
        .select('verse_text')
        .limit(5000);
        
    if (error) {
        console.error("Lỗi đọc DB:", error.message);
        return;
    }
    
    // Build set of valid single Vietnamese syllables
    const validSyllables = new Set();
    
    for (const v of sampleVerses) {
        if (!v.verse_text) continue;
        // Clean text first
        let text = v.verse_text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
        text = text.replace(/([.,;:!?!”"\])])([\p{L}])/gu, '$1 $2');
        text = text.replace(/([\p{Ll}])([\p{Lu}])/gu, '$1 $2');
        
        // Extract words
        const tokens = text.split(/[\s.,;:!?!”"()\[\]–—/\-]+/);
        for (const tok of tokens) {
            const t = tok.toLowerCase().trim();
            // A valid single Vietnamese syllable is 1 to 7 chars, contains at most 1 tone mark
            if (/^[a-zà-ỹđ]{1,7}$/i.test(t)) {
                // Count tone marks
                const toneCount = (t.match(/[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi) || []).length;
                if (toneCount <= 1) {
                    validSyllables.add(t);
                }
            }
        }
    }
    
    console.log(`✅ Đã xây dựng bộ từ điển gồm ${validSyllables.size} âm tiết tiếng Việt hợp lệ.`);
    
    // Function to attempt splitting glued word token into valid syllables
    // Complete set of valid single Vietnamese words/syllables
    // To prevent false splitting of diphthong/triphthong words (e.g., tươi, duyên, xuyên, khoen, biên, vuốt, vuông, doanh)
    const validSingleWords = new Set([...validSyllables, 
        'tươi', 'duyên', 'xuyên', 'khoen', 'biên', 'vuốt', 'vuông', 'doanh', 'khiên', 'khuyến',
        'khoăn', 'toán', 'thuần', 'thuyền', 'khuôn', 'quên', 'khuyên', 'truyền', 'nguyện', 'chuyên'
    ]);

    function splitGluedToken(token) {
        const lower = token.toLowerCase();
        // If it's already a valid single word, DO NOT split!
        if (validSingleWords.has(lower)) return token;
        if (!/^[a-zà-ỹđ]+$/i.test(token)) return token;
        if (token.length < 4 || token.length > 20) return token;
        
        // Try splitting into 2 syllables: left (2 to len-2), right (2 to len-2)
        for (let i = 2; i <= lower.length - 2; i++) {
            const left = lower.slice(0, i);
            const right = lower.slice(i);
            
            if (validSyllables.has(left) && validSyllables.has(right)) {
                // Ensure left and right each are valid syllables
                // And ensure we don't split a diphthong inside a single syllable (like "tư-ơi")
                // A valid split boundary in Vietnamese glued words almost always happens:
                // Case A: Left ends with a vowel/consonant and Right STARTS WITH A CONSONANT (b,c,d,đ,g,h,k,l,m,n,p,q,r,s,t,v,x)
                // Case B: Left ends with a vowel/tone mark and Right starts with a vowel (e.g. "ai" + "ăn" -> "ai ăn", "ông" + "ấy" -> "ông ấy")
                const rightFirstLetter = right[0];
                const isRightStartingConsonant = /^[b-df-hj-np-tv-zđ]/i.test(right);
                const isRightStartingVowel = /^[a-eio-uà-ỹ]/i.test(right);
                
                const leftHasTone = /[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(left);
                const rightHasTone = /[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(right);
                
                // If both left and right have tone marks, it's DEFINITELY a glued word! (e.g., "khổcất", "chínhmúa", "lànhvì")
                if (leftHasTone && rightHasTone) {
                    return `${token.slice(0, i)} ${token.slice(i)}`;
                }
                
                // If right starts with a consonant (e.g. "ai" + "có" -> "aicó", "ai" + "bị" -> "aibị", "con" + "phải" -> "conphải")
                if (isRightStartingConsonant) {
                    return `${token.slice(0, i)} ${token.slice(i)}`;
                }
                
                // If left ends with a tone mark and right starts with a vowel (e.g., "ở" + "đây", "ấy" + "ăn")
                if (leftHasTone && isRightStartingVowel) {
                    return `${token.slice(0, i)} ${token.slice(i)}`;
                }
            }
        }
        
        return token;
    }

    // Now test this splitter on another batch of verses to see what glued words it finds!
    const { data: testVerses } = await supabase
        .from('verses')
        .select('book_id, chapter, verse_num, verse_text')
        .range(5000, 7000);
        
    console.log(`\n🔍 Đang thử nghiệm thuật toán tách từ dính trên 2,000 câu...`);
    const foundSplits = [];
    
    for (const v of testVerses) {
        if (!v.verse_text) continue;
        
        const words = v.verse_text.split(/(\s+|[.,;:!?!”"()\[\]–—/]+)/);
        let changed = false;
        const newWords = words.map(w => {
            if (/^[a-zà-ỹđ]{4,15}$/i.test(w)) {
                const split = splitGluedToken(w);
                if (split !== w) {
                    changed = true;
                    foundSplits.push({ citation: `${v.book_id} ${v.chapter}:${v.verse_num}`, original: w, fixed: split });
                    return split;
                }
            }
            return w;
        });
    }
    
    console.log(`\n🎉 KẾT QUẢ THỬ NGHIỆM TÌM THẤY ${foundSplits.length} TỪ BỊ DÍNH VÀ ĐÃ TÁCH THÀNH CÔNG:`);
    foundSplits.slice(0, 40).forEach((item, idx) => {
        console.log(`  ${idx + 1}. [${item.citation}] "${item.original}" ➔ "${item.fixed}"`);
    });
}

testSplitter();
