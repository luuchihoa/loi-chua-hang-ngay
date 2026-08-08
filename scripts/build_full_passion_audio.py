import os
import json
import re
import asyncio
import edge_tts

VOICE = "vi-VN-HoaiMyNeural"
RATE = "-10%"
PITCH = "-2Hz"

ROLE_VOICES = {
    "nk": {"voice": "vi-VN-HoaiMyNeural",  "rate": "-10%", "pitch": "-1Hz"},
    "✠":  {"voice": "vi-VN-NamMinhNeural", "rate": "-10%", "pitch": "-2Hz"},
    "m":  {"voice": "vi-VN-NamMinhNeural", "rate": "-8%",  "pitch": "+0Hz"},
    "dc": {"voice": "vi-VN-HoaiMyNeural",  "rate": "-5%",  "pitch": "+1Hz"}
}

def format_ref_filename(ref, prefix):
    if not ref:
        return None
    clean = re.sub(r'[\\\/:*?"<>|()]', '', ref.strip())
    clean = re.sub(r'[\.,]', '', clean)
    clean = re.sub(r'\s+', '_', clean)
    return f"{prefix}_{clean}.mp3"

def perfect_liturgical_cleaner(text):
    if not text:
        return ""
    cleaned = re.sub(r'<[^>]+>', '', text)
    cleaned = cleaned.replace('✠', '')
    cleaned = re.sub(r'\[\d{1,3}\]', '', cleaned)
    cleaned = re.sub(r'([.?!;”"’])(\d{1,3}[a-zA-Z]?)', r'\1 \2', cleaned)
    cleaned = re.sub(r'(?:^|\s)\d{1,3}\s*-\s*\d{1,3}[a-zA-Z]?(?=\s|[A-ZÀ-Ỹ"“\'‘(\[]|$)', ' ', cleaned)
    cleaned = re.sub(r':\s*\d+[a-zA-Z]?', ' : ', cleaned)
    cleaned = re.sub(r'(?:^|\s|[^\w\s])\d{1,3}[a-zA-Z]?(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ"“\'‘(\[]|\s|$)', ' ', cleaned)
    cleaned = cleaned.replace(", ", ", ... ").replace(". ", ". ... ")
    cleaned = re.sub(r'["“\'’‘«»()\[\]\u201c\u201d\u2018\u2019]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def parse_passion_roles(text):
    if not text:
        return []
    text_cleaned = re.sub(r"\d{1,3}(nk|m|dc)\b", r" \1 ", text)
    tokens = re.split(r"(\b(?:nk|m|dc)\b|✠)", text_cleaned)
    raw_segments = []
    curr_role = "nk"
    for t in tokens:
        if t in ["nk", "m", "dc", "✠"]:
            curr_role = t
        else:
            clean_txt = perfect_liturgical_cleaner(t)
            if clean_txt and re.search(r"[a-zA-ZÀ-ỹ]", clean_txt):
                raw_segments.append((curr_role, clean_txt))
    merged = []
    for role, txt in raw_segments:
        if merged and merged[-1][0] == role:
            merged[-1] = (role, merged[-1][1] + " ... " + txt)
        else:
            merged.append((role, txt))
    return merged

async def generate_single_part(txt, cfg, tf):
    for attempt in range(3):
        try:
            comm = edge_tts.Communicate(txt, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"])
            await comm.save(tf)
            if os.path.exists(tf) and os.path.getsize(tf) > 100:
                return True
        except Exception as e:
            await asyncio.sleep(1)
    return False

async def generate_passion_item(item, label):
    g_ref = item.get("gospel_ref")
    fn = format_ref_filename(g_ref, "gospel")
    out_path = os.path.abspath(f"private/audio/gospels/{fn}")
    content = item.get("gospel_content") or ""
    intro = item.get("gospel_intro") or ""
    full_text = f"{intro}. {content}" if intro else content
    
    segments = parse_passion_roles(full_text)
    print(f"🎙️ Bắt đầu tạo audio phân vai cho {label} ({len(segments)} khối thoại)...")
    
    temp_files = []
    for i, (role, txt) in enumerate(segments):
        cfg = ROLE_VOICES.get(role, ROLE_VOICES["nk"])
        tf = f"{out_path}_build_{i}.mp3"
        success = await generate_single_part(txt, cfg, tf)
        if success:
            temp_files.append(tf)

    with open(out_path, "wb") as outfile:
        for tf in temp_files:
            if os.path.exists(tf):
                with open(tf, "rb") as infile:
                    outfile.write(infile.read())
                os.remove(tf)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"🎉 THÀNH CÔNG: {os.path.basename(out_path)} ({size_mb:.2f} MB)")

async def main():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    items = [
        (data[127], "Thương Khó Lễ Lá Năm A (Mt 26,14 – 27,66)"),
        (data[126], "Thương Khó Lễ Lá Năm B (Mc 14,1 – 15,47)"),
        (data[125], "Thương Khó Lễ Lá Năm C (Lc 22,14 – 23,56)"),
        (data[930], "Thương Khó Thứ Sáu Tuần Thánh (Ga 18,1 - 19,42)")
    ]

    for item, label in items:
        await generate_passion_item(item, label)

if __name__ == "__main__":
    asyncio.run(main())
