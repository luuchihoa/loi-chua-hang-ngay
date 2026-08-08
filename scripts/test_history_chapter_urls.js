import { execSync } from 'child_process';

const testUrls = [
    'https://augustino.net/sach-sa-mu-en-1',
    'https://augustino.net/sach-sa-mu-en-1-chuong-2',
    'https://augustino.net/sach-cac-vua-1',
    'https://augustino.net/sach-cac-vua-1-chuong-2',
    'https://augustino.net/sach-su-bien-1',
    'https://augustino.net/sach-su-bien-1-chuong-2',
    'https://augustino.net/sach-giu-di-tha',
    'https://augustino.net/sach-giu-di-tha-chuong-2',
    'https://augustino.net/sach-ma-ca-be-1',
    'https://augustino.net/sach-ma-ca-be-1-chuong-2'
];

testUrls.forEach(url => {
    try {
        const out = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        console.log(`URL: ${url} => HTTP ${out}`);
    } catch (e) {}
});
