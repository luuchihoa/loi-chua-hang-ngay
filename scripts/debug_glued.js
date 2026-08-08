import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugGlued() {
    console.log("🔍 Đang tìm kiếm các câu có từ 'aicó', 'aibị' trong database...");
    
    const { data: verses, error } = await supabase
        .from('verses')
        .select('book_id, chapter, verse_num, verse_text')
        .or('verse_text.ilike.%aicó%,verse_text.ilike.%aibị%,verse_text.ilike.%aiđã%,verse_text.ilike.%aicó%');
        
    if (error) {
        console.error("Lỗi:", error.message);
        return;
    }
    
    console.log(`Tìm thấy ${verses ? verses.length : 0} câu chứa 'aicó'/'aibị'...`);
    if (verses) {
        verses.slice(0, 10).forEach(v => {
            console.log(`- [${v.book_id} ${v.chapter}:${v.verse_num}]: "${v.verse_text}"`);
        });
    }
}

debugGlued();
