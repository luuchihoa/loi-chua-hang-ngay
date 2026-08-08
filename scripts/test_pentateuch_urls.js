import { execSync } from 'child_process';

const BOOKS = [
    { name: 'Sáng Thế', total: 50, slug: 'sang-the' },
    { name: 'Xuất Hành', total: 40, slug: 'xuat-hanh' },
    { name: 'Lê-vi', total: 27, slug: 'le-vi' },
    { name: 'Dân Số', total: 36, slug: 'dan-so' },
    { name: 'Đệ Nhị Luật', total: 34, slug: 'de-nhi-luat' }
];

BOOKS.forEach(b => {
    console.log(`Checking ${b.name}...`);
    for (let c = 1; c <= Math.min(b.total, 3); c++) {
        const url = c === 1 ? `https://augustino.net/${b.slug}` : `https://augustino.net/${b.slug}-chuong-${c}`;
        try {
            const code = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
            console.log(`  Ch ${c}: ${url} => HTTP ${code}`);
        } catch (e) {
            console.log(`  Ch ${c}: ERROR`);
        }
    }
});
