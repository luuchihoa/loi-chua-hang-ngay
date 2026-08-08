import { execSync } from 'child_process';

const testUrls = [
    'https://augustino.net/sach-ai-ca',
    'https://augustino.net/sach-ai-ca-chuong-2',
    'https://augustino.net/ai-ca-chuong-2',
    'https://augustino.net/ai-ca-2',
    'https://augustino.net/sach-ai-ca-2'
];

testUrls.forEach(url => {
    try {
        const out = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        console.log(`URL: ${url} => HTTP ${out}`);
    } catch (e) {}
});
