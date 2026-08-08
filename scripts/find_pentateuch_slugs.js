import { execSync } from 'child_process';

const testSlugs = [
    'sach-sang-the',
    'sach-sang-the-chuong-1',
    'sang-the-1',
    'st-1',
    'sach-sang-the-chuong-2',
    'sang-the-chuong-2',
    'sang-the-2',
    'sach-xuat-hanh',
    'sach-xuat-hanh-chuong-2',
    'xuat-hanh-2',
    'sach-le-vi-chuong-2',
    'le-vi-2',
    'sach-dan-so-chuong-2',
    'dan-so-2',
    'sach-de-nhi-luat-chuong-2',
    'de-nhi-luat-2'
];

testSlugs.forEach(slug => {
    const url = `https://augustino.net/${slug}`;
    try {
        const code = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        if (code === '200') {
            console.log(`✅ FOUND: ${url} => HTTP ${code}`);
        }
    } catch (e) {}
});
