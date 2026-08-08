import { execSync } from 'child_process';

for (let i = 1; i <= 150; i++) {
    const url = i === 1 ? 'https://augustino.net/sach-thanh-vinh' : `https://augustino.net/thanh-vinh-${i}`;
    try {
        const out = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        if (out !== '200') {
            console.log(`❌ Tv ${i}: ${url} => HTTP ${out}`);
        }
    } catch (e) {
        console.log(`❌ Tv ${i}: ERROR`);
    }
}
console.log("✅ Check all 150 Psalms URL slugs complete.");
