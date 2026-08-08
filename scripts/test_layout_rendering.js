// Test simulation for renderFullChapterContent layout matching
const sampleContent = `[PART] PHẦN THỨ NHẤT
[SECTION] Lời tựa
(2) Ông Cô-he-lét nói: “Phù vân, quả là phù vân. (3) Lợi lộc gì đâu...
(9) Điều đã có, rồi ra sẽ có,
chuyện đã làm, rồi lại sẽ làm ra:
dưới ánh mặt trời,
nào có chi mới lạ?`;

function simulateRender(rawContent) {
    const lines = rawContent.split('\n');
    const renderedOutput = [];

    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('[PART]')) {
            renderedOutput.push({ type: 'PART', text: trimmed.replace('[PART]', '').trim() });
            return;
        }

        if (trimmed.startsWith('[SECTION]')) {
            renderedOutput.push({ type: 'SECTION', text: trimmed.replace('[SECTION]', '').trim() });
            return;
        }

        // Kiểm tra xem dòng có chứa nhiều câu inline trong 1 đoạn văn (văn xuôi) hay không
        const parts = trimmed.split(/(\(\d+[a-z]?\)|\(\d+-\d+\))/g).filter(Boolean);
        const hasMultipleInlineVerses = parts.length > 2;

        if (hasMultipleInlineVerses) {
            renderedOutput.push({ type: 'PROSE_PARAGRAPH', raw: trimmed });
            return;
        }

        // Dòng đơn có số câu ở đầu (dòng thơ 1)
        const verseMatch = trimmed.match(/^\((\d+[a-z]?|\d+-\d+)\)\s*(.*)/);
        if (verseMatch) {
            renderedOutput.push({
                type: 'VERSE_LINE_1',
                badge: verseMatch[1],
                text: verseMatch[2]
            });
            return;
        }

        // Dòng thơ tiếp theo (dòng thơ 2, 3, 4)
        renderedOutput.push({
            type: 'VERSE_LINE_CONTINUATION',
            badgeSpacer: true,
            text: trimmed
        });
    });

    return renderedOutput;
}

console.log("=== SIMULATED RENDER STRUCTURAL OUTPUT ===");
console.log(JSON.stringify(simulateRender(sampleContent), null, 2));
