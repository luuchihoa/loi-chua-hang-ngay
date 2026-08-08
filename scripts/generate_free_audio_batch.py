import os
import json
import asyncio
import re
import edge_tts

# Script tự động tạo file MP3 giọng đọc AI Tiếng Việt truyền cảm (Hoài My Neural)
# HOÀN TOÀN MIỄN PHÍ 100%, KHÔNG CẦN API KEY, KHÔNG GIỚI HẠN KÝ TỰ!

VOICE = "vi-VN-HoaiMyNeural" # Giọng nữ miền Nam dịu dàng, luyến láy tự nhiên

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
    text = text.replace("✠", "") # Xóa biểu tượng Thánh Giá
    text = re.sub(r'\b\d+\b', '', text) # Xóa số câu (ví dụ 18, 19, 20) để giọng đọc liền mạch chuẩn phụng vụ
    text = text.replace("“", "").replace("”", "").replace('"', "")
    text = text.replace(":", ".")
    text = text.replace("Đ.", "Đáp: ")
    text = text.replace("BĐ1:", "Bài đọc 1: ")
    text = text.replace("BĐ2:", "Bài đọc 2: ")
    text = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def generate_mp3(text, output_path):
    if len(text) > 1000:
        # Tách thành các đoạn nhỏ theo câu để tránh bị đứt WebSocket đối với bài Phúc Âm dài
        parts = re.split(r'(\. |\n)', text)
        chunks = []
        current = ""
        for p in parts:
            if len(current) + len(p) < 900:
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
                temp_file = f"{output_path}_part_{idx}.mp3"
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
            # Cleanup temp files
            for tf in temp_files:
                if os.path.exists(tf):
                    os.remove(tf)
            raise e
    else:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(output_path)

async def process_item(semaphore, idx, total, item, output_dir, stats):
    async with semaphore:
        ref = item["gospel_ref"]
        intro = item.get("gospel_intro", "")
        content = item.get("gospel_content", "")

        filename = format_ref_filename(ref)
        output_file = os.path.join(output_dir, filename)

        if os.path.exists(output_file) and os.path.getsize(output_file) > 10000:
            print(f"⚡ [{idx}/{total}] ĐÃ TỒN TẠI: {ref} -> {filename}")
            stats["skipped"] += 1
            return

        full_text = f"{intro}. {content}" if intro else content
        clean_text = strip_html(full_text)

        try:
            await generate_mp3(clean_text, output_file)
            print(f"✅ [{idx}/{total}] TẠO MP3 THÀNH CÔNG: {ref} -> {filename}")
            stats["generated"] += 1
        except Exception as e:
            print(f"❌ [{idx}/{total}] Lỗi khi tạo {ref}: {e}")

async def batch_process(limit=None):
    print("🚀 BẮT ĐẦU TỰ ĐỘNG TẠO FILE MP3 SONG SONG SIÊU TỐC (PARALLEL 8 THREADS)...")
    print(f"🎙️ Giọng đọc: Microsoft Hoài My Neural ({VOICE})\n")

    data_path = os.path.abspath("data.json")
    if not os.path.exists(data_path):
        print("❌ Không tìm thấy file data.json")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    output_dir = os.path.abspath("private/audio/gospels")
    os.makedirs(output_dir, exist_ok=True)

    seen_refs = set()
    unique_gospels = []

    for item in data:
        ref = item.get("gospel_ref")
        content = item.get("gospel_content")
        intro = item.get("gospel_intro", "")
        if not ref or not content:
            continue
        
        clean_ref = ref.strip()
        if clean_ref not in seen_refs:
            seen_refs.add(clean_ref)
            unique_gospels.append({
                "gospel_ref": clean_ref,
                "gospel_intro": intro,
                "gospel_content": content,
                "title": item.get("title", "")
            })

    total_target = len(unique_gospels) if limit is None else min(limit, len(unique_gospels))
    target_list = unique_gospels[:total_target]

    print(f"📊 Tìm thấy {len(unique_gospels)} bài Phúc Âm độc bản trong Database.")
    print(f"🎯 Sẽ tiến hành xử lý song song {len(target_list)} bài...\n")

    semaphore = asyncio.Semaphore(8) # Tốc độ cao: 8 luồng song song
    stats = {"skipped": 0, "generated": 0}

    tasks = [
        process_item(semaphore, idx, len(target_list), item, output_dir, stats)
        for idx, item in enumerate(target_list, 1)
    ]

    await asyncio.gather(*tasks)

    print("\n==================================================")
    print(f"🎉 HOÀN THÀNH TẠO HÀNG LOẠT AUDIO SONG SONG SIÊU TỐC!")
    print(f"📊 Tổng số bài Phúc Âm xử lý: {len(target_list)}")
    print(f"⚡ Đã có sẵn (Bỏ qua): {stats['skipped']}")
    print(f"🎙️ Tạo mới thành công: {stats['generated']}")

if __name__ == "__main__":
    import sys
    limit_arg = int(sys.argv[1]) if len(sys.argv) > 1 else None
    asyncio.run(batch_process(limit_arg))
