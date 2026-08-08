import { execSync } from 'child_process';

const candidates = [
    // Rút-tơ
    'sach-rut', 'rut-to', 'sach-rut-to', 'sach-rut-chuong-1', 'rut-to-chuong-1',
    // 1 Sa-mu-en
    'sach-1-samuen', '1-samuen', '1-sa-mu-en', 'sach-1-samuen-chuong-1', '1-sa-mu-en-chuong-1',
    // 2 Sa-mu-en
    'sach-2-samuen', '2-samuen', '2-sa-mu-en', 'sach-2-samuen-chuong-1', '2-sa-mu-en-chuong-1',
    // 1 Vua
    '1-vua', '1-vua-chuong-1', 'sach-1-vua-chuong-1',
    // 2 Vua
    '2-vua', '2-vua-chuong-1', 'sach-2-vua-chuong-1',
    // 1 Sử Biên
    'sach-1-su-bien-chuong-1', '1-su-bien-chuong-1', '1-su-bien', 'sach-1-subien',
    // 2 Sử Biên
    'sach-2-su-bien-chuong-1', '2-su-bien-chuong-1', '2-su-bien', 'sach-2-subien',
    // Én-ra
    'sach-et-ra', 'et-ra', 'sach-et-ra-chuong-1', 'et-ra-chuong-1', 'en-ra',
    // Giu-đi-ta
    'sach-giu-di-ta-chuong-1', 'giu-di-ta', 'sach-giudita', 'giu-di-ta-chuong-1',
    // 1 Ma-ca-bê
    'sach-1-macabe', '1-macabe', '1-ma-ca-be', 'sach-1-macabe-chuong-1', '1-ma-ca-be-chuong-1',
    // 2 Ma-ca-bê
    'sach-2-macabe', '2-macabe', '2-ma-ca-be', 'sach-2-macabe-chuong-1', '2-ma-ca-be-chuong-1'
];

candidates.forEach(slug => {
    const url = `https://augustino.net/${slug}`;
    try {
        const code = execSync(`curl -sL -o /dev/null -w "%{http_code}" "${url}"`).toString();
        if (code === '200') {
            console.log(`✅ FOUND: ${slug} => HTTP 200`);
        }
    } catch (e) {}
});
