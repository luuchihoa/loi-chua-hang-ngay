import os
import json
import asyncio
import re
import glob
import edge_tts
import unicodedata

VOICE = "vi-VN-HoaiMyNeural"

def format_ref_filename(ref_str):
    """Khớp chính xác src/utils/audioNaming.js::normalizeAudioRef()."""
    if not ref_str:
        return None
    clean = unicodedata.normalize("NFC", ref_str).strip()
    clean = re.sub(r'[.,:;]+$', '', clean)
    clean = re.sub(r'[()\\/*?"<>|]', '', clean)
    # Giữ cấu trúc chương/câu và khoảng câu, khớp audioNaming.js.
    clean = re.sub(r'\s*[,.:]\s*', 'v', clean)
    clean = re.sub(r'\s*-\s*', '_to_', clean)
    clean = re.sub(r'\s*;\s*', '_and_', clean)
    clean = re.sub(r'\s+', '_', clean)
    clean = re.sub(r'_+', '_', clean)
    clean = clean.strip('_')
    if not clean:
        return None
    return f"{clean}.mp3"

def strip_html(html):
    if not html:
        return ""
    text = re.sub(r'<[^>]*>', '', html)
    text = text.replace("✠", "")
    text = re.sub(r'\b\d+\b', '', text) # Xóa số câu kinh thánh
    text = text.replace("“", "").replace("”", "").replace('"', "")
    text = text.replace(":", ".")
    text = text.replace("Đ.", "Đáp: ")
    text = text.replace("BĐ1:", "Bài đọc 1: ")
    text = text.replace("BĐ2:", "Bài đọc 2: ")
    text = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def generate_mp3_chunked(text, output_path, retries=3):
    clean_text = strip_html(text)
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
                temp_file = f"{output_path}_temp_{idx}.mp3"
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
        raise Exception("Lỗi khi tải audio")

async def batch_generate_readings():
    folder = os.path.abspath("private/audio/readings")
    os.makedirs(folder, exist_ok=True)
    print("🚀 BẮT ĐẦU TỰ ĐỘNG TẠO FILE MP3 CHỈ CHO BÀI ĐỌC 1 VÀ BÀI ĐỌC 2...")
    print(f"🎙️ Giọng đọc: Microsoft Hoài My Neural ({VOICE})\n")

    data_path = os.path.abspath("data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    seen_items = set()
    targets = []

    for item in data:
        # 1. Bài Đọc 1
        r1_ref = item.get("r1_ref")
        r1_content = item.get("r1_content")
        r1_intro = item.get("r1_intro", "")
        if r1_ref and r1_content:
            f_name = format_ref_filename(r1_ref)
            if f_name and f_name not in seen_items:
                seen_items.add(f_name)
                out_path = os.path.join(folder, f_name)
                if not os.path.exists(out_path) or os.path.getsize(out_path) < 5000:
                    full_txt = f"{r1_intro}. {r1_content}" if r1_intro else r1_content
                    targets.append({"ref": r1_ref, "text": full_txt, "out": out_path, "name": f_name})

        # 2. Bài Đọc 2
        r2_ref = item.get("r2_ref")
        r2_content = item.get("r2_content")
        r2_intro = item.get("r2_intro", "")
        if r2_ref and r2_content:
            f_name = format_ref_filename(r2_ref)
            if f_name and f_name not in seen_items:
                seen_items.add(f_name)
                out_path = os.path.join(folder, f_name)
                if not os.path.exists(out_path) or os.path.getsize(out_path) < 5000:
                    full_txt = f"{r2_intro}. {r2_content}" if r2_intro else r2_content
                    targets.append({"ref": r2_ref, "text": full_txt, "out": out_path, "name": f_name})

    print(f"📊 Tìm thấy {len(targets)} bài đọc (BĐ1 & BĐ2) độc bản cần tạo MP3.")
    print("⚡ TẬN DỤNG TỐI ĐA SỨC MẠNH 10 NHÂN MACBOOK PRO (25 LUỒNG SONG SONG SIÊU TỐC)...\n")

    semaphore = asyncio.Semaphore(25) # 25 luồng song song trên 10 CPU cores
    stats = {"success": 0, "error": 0}

    async def worker(idx, target):
        async with semaphore:
            try:
                await generate_mp3_chunked(target["text"], target["out"])
                print(f"✅ [{idx}/{len(targets)}] HOÀN THÀNH: {target['ref']} -> {target['name']}")
                stats["success"] += 1
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"❌ [{idx}/{len(targets)}] Lỗi {target['ref']}: {e}")
                stats["error"] += 1

    tasks = [worker(idx, t) for idx, t in enumerate(targets, 1)]
    await asyncio.gather(*tasks)

    print("\n==================================================")
    print(f"🎉 HOÀN THÀNH TẠO TOÀN BỘ MP3 BÀI ĐỌC 1 VÀ BÀI ĐỌC 2!")
    print(f"✅ Tạo mới thành công: {stats['success']}")
    print(f"❌ Số bài bị lỗi: {stats['error']}")

if __name__ == "__main__":
    asyncio.run(batch_generate_readings())
