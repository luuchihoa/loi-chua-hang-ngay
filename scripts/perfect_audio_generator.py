import os
import json
import asyncio
import re
import glob
import edge_tts

VOICE = "vi-VN-HoaiMyNeural"

def format_ref_filename(gospel_ref):
    if not gospel_ref:
        return "gospel_unknown.mp3"
    # Xóa sạch toàn bộ dấu chấm, phẩy, ngoặc đơn để tên file CHỈ CÓ DUY NHẤT 1 DẤU CHẤM DÀNH CHO .mp3
    clean = re.sub(r'[\\\/:*?"<>|()]', '', gospel_ref.strip())
    clean = re.sub(r'[\.,]', '', clean) # Xóa sạch dấu chấm và dấu phẩy
    clean = re.sub(r'\s+', '_', clean)
    clean = re.sub(r'_+', '_', clean)
    return f"gospel_{clean}.mp3"

def strip_html(html):
    if not html:
        return ""
    text = re.sub(r'<[^>]*>', '', html)
    text = text.replace("✠", "")
    text = re.sub(r'\b\d+\b', '', text) # Xóa số câu kinh thánh để giọng đọc liền mạch
    text = text.replace("“", "").replace("”", "").replace('"', "")
    text = text.replace(":", ".")
    text = text.replace("Đ.", "Đáp: ")
    text = text.replace("BĐ1:", "Bài đọc 1: ")
    text = text.replace("BĐ2:", "Bài đọc 2: ")
    text = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def generate_mp3_robust(text, output_path, retries=3):
    clean_text = strip_html(text)
    
    # Nếu bài dài > 700 ký tự -> Tách thành đoạn nhỏ theo dấu chấm
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
                temp_file = f"{output_path}_temp_{idx}.mp3"
                
                # Retry logic cho từng chunk
                success_chunk = False
                for attempt in range(retries):
                    try:
                        comm = edge_tts.Communicate(chunk.strip(), VOICE)
                        await comm.save(temp_file)
                        if os.path.exists(temp_file) and os.path.getsize(temp_file) > 100:
                            success_chunk = True
                            break
                    except Exception:
                        await asyncio.sleep(1)

                if not success_chunk:
                    raise Exception(f"Không thể tải đoạn chunk {idx}")
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
        raise Exception("Không nhận được dữ liệu audio sau 3 lần thử")

async def run_perfect_generator():
    folder = os.path.abspath("private/audio/gospels")
    os.makedirs(folder, exist_ok=True)
    print("🧹 BẮT ĐẦU CHUẨN HÓA ĐẶT TÊN VÀ TẠO TOÀN BỘ FILE MP3 THIẾU...")

    # 1. Đổi tên / xóa các file cũ có dấu chấm bất hợp lý (ví dụ gospel_Ga_71-2.10.25-30.mp3)
    all_existing = glob.glob(os.path.join(folder, "*.mp3"))
    renamed_count = 0
    deleted_junk = 0

    for f in all_existing:
        basename = os.path.basename(f)
        if "_part_" in basename or "_temp_" in basename or os.path.getsize(f) < 5000:
            try:
                os.remove(f)
                deleted_junk += 1
            except Exception:
                pass
        else:
            # Kiểm tra xem file có bị nhiều dấu chấm không (ví dụ gospel_Ga_71-2.10.25-30.mp3)
            # Tên chuẩn chỉ có 1 dấu chấm trước .mp3
            name_without_ext = basename[:-4]
            if "." in name_without_ext:
                new_clean_name = name_without_ext.replace(".", "") + ".mp3"
                new_path = os.path.join(folder, new_clean_name)
                try:
                    os.rename(f, new_path)
                    renamed_count += 1
                    print(f"🔄 ĐÃ ĐỔI TÊN CHUẨN HÓA: {basename} -> {new_clean_name}")
                except Exception:
                    pass

    print(f"✅ Đã dọn dẹp {deleted_junk} file rác và đổi tên chuẩn hóa {renamed_count} file có nhiều dấu chấm.\n")

    # 2. Đọc data.json
    data_path = os.path.abspath("data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    seen_refs = set()
    targets = []

    for item in data:
        ref = item.get("gospel_ref")
        content = item.get("gospel_content")
        intro = item.get("gospel_intro", "")
        if not ref or not content:
            continue
        
        clean_ref = ref.strip()
        filename = format_ref_filename(clean_ref)
        output_file = os.path.join(folder, filename)

        if clean_ref not in seen_refs:
            seen_refs.add(clean_ref)
            if not os.path.exists(output_file) or os.path.getsize(output_file) < 5000:
                targets.append({
                    "gospel_ref": clean_ref,
                    "gospel_intro": intro,
                    "gospel_content": content,
                    "filename": filename,
                    "output_file": output_file
                })

    print(f"📊 Tổng số bài Phúc Âm độc bản cần bổ sung: {len(targets)} bài.")
    print("⚡ Chạy 4 luồng an toàn có Retry để đảm bảo 100% bài đều tạo được MP3 thành công...\n")

    semaphore = asyncio.Semaphore(4) # 4 luồng ổn định không bị rate-limit
    stats = {"success": 0, "error": 0}

    async def worker(idx, item):
        async with semaphore:
            ref = item["gospel_ref"]
            full_text = f"{item['gospel_intro']}. {item['gospel_content']}" if item['gospel_intro'] else item['gospel_content']

            try:
                await generate_mp3_robust(full_text, item["output_file"])
                print(f"✅ [{idx}/{len(targets)}] HOÀN THÀNH: {ref} -> {item['filename']}")
                stats["success"] += 1
                await asyncio.sleep(0.2)
            except Exception as e:
                print(f"❌ [{idx}/{len(targets)}] Lỗi {ref}: {e}")
                stats["error"] += 1

    tasks = [worker(idx, item) for idx, item in enumerate(targets, 1)]
    await asyncio.gather(*tasks)

    # Đếm lại kết quả cuối cùng
    final_files = glob.glob(os.path.join(folder, "gospel_*.mp3"))
    final_valid = [f for f in final_files if os.path.getsize(f) >= 5000]

    print("\n==================================================")
    print(f"🎉 TỔNG KẾT TẠO MP3 TOÀN BỘ PHÚC ÂM:")
    print(f"🏆 Tổng số bài MP3 hoàn chỉnh hiện có: {len(final_valid)} / {len(seen_refs)} bài")
    print(f"✅ Số bài mới vừa tạo thành công: {stats['success']}")
    print(f"❌ Số bài bị lỗi: {stats['error']}")

if __name__ == "__main__":
    asyncio.run(run_perfect_generator())
