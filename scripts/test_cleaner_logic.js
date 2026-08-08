import fs from 'fs';

// Common Vietnamese syllables for splitting
const sampleTexts = [
    "ai khát hãy đến",
    "aikhát hãy đến",
    "emkhi nào về",
    "lành,vì họ sẽ",
    "đời.Truyền cho",
    "gần.”\u200BĐức Giê-su",
    "ngườivì họ",
    "Thiên-Chúa-ở-cùng-chúng-ta"
];

function cleanText(text) {
    if (!text) return text;
    
    // 1. Remove zero-width spaces and normalize whitespace
    let cleaned = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    cleaned = cleaned.replace(/\u00A0/g, ' ');
    
    // 2. Fix punctuation + letter without space (e.g. "lành,vì" -> "lành, vì", "đời.Truyền" -> "đời. Truyền")
    cleaned = cleaned.replace(/([.,;:!?])([\p{L}])/gu, '$1 $2');
    
    // 3. Fix closing quote/bracket + letter without space (e.g. ”Đức -> ” Đức)
    cleaned = cleaned.replace(/([”"\])])([\p{L}])/gu, '$1 $2');
    
    // 4. Fix lowercase + uppercase glued (e.g. "tôiChúa" -> "tôi Chúa")
    cleaned = cleaned.replace(/([\p{Ll}])([\p{Lu}])/gu, '$1 $2');
    
    // 5. Fix common glued lowercase words (aikhát -> ai khát, emkhi -> em khi, ngườivì -> người vì)
    // We can add a dictionary list of common glued pairs or syllable patterns
    const gluedMap = {
        'aikhát': 'ai khát',
        'emkhi': 'em khi',
        'ngườivì': 'người vì',
        'lànhvì': 'lành vì',
        'khổvì': 'khổ vì',
        'bìnhvì': 'bình vì',
        'hởvì': 'hở vì',
        'đếný': 'đến ý'
    };
    
    for (const [glued, fixed] of Object.entries(gluedMap)) {
        const regex = new RegExp(`\\b${glued}\\b`, 'gi');
        cleaned = cleaned.replace(regex, fixed);
    }
    
    // 6. Normalize multiple spaces
    cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
    
    return cleaned;
}

console.log("=== DEMO KẾT QUẢ XỬ LÝ TỪ DÍNH ===");
sampleTexts.forEach(t => {
    console.log(`Gốc: "${t}"`);
    console.log(`Sửa: "${cleanText(t)}"\n`);
});
