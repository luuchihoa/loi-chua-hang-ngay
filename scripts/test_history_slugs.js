import { execSync } from 'child_process';

const HISTORICAL_BOOKS = [
    { id: 'js', name: 'Giô-suê', total: 24, slug: 'sach-gio-sue' },
    { id: 'tl', name: 'Thủ Lãnh', total: 21, slug: 'sach-thu-lanh' },
    { id: 'rt', name: 'Rút-tơ', total: 4, slug: 'sach-rut-to' },
    { id: '1sm', name: '1 Sa-mu-en', total: 31, slug: 'sach-1-sa-mu-en' },
    { id: '2sm', name: '2 Sa-mu-en', total: 24, slug: 'sach-2-sa-mu-en' },
    { id: '1v', name: '1 Vua', total: 22, slug: 'sach-1-vua' },
    { id: '2v', name: '2 Vua', total: 25, slug: 'sach-2-vua' },
    { id: '1sb', name: '1 Sử Biên', total: 29, slug: 'sach-1-su-bien' },
    { id: '2sb', name: '2 Sử Biên', total: 36, slug: 'sach-2-su-bien' },
    { id: 'er', name: 'Én-ra', total: 10, slug: 'sach-en-ra' },
    { id: 'nk', name: 'Nơ-khê-mi-a', total: 13, slug: 'sach-no-khe-mi-a' },
    { id: 'tb', name: 'Tô-bi-a', total: 14, slug: 'sach-to-bi-a' },
    { id: 'gdt', name: 'Giu-đi-ta', total: 16, slug: 'sach-giu-di-ta' },
    { id: 'et', name: 'Ét-te', total: 10, slug: 'sach-et-te' },
    { id: '1mc', name: '1 Ma-ca-bê', total: 16, slug: 'sach-1-ma-ca-be' },
    { id: '2mc', name: '2 Ma-ca-bê', total: 15, slug: 'sach-2-ma-ca-be' }
];

HISTORICAL_BOOKS.forEach(b => {
    console.log(`Checking ${b.name} (${b.id})...`);
    for (let c = 1; c <= Math.min(b.total, 2); c++) {
        const url = c === 1 ? `https://augustino.net/${b.slug}` : `https://augustino.net/${b.slug}-chuong-${c}`;
        try {
            const code = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
            console.log(`  Ch ${c}: ${url} => HTTP ${code}`);
        } catch (e) {
            console.log(`  Ch ${c}: ERROR`);
        }
    }
});
