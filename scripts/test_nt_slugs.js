import { execSync } from 'child_process';

const NT_BOOKS = [
    { id: 'mt', name: 'Mát-thêu', total: 28, slug: 'tin-mung-theo-thanh-mat-theu' },
    { id: 'mc', name: 'Mác-cô', total: 16, slug: 'tin-mung-theo-thanh-mac-co' },
    { id: 'lc', name: 'Lu-ca', total: 24, slug: 'tin-mung-theo-thanh-lu-ca' },
    { id: 'ga', name: 'Gio-an', total: 21, slug: 'tin-mung-theo-thanh-gio-an' },
    { id: 'cv', name: 'Công Vụ Tông Đồ', total: 28, slug: 'sach-cong-vu-tong-do' },
    { id: 'rm', name: 'Rô-ma', total: 16, slug: 'thu-gui-tin-huu-ro-ma' },
    { id: '1cr', name: '1 Cô-rin-tô', total: 16, slug: 'thu-1-gui-tin-huu-co-rin-to' },
    { id: '2cr', name: '2 Cô-rin-tô', total: 13, slug: 'thu-2-gui-tin-huu-co-rin-to' },
    { id: 'gl', name: 'Ga-la-ti', total: 6, slug: 'thu-gui-tin-huu-ga-lat' },
    { id: 'ep', name: 'Ê-phê-xô', total: 6, slug: 'thu-gui-tin-huu-e-phe-xo' },
    { id: 'pl', name: 'Phi-líp-phê', total: 4, slug: 'thu-gui-tin-huu-phi-lip-phe' },
    { id: 'cl', name: 'Cô-lô-xê', total: 4, slug: 'thu-gui-tin-huu-co-lo-xe' },
    { id: '1tx', name: '1 Thê-xa-lô-ni-ca', total: 5, slug: 'thu-1-gui-tin-huu-the-xa-lo-ni-ca' },
    { id: '2tx', name: '2 Thê-xa-lô-ni-ca', total: 3, slug: 'thu-2-gui-tin-huu-the-xa-lo-ni-ca' },
    { id: '1tm', name: '1 Ti-mô-thê', total: 6, slug: 'thu-1-gui-ong-ti-mo-the' },
    { id: '2tm', name: '2 Ti-mô-thê', total: 4, slug: 'thu-2-gui-ong-ti-mo-the' },
    { id: 'tt', name: 'Ti-tô', total: 3, slug: 'thu-gui-ong-ti-to' },
    { id: 'plm', name: 'Phi-lê-môn', total: 1, slug: 'thu-gui-ong-phi-le-mon' },
    { id: 'dt', name: 'Do Thái', total: 13, slug: 'thu-gui-tin-huu-hip-ri' },
    { id: 'gc', name: 'Gia-cô-bê', total: 5, slug: 'thu-cua-thanh-gia-co-be' },
    { id: '1pr', name: '1 Phê-rô', total: 5, slug: 'thu-1-cua-thanh-phe-ro' },
    { id: '2pr', name: '2 Phê-rô', total: 3, slug: 'thu-2-cua-thanh-phe-ro' },
    { id: '1ga', name: '1 Gio-an', total: 5, slug: 'thu-1-cua-thanh-gio-an' },
    { id: '2ga', name: '2 Gio-an', total: 1, slug: 'thu-2-cua-thanh-gio-an' },
    { id: '3ga', name: '3 Gio-an', total: 1, slug: 'thu-3-cua-thanh-gio-an' },
    { id: 'gd', name: 'Giu-đa', total: 1, slug: 'thu-cua-thanh-giu-da' },
    { id: 'kh', name: 'Khải Huyền', total: 22, slug: 'sach-khai-huyen' }
];

NT_BOOKS.forEach(b => {
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
