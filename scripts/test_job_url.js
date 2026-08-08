import { execSync } from 'child_process';

const testUrls = [
    'https://augustino.net/sach-giop',
    'https://augustino.net/sach-giop-chuong-2'
];

testUrls.forEach(url => {
    try {
        const out = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        console.log(`URL: ${url} => HTTP ${out}`);
    } catch (e) {}
});
