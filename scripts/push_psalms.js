import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Loading Psalms data...");
    const data = JSON.parse(fs.readFileSync('scripts/scraped_psalms.json', 'utf8'));
    console.log(`Loaded ${data.length} verses from JSON.`);
    
    const batchSize = 200;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        console.log(`Pushing batch ${i / batchSize + 1} (${batch.length} verses)...`);
        
        const { error } = await supabase.from('verses').upsert(batch, {
            onConflict: 'translation_id, book_id, chapter, verse_num',
            ignoreDuplicates: true
        });
        
        if (error) {
            console.error(`Error pushing batch ${i / batchSize + 1}:`, error.message);
            process.exit(1);
        }
    }
    
    console.log("Successfully pushed all verses to Supabase!");
}

main();
