import os
import json
import re
import sys
import asyncio
import edge_tts

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from liturgical_cleaner import apply_smart_liturgical_pauses

VOICE = "vi-VN-HoaiMyNeural"
RATE = "-10%"
PITCH = "-2Hz"
MAX_CONCURRENT_TASKS = 25  # Tận dụng tối đa luồng MacBook Pro

EXCLUDED_REFS = [
    "Mt 26,14 – 27,66",
    "Mc 14,1 – 15,47",
    "Lc 22,14 – 23,56",
    "Ga 18,1 - 19,42",
    "Ga 18,1 – 19,42"
]

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
    # 1. Clean liturgical pauses (connectors)
    cleaned = apply_smart_liturgical_pauses(text, min_word_distance=4)
    # 2. Add natural punctuation pauses
    cleaned = cleaned.replace(", ", ", ... ").replace(". ", ". ... ")
    # 3. Strip quotes & brackets
    cleaned = re.sub(r'["“\'’‘«»()\[\]\u201c\u201d\u2018\u2019]', '', cleaned)
    cleaned = re.sub(r'\.{2,}', '.', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def generate_single_clean_mp3(semaphore, raw_full_text, output_path, label):
    async with semaphore:
        if not raw_full_text or len(raw_full_text) < 10:
            return False

        # Làm sạch văn bản tuyệt đối, KHÔNG truyền thẻ XML/SSML rác tránh bị AI đọc chữ "speak version 1.0"
        processed_text = perfect_liturgical_cleaner(raw_full_text)

        max_chunk_len = 350
        chunks = []
        
        if len(processed_text) <= max_chunk_len:
            chunks = [processed_text]
        else:
            sentences = re.split(r'(?<=[.?!;])\s+', processed_text)
            curr = ""
            for s in sentences:
                if len(curr) + len(s) + 1 <= max_chunk_len:
                    curr += (" " + s) if curr else s
                else:
                    if curr:
                        chunks.append(curr)
                    curr = s
            if curr:
                chunks.append(curr)

        temp_files = []
        try:
            for i, chunk in enumerate(chunks):
                tf = f"{output_path}_temp_clean_{i}.mp3"
                comm = edge_tts.Communicate(chunk, VOICE, rate=RATE, pitch=PITCH)
                await comm.save(tf)
                temp_files.append(tf)

            with open(output_path, "wb") as outfile:
                for tf in temp_files:
                    if os.path.exists(tf):
                        with open(tf, "rb") as infile:
                            outfile.write(infile.read())
                        os.remove(tf)
            
            return True
        except Exception as e:
            for tf in temp_files:
                if os.path.exists(tf):
                    try:
                        os.remove(tf)
                    except:
                        pass
            return False

async def main():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    tasks_to_run = []
    
    for idx, item in enumerate(data):
        g_content = item.get("gospel_content") or ""
        g_ref = (item.get("gospel_ref") or "").strip()
        
        # Bỏ qua 4 bài Thương Khó phân vai
        if any(exc in g_ref for exc in EXCLUDED_REFS):
            continue
            
        if g_content and g_ref:
            fn = format_ref_filename(g_ref, "gospel")
            if fn:
                out = os.path.abspath(f"private/audio/gospels/{fn}")
                intro = (item.get("gospel_intro") or "").strip().rstrip(".")
                full_txt = f"Phúc Âm. {intro}. {g_content}" if intro else f"Phúc Âm. {g_content}"
                tasks_to_run.append((full_txt, out, f"Gospel Item #{idx} ({g_ref})"))

    print(f"🚀 TÁI TẠO TẤT CẢ {len(tasks_to_run)} BÀI TIN MỪNG SẠCH 100% (TRIỆT TIÊU LỖI ĐỌC THẺ XML Ở ĐẦU BÀI)...")
    print(f"⚡ TẬN DỤNG TỐI ĐA {MAX_CONCURRENT_TASKS} LUỒNG MACBOOK PRO...")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
    tasks = [generate_single_clean_mp3(semaphore, txt, path, label) for txt, path, label in tasks_to_run]
    
    completed = 0
    total = len(tasks)
    
    for future in asyncio.as_completed(tasks):
        res = await future
        if res:
            completed += 1
        if completed % 50 == 0 or completed == total:
            print(f"  📊 Đã hoàn thành {completed}/{total} file MP3 Tin Mừng sạch 100% ({(completed/total)*100:.1f}%)...")

    print(f"\n🎉 HOÀN THÀNH TÁI TẠO TẤT CẢ {completed}/{total} FILE AUDIO TIN MỪNG SẠCH 100%!")

if __name__ == "__main__":
    asyncio.run(main())
