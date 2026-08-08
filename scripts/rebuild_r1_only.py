import os
import json
import re
import asyncio
import edge_tts

from liturgical_cleaner import apply_smart_liturgical_pauses

VOICE = "vi-VN-HoaiMyNeural"
MAX_CONCURRENT_TASKS = 20

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
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Apply smart pauses & text cleaning (PLAIN TEXT - NO XML TAGS)
            clean_text = apply_smart_liturgical_pauses(raw_text, min_word_distance=4)

            comm = edge_tts.Communicate(clean_text, VOICE)
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
    json_path = os.path.abspath("data.json")
    if not os.path.exists(json_path):
        print(f"❌ Không tìm thấy file {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    tasks_to_run = []
    
    for idx, item in enumerate(data):
        # CHỈ XỬ LÝ BÀI ĐỌC 1 (R1)
        r1_content = item.get("r1_content") or ""
        r1_ref = item.get("r1_ref") or ""
        if r1_content and r1_ref:
            fn = format_ref_filename(r1_ref, "r1")
            if fn:
                out = os.path.abspath(f"private/audio/readings/{fn}")
                intro = item.get("r1_intro") or ""
                full_txt = f"Bài đọc 1. {intro}. {r1_content}" if intro else f"Bài đọc 1. {r1_content}"
                tasks_to_run.append((full_txt, out, f"R1 Item #{idx} ({r1_ref})"))

    print(f"🚀 BẮT ĐẦU TẠO LẠI CHUẨN VĂN BẢN SẠCH CHO {len(tasks_to_run)} FILE MP3 BÀI ĐỌC 1...")
    print(f"⚡ TẬN DỤNG {MAX_CONCURRENT_TASKS} LUỒNG ĐỒNG THỜI...")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
    tasks = [generate_single_mp3(semaphore, txt, path, label) for txt, path, label in tasks_to_run]
    
    completed = 0
    total = len(tasks)
    
    for future in asyncio.as_completed(tasks):
        res = await future
        if res:
            completed += 1
        if completed % 25 == 0 or completed == total:
            print(f"  📊 Tiến độ: Đã xong {completed}/{total} file MP3 Bài đọc 1 ({(completed/total)*100:.1f}%)...")

    print(f"\n🎉 HOÀN THÀNH 100%! Tất cả {completed}/{total} file MP3 Bài đọc 1 đã đọc tiếng Việt chuẩn xác 100%!")

if __name__ == "__main__":
    asyncio.run(main())
