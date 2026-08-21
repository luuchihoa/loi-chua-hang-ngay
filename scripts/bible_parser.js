import * as cheerio from 'cheerio';

/**
 * Làm sạch chuỗi văn bản:
 * - Loại bỏ các ký tự khoảng trắng vô hình (Zero-width spaces, BOM)
 * - Chuẩn hóa các dấu cách liên tiếp
 * - Trim đầu cuối
 */
export function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

/**
 * Phân tích cấu trúc DOM của 1 chương Kinh Thánh từ augustino.net
 * @param {cheerio.Root} $ 
 * @param {cheerio.Cheerio} contentDiv 
 * @returns {string} Nội dung chương định dạng chuẩn với [PART], [SECTION], (số câu)...
 */
export function parseChapterContent($, contentDiv) {
    const outputLines = [];

    contentDiv.children().each((_, el) => {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        const $el = $(el);

        // 1. Bỏ qua thẻ script, style, noscript, hr
        if (['script', 'style', 'noscript', 'hr'].includes(tag)) return;

        // 2. Bỏ qua ảnh hoặc khối credit audio đầu trang
        if ($el.find('img').length > 0 && !cleanText($el.text())) return;
        const textContent = cleanText($el.text());
        if (textContent.includes('Nguyên văn theo') || textContent.includes('Các Giờ Kinh Phụng Vụ') || textContent.includes('thanhlinh.net')) return;

        // 3. Bỏ qua <h1>, <h2> vì là Tiêu đề sách / Tiêu đề chương (VD: "Chương 1")
        if (tag === 'h1' || tag === 'h2') return;

        // 4. [PART]: Các thẻ heading từ <h3> đến <h6> (Đại mục / Khối nội dung lớn)
        if (['h3', 'h4', 'h5', 'h6'].includes(tag)) {
            const headingText = cleanText($el.text());
            if (headingText) {
                outputLines.push(`[PART] ${headingText}`);
            }
            return;
        }

        // 5. Xử lý các thẻ đoạn văn <p>
        if (tag === 'p') {
            // Xóa các nhãn chú thích liên kết chéo (span.reference)
            $el.find('span.reference').remove();

            const hasSub = $el.find('sub').length > 0;
            const fullText = cleanText($el.text());
            if (!fullText) return;

            // KIỂM TRA [SECTION]:
            // - Không chứa <sub> (không phải câu kinh thánh)
            // - Chứa tổ hợp thẻ strong + em (in đậm nghiêng) bao trọn tiêu đề
            const strongEmEl = $el.find('strong em, em strong, b i, i b');
            if (!hasSub && strongEmEl.length > 0) {
                const strongEmText = cleanText(strongEmEl.text());
                if (strongEmText === fullText || fullText.replace(strongEmText, '').trim().length === 0) {
                    outputLines.push(`[SECTION] ${strongEmText}`);
                    return;
                }
            }

            // 6. Xử lý dòng nội dung Lời Chúa (văn xuôi / thơ / trích dẫn)
            let paragraphStr = '';
            el.children.forEach(child => {
                if (child.tagName === 'sub') {
                    const subId = $(child).attr('id') || cleanText($(child).text());
                    if (subId && (/^\d+[a-z]?$/.test(subId) || /^\d+-\d+$/.test(subId) || /^\d+$/.test(subId))) {
                        paragraphStr += ` (${subId}) `;
                    }
                } else if (child.tagName === 'br') {
                    paragraphStr += ' \n ';
                } else if (child.nodeType === 3) {
                    paragraphStr += child.data;
                } else {
                    paragraphStr += $(child).text();
                }
            });

            const linesInP = paragraphStr.split('\n').map(l => cleanText(l)).filter(Boolean);
            if (linesInP.length > 0) {
                outputLines.push(linesInP.join('\n'));
            }
        }
    });

    return outputLines.join('\n');
}
