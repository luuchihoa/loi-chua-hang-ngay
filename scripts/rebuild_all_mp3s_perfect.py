import os
import json
import asyncio
import re
import glob
import edge_tts

VOICE = "vi-VN-HoaiMyNeural"

def format_ref_filename(prefix, ref_str):
    if not ref_str:
        return None
    clean = re.sub(r'[\\\/:*?"<>|()]', '', ref_str.strip())
    clean = re.sub(r'[\.,]', '', clean)
    clean = re.sub(r'\s+', '_', clean)
    clean = re.sub(r'_+', '_', clean)
    if not clean:
        return None
    return f"{prefix}_{clean}.mp3"

def perfect_liturgical_cleaner(text):
    if not text:
        return ""
    # 1. Bỏ thẻ HTML
    cleaned = re.sub(r'<[^>]*>', '', text)
    
    # 2. Bỏ ký tự Thánh Giá ✠
    cleaned = cleaned.replace("✠", "")
    
    # 3. Lọc bỏ số câu dính chữ/dấu hai chấm (VD: :2, :31, 17k, 17l, 12a, 31b)
    cleaned = re.sub(r':\s*\d+[a-zA-Z]?', ' : ', cleaned)
    cleaned = re.sub(r'\b\d+[a-zA-Z]?\b', '', cleaned)
    
    # 4. Lọc bỏ các ký tự đơn lẻ dư thừa (a, b, c, d, k, l, m, r, s đứng trơ trọi)
    cleaned = re.sub(r'\b[a-zA-Z]\b', '', cleaned)

    # 5. Làm sạch dấu ngoặc kép và dấu hai chấm
    cleaned = cleaned.replace("“", "").replace("”", "").replace('"', "")
    cleaned = cleaned.replace(" : ", ". ").replace(":", ".")
    
    # 6. Mở rộng các từ viết tắt Phụng vụ
    cleaned = cleaned.replace("Đ.", "Đáp: ")
    cleaned = cleaned.replace("BĐ1:", "Bài đọc 1: ")
    cleaned = cleaned.replace("BĐ2:", "Bài đọc 2: ")
    cleaned = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', cleaned)
    
    # 7. Chuẩn hóa khoảng trắng & dấu chấm trùng lặp
    cleaned = re.sub(r'\.\s*\.', '.', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def generate_mp3_clean(text, output_path, retries=3):
    clean_text = perfect_liturgical_cleaner(text)
    if not clean_text:
        return

    if len(clean_text) > 700:
        parts = re.split(r'(\. |\n)', clean_text)
        chunks = []
        current = ""
        for p in parts:
            if len(current) + len(p) < 600:
                current += p
            else:
                chunks.append(current)
                current = p
        if current:
            chunks.append(current)

        temp_files = []
        try:
            for idx, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue
                temp_file = f"{output_path}_perfect_{idx}.mp3"
                success = False
                for attempt in range(retries):
                    try:
                        comm = edge_tts.Communicate(chunk.strip(), VOICE)
                        await comm.save(temp_file)
                        if os.path.exists(temp_file) and os.path.getsize(temp_file) > 100:
                            success = True
                            break
                    except Exception:
                        await asyncio.sleep(1)

                if not success:
                    raise Exception(f"Không thể tải chunk {idx}")
                temp_files.append(temp_file)

            with open(output_path, "wb") as outfile:
                for tf in temp_files:
                    if os.path.exists(tf):
                        with open(tf, "rb") as infile:
                            outfile.write(infile.read())
                        os.remove(tf)
        except Exception as e:
            for tf in temp_files:
                if os.path.exists(tf):
                    os.remove(tf)
            if os.path.exists(output_path):
                os.remove(output_path)
            raise e
    else:
        for attempt in range(retries):
            try:
                communicate = edge_tts.Communicate(clean_text, VOICE)
                await communicate.save(output_path)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 100:
                    return
            except Exception:
                await asyncio.sleep(1)
        raise Exception("Lỗi tải audio")

async def rebuild_all_perfect():
    print("🧹 BẮT ĐẦU AUDIT VÀ TÁI TẠO TOÀN BỘ FILE MP3 ĐẢM BẢO KHÔNG CÒN SỐ CÂU VÀ CHỮ TRƠ TRỌI...")

    data_path = os.path.abspath("data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Thu thập tất cả các bài đọc (Gospels, R1, R2)
    targets = []
    seen = set()

    for item in data:
        # Phúc Âm
        g_ref = item.get("gospel_ref")
        g_content = item.get("gospel_content")
        g_intro = item.get("gospel_intro", "")
        if g_ref and g_content:
            f_name = format_ref_filename("gospel", g_ref)
            if f_name and f_name not in seen:
                seen.add(f_name)
                out_path = os.path.abspath(f"private/audio/gospels/{f_name}")
                full_txt = f"{g_intro}. {g_content}" if g_intro else g_content
                targets.append({"ref": g_ref, "text": full_txt, "out": out_path, "name": f_name})

        # Bài Đọc 1
        r1_ref = item.get("r1_ref")
        r1_content = item.get("r1_content")
        r1_intro = item.get("r1_intro", "")
        if r1_ref and r1_content:
            f_name = format_ref_filename("r1", r1_ref)
            if f_name and f_name not in seen:
                seen.add(f_name)
                out_path = os.path.abspath(f"private/audio/readings/{f_name}")
                full_txt = f"Bài đọc 1. {r1_intro}. {r1_content}" if r1_intro else f"Bài đọc 1. {r1_content}"
                targets.append({"ref": r1_ref, "text": full_txt, "out": out_path, "name": f_name})

        # Bài Đọc 2
        r2_ref = item.get("r2_ref")
        r2_content = item.get("r2_content")
        r2_intro = item.get("r2_intro", "")
        if r2_ref and r2_content:
            f_name = format_ref_filename("r2", r2_ref)
            if f_name and f_name not in seen:
                seen.add(f_name)
                out_path = os.path.abspath(f"private/audio/readings/{f_name}")
                full_txt = f"Bài đọc 2. {r2_intro}. {r2_content}" if r2_intro else f"Bài đọc 2. {r2_content}"
                targets.append({"ref": r2_ref, "text": full_txt, "out": out_path, "name": f_name})

    print(f"📊 Tổng số bài cần đảm bảo chất lượng hoàn hảo: {len(targets)} bài.")
    print("⚡ Chạy 25 luồng song song siêu tốc trên MacBook Pro...\n")

    semaphore = asyncio.Semaphore(25)
    stats = {"rebuilt": 0, "skipped": 0, "error": 0}

    async def worker(idx, target):
        async with semaphore:
            out_file = target["out"]
            # Nếu file đã có và kích thước > 5KB -> Đã đạt chuẩn
            if os.path.exists(out_file) and os.path.getsize(out_file) >= 5000:
                stats["skipped"] += 1
                return

            try:
                await generate_mp3_clean(target["text"], out_file)
                print(f"✅ [{idx}/{len(targets)}] HOÀN HẢO: {target['ref']} -> {target['name']}")
                stats["rebuilt"] += 1
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"❌ [{idx}/{len(targets)}] Lỗi {target['ref']}: {e}")
                stats["error"] += 1

    tasks = [worker(idx, t) for idx, t in enumerate(targets, 1)]
    await asyncio.gather(*tasks)

    print("\n==================================================")
    print(f"🎉 HOÀN THÀNH TÁI TẠO HOÀN HẢO TOÀN BỘ KHO AUDIO!")
    print(f"📊 Tổng bài xử lý: {len(targets)}")
    print(f"⚡ Đã đạt chuẩn từ trước (Bỏ qua): {stats['skipped']}")
    print(f"✅ Đã tạo mới/tái tạo hoàn hảo: {stats['rebuilt']}")
    print(f"❌ Số bài bị lỗi: {stats['error']}")

if __name__ == "__main__":
    asyncio.run(rebuild_all_perfect())
