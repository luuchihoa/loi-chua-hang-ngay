import { execSync } from 'child_process';

const PROPHETIC_BOOKS = [
    { id: 'is', name: 'I-sai-a', total: 66, slug: 'sach-ngon-su-i-sai-a' },
    { id: 'gr', name: 'Giê-rê-mi-a', total: 52, slug: 'sach-ngon-su-gie-re-mi-a' },
    { id: 'ac', name: 'Ai Ca', total: 5, slug: 'sach-ai-ca' },
    { id: 'br', name: 'Ba-rúc', total: 6, slug: 'sach-ba-ruc' },
    { id: 'ed', name: 'Ê-dê-ki-en', total: 48, slug: 'sach-ngon-su-e-de-ki-en' },
    { id: 'dn', name: 'Đa-ni-en', total: 14, slug: 'sach-ngon-su-da-ni-en' },
    { id: 'hs', name: 'Hô-sê', total: 14, slug: 'sach-ngon-su-ho-se' },
    { id: 'ge', name: 'Giô-en', total: 4, slug: 'sach-ngon-su-gio-en' },
    { id: 'am', name: 'A-mốt', total: 9, slug: 'sach-ngon-su-a-mot' },
    { id: 'ov', name: 'Ô-va-đi-a', total: 1, slug: 'sach-ngon-su-o-va-di-a' },
    { id: 'gn', name: 'Giô-na', total: 4, slug: 'sach-ngon-su-gio-na' },
    { id: 'mk', name: 'Mi-kha', total: 7, slug: 'sach-ngon-su-mi-kha' },
    { id: 'nh', name: 'Na-khum', total: 3, slug: 'sach-ngon-su-na-khum' },
    { id: 'hb', name: 'Kha-ba-cúc', total: 3, slug: 'sach-ngon-su-kha-ba-cuc' },
    { id: 'xp', name: 'Xô-phô-ni-a', total: 3, slug: 'sach-ngon-su-xo-pho-ni-a' },
    { id: 'kg', name: 'Khắc-gai', total: 2, slug: 'sach-ngon-su-khac-gai' },
    { id: 'dcr', name: 'Da-ca-ri-a', total: 14, slug: 'sach-ngon-su-da-ca-ri-a' },
    { id: 'ml', name: 'Ma-la-khi', total: 3, slug: 'sach-ngon-su-ma-la-khi' }
];

PROPHETIC_BOOKS.forEach(b => {
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
