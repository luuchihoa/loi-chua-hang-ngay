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
    clean = re.sub(r'[\\\/:*?"<>|()]', '', gospel_ref.strip())
    clean = re.sub(r'[\.,]', '', clean)
    clean = re.sub(r'\s+', '_', clean)
    clean = re.sub(r'_+', '_', clean)
    return f"gospel_{clean}.mp3"

def strip_html(html):
    if not html:
        return ""
    text = re.sub(r'<[^>]*>', '', html)
    text = text.replace("✠", "")
    text = re.sub(r'\b\d+\b', '', text)
    text = text.replace("“", "").replace("”", "").replace('"', "")
    text = text.replace(":", ".")
    text = text.replace("Đ.", "Đáp: ")
    text = text.replace("BĐ1:", "Bài đọc 1: ")
    text = text.replace("BĐ2:", "Bài đọc 2: ")
    text = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def generate_mp3_clean(text, output_path):
    if len(text) > 800:
        parts = re.split(r'(\. |\n)', text)
        chunks = []
        current = ""
        for p in parts:
            if len(current) + len(p) < 750:
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
                comm = edge_tts.Communicate(chunk.strip(), VOICE)
                await comm.save(temp_file)
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
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(output_path)

async def clean_and_repair():
    folder = os.path.abspath("private/audio/gospels")
    print("🧹 BẮT ĐẦU DỌN DẸP FILE LỖI VÀ TÁI TẠO TỰ ĐỘNG...")

    # 1. Dọn dẹp file _part_ và file 0-byte
    all_files = glob.glob(os.path.join(folder, "*.mp3"))
    removed_count = 0
    for f in all_files:
        if "_part_" in f or "_temp_" in f or os.path.getsize(f) < 5000:
            try:
                os.remove(f)
                removed_count += 1
            except Exception:
                pass

    print(f"🗑️ Đã dọn dẹp {removed_count} file rác / file 0-byte bị hỏng.\n")

    # 2. Đọc data.json và tìm tất cả bài bị thiếu / bị hỏng
    data_path = os.path.abspath("data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    seen_refs = set()
    missing_items = []

    for item in data:
        ref = item.get("gospel_ref")
        content = item.get("gospel_content")
        intro = item.get("gospel_intro", "")
        if not ref or not content:
            continue
        
        clean_ref = ref.strip()
        if clean_ref not in seen_refs:
            seen_refs.add(clean_ref)
            filename = format_ref_filename(clean_ref)
            output_file = os.path.join(folder, filename)

            if not os.path.exists(output_file) or os.path.getsize(output_file) < 5000:
                missing_items.append({
                    "gospel_ref": clean_ref,
                    "gospel_intro": intro,
                    "gospel_content": content,
                    "filename": filename,
                    "output_file": output_file
                })

    print(f"📊 Còn thiếu {len(missing_items)} bài Phúc Âm cần tạo lại MP3 chuẩn.\n")

    # 3. Tạo siêu tốc cho 10 nhân CPU MacBook Pro Apple Silicon (25 luồng song song)
    semaphore = asyncio.Semaphore(25)
    stats = {"success": 0, "error": 0}

    async def fix_single(idx, item):
        async with semaphore:
            ref = item["gospel_ref"]
            full_text = f"{item['gospel_intro']}. {item['gospel_content']}" if item['gospel_intro'] else item['gospel_content']
            clean_text = strip_html(full_text)

            try:
                await generate_mp3_clean(clean_text, item["output_file"])
                print(f"✅ [{idx}/{len(missing_items)}] ĐÃ SỬA THÀNH CÔNG: {ref} -> {item['filename']}")
                stats["success"] += 1
            except Exception as e:
                print(f"❌ [{idx}/{len(missing_items)}] Thất bại {ref}: {e}")
                if os.path.exists(item["output_file"]):
                    os.remove(item["output_file"])
                stats["error"] += 1

    tasks = [fix_single(idx, item) for idx, item in enumerate(missing_items, 1)]
    await asyncio.gather(*tasks)

    print("\n==================================================")
    print(f"🎉 HOÀN THÀNH DỌN DẸP VÀ SỬA TOÀN BỘ FILE MP3!")
    print(f"✅ Tạo thành công mới: {stats['success']}")
    print(f"❌ Số bài lỗi: {stats['error']}")

if __name__ == "__main__":
    asyncio.run(clean_and_repair())
