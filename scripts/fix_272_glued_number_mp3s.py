import os
import json
import re
import asyncio
import edge_tts

VOICE = "vi-VN-HoaiMyNeural"
MAX_CONCURRENT_TASKS = 25  # Tận dụng tối đa các luồng của MacBook Pro 11

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
    # Strip HTML tags & cross symbol
    cleaned = re.sub(r'<[^>]+>', '', text)
    cleaned = cleaned.replace('✠', '')

    # Strip verse numbers:
    # 1) Colon verse refs (e.g. : 22, : 34a)
    cleaned = re.sub(r':\s*\d+[a-zA-Z]?', ' : ', cleaned)
    
    # 2) Verse numbers at start of text, after space, or glued directly to letters/quotes
    # e.g., "22Còn", "34aCòn", "37Nhưng", "10“Khi", " 22 "
    cleaned = re.sub(r'(?:^|\s)\d+[a-zA-Z]?(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ"“\'‘(]|\s|$)', ' ', cleaned)
    
    # 3) Cleanup double spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def generate_single_mp3(semaphore, text, output_path, label):
    async with semaphore:
        if not text or len(text) < 10:
            return False

        # Chia nhỏ văn bản nếu quá dài (> 350 ký tự) để đảm bảo không bị cắt ngắt giữa chừng
        max_chunk_len = 350
        chunks = []
        
        if len(text) <= max_chunk_len:
            chunks = [text]
        else:
            sentences = re.split(r'(?<=[.?!;])\s+', text)
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
                tf = f"{output_path}_temp_{i}.mp3"
                comm = edge_tts.Communicate(chunk, VOICE)
                await comm.save(tf)
                temp_files.append(tf)

            # Nối các file mp3 nhỏ thành file hoàn chỉnh
            with open(output_path, "wb") as outfile:
                for tf in temp_files:
                    if os.path.exists(tf):
                        with open(tf, "rb") as infile:
                            outfile.write(infile.read())
                        os.remove(tf)
            
            size_kb = os.path.getsize(output_path) / 1024
            print(f"  🎉 [{label}] -> {os.path.basename(output_path)} ({size_kb:.1f} KB)")
            return True
        except Exception as e:
            print(f"  ❌ Lỗi khi tạo {label}: {e}")
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

    # Tìm các bài đọc có số dính liền chữ
    tasks_to_run = []
    
    glued_pattern = re.compile(r"(?:^|\s)\d+[a-zA-Z]?(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ“\"])")

    for idx, item in enumerate(data):
        # Gospel
        g_content = item.get("gospel_content") or ""
        g_ref = item.get("gospel_ref") or ""
        if g_content and g_ref and glued_pattern.search(g_content):
            fn = format_ref_filename(g_ref, "gospel")
            if fn:
                out = os.path.abspath(f"private/audio/gospels/{fn}")
                intro = item.get("gospel_intro") or ""
                full_txt = f"Phúc Âm. {intro}. {g_content}" if intro else f"Phúc Âm. {g_content}"
                clean = perfect_liturgical_cleaner(full_txt)
                tasks_to_run.append((clean, out, f"Gospel Item #{idx} ({g_ref})"))

        # Reading 1
        r1_content = item.get("r1_content") or ""
        r1_ref = item.get("r1_ref") or ""
        if r1_content and r1_ref and glued_pattern.search(r1_content):
            fn = format_ref_filename(r1_ref, "r1")
            if fn:
                out = os.path.abspath(f"private/audio/readings/{fn}")
                intro = item.get("r1_intro") or ""
                full_txt = f"Bài đọc 1. {intro}. {r1_content}" if intro else f"Bài đọc 1. {r1_content}"
                clean = perfect_liturgical_cleaner(full_txt)
                tasks_to_run.append((clean, out, f"R1 Item #{idx} ({r1_ref})"))

        # Reading 2
        r2_content = item.get("r2_content") or ""
        r2_ref = item.get("r2_ref") or ""
        if r2_content and r2_ref and glued_pattern.search(r2_content):
            fn = format_ref_filename(r2_ref, "r2")
            if fn:
                out = os.path.abspath(f"private/audio/readings/{fn}")
                intro = item.get("r2_intro") or ""
                full_txt = f"Bài đọc 2. {intro}. {r2_content}" if intro else f"Bài đọc 2. {r2_content}"
                clean = perfect_liturgical_cleaner(full_txt)
                tasks_to_run.append((clean, out, f"R2 Item #{idx} ({r2_ref})"))

    print(f"🚀 BẮT ĐẦU TÁI TẠO TẬN DỤNG {MAX_CONCURRENT_TASKS} LUỒNG CHO {len(tasks_to_run)} FILE AUDIO BỊ ĐỌC SỐ CÂU...")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
    tasks = [generate_single_mp3(semaphore, txt, path, label) for txt, path, label in tasks_to_run]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r)
    print(f"\n🎉 HOÀN THÀNH TÁI TẠO 100%! Đã tạo thành công {success_count}/{len(tasks_to_run)} file audio chuẩn Phụng Vụ.")

if __name__ == "__main__":
    asyncio.run(main())
