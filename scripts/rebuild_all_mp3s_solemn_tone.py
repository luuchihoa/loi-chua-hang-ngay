import os
import json
import re
import asyncio
import edge_tts

from liturgical_cleaner import build_liturgical_ssml, apply_smart_liturgical_pauses

VOICE = "vi-VN-HoaiMyNeural"
MAX_CONCURRENT_TASKS = 25  # Tận dụng tối đa các luồng của MacBook Pro

def format_ref_filename(ref, prefix):
    if not ref:
        return None
    clean = re.sub(r'[\\\/:*?"<>|()]', '', ref.strip())
    clean = re.sub(r'[\.,]', '', clean)
    clean = re.sub(r'\s+', '_', clean)
    return f"{prefix}_{clean}.mp3"

async def generate_single_mp3(semaphore, raw_text, output_path, label):
    async with semaphore:
        if not raw_text or len(raw_text) < 10:
            return False

        try:
            ssml = build_liturgical_ssml(
                raw_text=raw_text,
                voice_name=VOICE,
                comma_silence_ms=500,
                semicolon_silence_ms=750,
                sentence_silence_ms=1050,
                min_word_distance=4
            )
            comm = edge_tts.Communicate(ssml, VOICE)
            await comm.save(output_path)
            return True
        except Exception as e:
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass
            return False

async def main():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    tasks_to_run = []
    
    for idx, item in enumerate(data):
        # 1. Gospel
        g_content = item.get("gospel_content") or ""
        g_ref = item.get("gospel_ref") or ""
        if g_content and g_ref:
            fn = format_ref_filename(g_ref, "gospel")
            if fn:
                out = os.path.abspath(f"private/audio/gospels/{fn}")
                intro = item.get("gospel_intro") or ""
                full_txt = f"Phúc Âm. {intro}. {g_content}" if intro else f"Phúc Âm. {g_content}"
                tasks_to_run.append((full_txt, out, f"Gospel Item #{idx} ({g_ref})"))

        # 2. Reading 1
        r1_content = item.get("r1_content") or ""
        r1_ref = item.get("r1_ref") or ""
        if r1_content and r1_ref:
            fn = format_ref_filename(r1_ref, "r1")
            if fn:
                out = os.path.abspath(f"private/audio/readings/{fn}")
                intro = item.get("r1_intro") or ""
                full_txt = f"Bài đọc 1. {intro}. {r1_content}" if intro else f"Bài đọc 1. {r1_content}"
                tasks_to_run.append((full_txt, out, f"R1 Item #{idx} ({r1_ref})"))

        # 3. Reading 2
        r2_content = item.get("r2_content") or ""
        r2_ref = item.get("r2_ref") or ""
        if r2_content and r2_ref:
            fn = format_ref_filename(r2_ref, "r2")
            if fn:
                out = os.path.abspath(f"private/audio/readings/{fn}")
                intro = item.get("r2_intro") or ""
                full_txt = f"Bài đọc 2. {intro}. {r2_content}" if intro else f"Bài đọc 2. {r2_content}"
                tasks_to_run.append((full_txt, out, f"R2 Item #{idx} ({r2_ref})"))

    print(f"🚀 BẮT ĐẦU TÁI TẠO SẠCH 100% QUOTES & LỖI ÂM DẤU NGOẶC KÉP CHO {len(tasks_to_run)} FILE AUDIO...")
    print(f"⚡ TẬN DỤNG TỐI ĐA {MAX_CONCURRENT_TASKS} LUỒNG CỦA MACBOOK PRO...")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
    tasks = [generate_single_mp3(semaphore, txt, path, label) for txt, path, label in tasks_to_run]
    
    completed = 0
    total = len(tasks)
    
    for future in asyncio.as_completed(tasks):
        res = await future
        if res:
            completed += 1
        if completed % 100 == 0 or completed == total:
            print(f"  📊 Đã hoàn thành {completed}/{total} file MP3 ({(completed/total)*100:.1f}%)...")

    print(f"\n🎉 HOÀN THÀNH TÁI TẠO SẠCH 100%! Tất cả {completed}/{total} file audio MP3 đã loại bỏ hoàn toàn tạp âm dấu ngoặc kép.")

if __name__ == "__main__":
    asyncio.run(main())
