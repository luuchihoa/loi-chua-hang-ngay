import re

def clean_liturgical_text(raw_text: str) -> str:
    if not raw_text:
        return ""

    text = raw_text

    # 1. Strip HTML tags
    text = re.sub(r'<[^>]*>', '', text)

    # 2. Replace liturgical symbols & prefixes
    text = text.replace('✠', '')
    text = re.sub(r'\(Đ\.\)', ' Đáp. ', text, flags=re.IGNORECASE)
    text = re.sub(r'Đ\.', 'Đáp: ', text, flags=re.IGNORECASE)
    text = re.sub(r'BĐ1:', 'Bài đọc 1: ', text, flags=re.IGNORECASE)
    text = re.sub(r'BĐ2:', 'Bài đọc 2: ', text, flags=re.IGNORECASE)

    # 3. Remove bracketed verse numbers like [44], [46]
    text = re.sub(r'\[\d{1,3}\]', '', text)

    # 4. Insert space after punctuation before digits (.21 -> . 21)
    text = re.sub(r'([.?!;”"’])(\d{1,3}[a-zA-Z]?)', r'\1 \2', text)

    # 5. Remove verse numbers & verse ranges
    text = re.sub(r'(?:^|\s)\d{1,3}\s*-\s*\d{1,3}[a-zA-Z]?(?=\s|[A-ZÀ-Ỹ"“\'‘(\[]|$)', ' ', text)
    text = re.sub(r':\s*\d+[a-zA-Z]?', ' : ', text)
    text = re.sub(r'(?:^|\s|[^\w\s])\d{1,3}[a-zA-Z]?(?=[A-ZÀ-Ỹ"“\'‘(\[]|\s|$)', ' ', text)

    # 6. Remove quotes & stray brackets that produce click sounds in TTS
    text = re.sub(r'["“\'’‘«»()\[\]\u201c\u201d\u2018\u2019]', '', text)

    # 7. Normalize spaces & dots
    text = re.sub(r'\.{3,}', '.', text)
    text = re.sub(r'\s+', ' ', text).strip()

    return text

def apply_smart_liturgical_pauses(text: str, min_word_distance: int = 4) -> str:
    if not text:
        return ""

    clean = clean_liturgical_text(text)

    connectors = [
        "tức là", "bởi vì", "cho nên", "nhờ đó", "thì", "để", "rằng", "nhưng", "chứ", "vì", "còn"
    ]

    result = clean

    for conn in connectors:
        escaped = re.escape(conn)
        pattern = r'(?<![,\.\;\:\?!])\s+(' + escaped + r')\s+'

        def replacer(match):
            full_str = match.string
            offset = match.start()
            preceding_text = full_str[:offset]

            last_punct = max(
                preceding_text.rfind(','),
                preceding_text.rfind('.'),
                preceding_text.rfind(';'),
                preceding_text.rfind(':'),
                preceding_text.rfind('!')
            )

            segment = preceding_text[last_punct + 1:] if last_punct >= 0 else preceding_text
            words = [w for w in segment.strip().split() if w]

            if len(words) >= min_word_distance:
                return f", {match.group(1)} "
            return match.group(0)

        result = re.sub(pattern, replacer, result, flags=re.IGNORECASE)

    # Clean up duplicate commas or spaces
    result = re.sub(r'\s*,\s*', ', ', result)
    result = re.sub(r',\s*,', ',', result)
    result = re.sub(r'\s+', ' ', result).strip()

    return result

def build_liturgical_ssml(
    raw_text: str,
    voice_name: str = "vi-VN-HoaiMyNeural",
    comma_silence_ms: int = 500,
    semicolon_silence_ms: int = 750,
    sentence_silence_ms: int = 1050,
    min_word_distance: int = 4
) -> str:
    processed_text = apply_smart_liturgical_pauses(raw_text, min_word_distance)
    return f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="vi-VN">
    <voice name="{voice_name}">
        <mstts:silence type="Comma-exact" value="{comma_silence_ms}ms"/>
        <mstts:silence type="Semicolon-exact" value="{semicolon_silence_ms}ms"/>
        <mstts:silence type="Sentenceboundary-exact" value="{sentence_silence_ms}ms"/>
        <mstts:silence type="Leading-exact" value="200ms"/>
        <mstts:silence type="Tailing-exact" value="300ms"/>
        {processed_text}
    </voice>
</speak>"""

