import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkBrokenConsonants() {
    console.log("🔍 Đang tìm chính xác các từ đứng một mình là 'nh', 'ng', 'kh' trong toàn bộ DB...");
    
    // Check using SQL pattern matching or regex in JS across all 35,337 verses
    const { count } = await supabase
        .from('verses')
        .select('*', { count: 'exact', head: true });
        
    const pageSize = 2000;
    const matches = [];
    
    for (let from = 0; from < count; from += pageSize) {
        const to = from + pageSize - 1;
        const { data: rows } = await supabase
            .from('verses')
            .select('book_id, chapter, verse_num, verse_text')
            .range(from, to);
            
        if (!rows) continue;
        
        for (const r of rows) {
            if (!r.verse_text) continue;
            // Match standalone nh, ng, kh surrounded by spaces or punctuation
            const m = r.verse_text.match(/(?<=[\s.,;:!?!”"()\[\]–—/\-]|^)(nh|ng|kh)(?=[\s.,;:!?!”"()\[\]–—/\-]|$)/gi);
            if (m) {
                matches.push({
                    citation: `${r.book_id} ${r.chapter}:${r.verse_num}`,
                    found: m,
                    verse: r.verse_text
                });
            }
        }
    }
    
    console.log(`\n==================================================`);
    console.log(`📊 BÁO CÁO TÌM TỪ 'nh', 'ng', 'kh' ĐỨNG MỘT MÌNH:`);
    console.log(`- Tìm thấy: ${matches.length} câu.`);
    console.log(`==================================================\n`);
    
    matches.forEach((item, idx) => {
        console.log(`${idx + 1}. [${item.citation}] Phát hiện: "${item.found.join(', ')}"`);
        console.log(`   Câu: "${item.verse}"\n`);
    });
}

checkBrokenConsonants();
