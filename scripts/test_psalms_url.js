import { execSync } from 'child_process';

const testUrls = [
    'https://augustino.net/sach-thanh-vinh-chuong-50',
    'https://augustino.net/sach-thanh-vinh-thanh-vinh-50',
    'https://augustino.net/thanh-vinh-50',
    'https://augustino.net/sach-thanh-vinh-tv-50',
    'https://augustino.net/sach-thanh-vinh-50'
];

testUrls.forEach(url => {
    try {
        const out = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        console.log(`URL: ${url} => HTTP ${out}`);
    } catch (e) {
        console.log(`URL: ${url} => ERROR`);
    }
});
