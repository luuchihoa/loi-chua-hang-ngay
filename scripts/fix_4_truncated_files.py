import os
import json
import asyncio
import re
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
    cleaned = re.sub(r'<[^>]*>', '', text)
    cleaned = cleaned.replace("✠", "")
    cleaned = re.sub(r':\s*\d+[a-zA-Z]?', ' : ', cleaned)
    cleaned = re.sub(r'\b\d+[a-zA-Z]?\b', '', cleaned)

    cleaned = cleaned.replace("“", "").replace("”", "").replace('"', "")
    cleaned = cleaned.replace(" : ", ". ").replace(":", ".")
    cleaned = cleaned.replace("Đ.", "Đáp: ")
    cleaned = cleaned.replace("BĐ1:", "Bài đọc 1: ")
    cleaned = cleaned.replace("BĐ2:", "Bài đọc 2: ")
    cleaned = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', cleaned)
    
    cleaned = re.sub(r'\.\s*\.', '.', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def generate_single_mp3(clean_text, output_path):
    print(f"  📝 Độ dài văn bản: {len(clean_text.split())} từ | {len(clean_text)} ký tự")
    
    # Chia nhỏ văn bản thành các đoạn ngắn 300-400 ký tự (theo câu) để Edge TTS không bao giờ bị rớt hay ngắt giữa chừng
    sentences = re.split(r'(\. |\n)', clean_text)
    chunks = []
    current = ""
    for s in sentences:
        if len(current) + len(s) < 350:
            current += s
        else:
            if current.strip():
                chunks.append(current.strip())
            current = s
    if current.strip():
        chunks.append(current.strip())

    print(f"  📦 Đã chia làm {len(chunks)} đoạn audio nhỏ để tải đảm bảo 100% đầy đủ...")

    temp_files = []
    for idx, chunk in enumerate(chunks):
        temp_file = f"{output_path}_fix_temp_{idx}.mp3"
        success = False
        for attempt in range(5):
            try:
                comm = edge_tts.Communicate(chunk, VOICE)
                await comm.save(temp_file)
                if os.path.exists(temp_file) and os.path.getsize(temp_file) > 1000:
                    success = True
                    break
            except Exception as e:
                print(f"    ⚠️ Thử lại chunk {idx} (lần {attempt + 1}): {e}")
                await asyncio.sleep(1)
        
        if not success:
            raise Exception(f"Không thể tải chunk {idx}")
        temp_files.append(temp_file)

    # Ghép tất cả các chunk MP3 thành 1 file duy nhất
    with open(output_path, "wb") as outfile:
        for tf in temp_files:
            with open(tf, "rb") as infile:
                outfile.write(infile.read())
            os.remove(tf)

    size = os.path.getsize(output_path)
    print(f"  🎉 XUẤT FILE HOÀN TẤT: {os.path.basename(output_path)} ({size / 1024:.1f} KB)")

async def main():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # 4 file cần fix:
    # 1. r1_1_V_171-6.mp3 (1 V 17, 1-6)
    # 2. gospel_Mt_527-32.mp3 (Mt 5, 27-32)
    # 3. gospel_Mt_1318-23.mp3 (Mt 13, 18-23)
    # 4. gospel_Mt_513-16.mp3 (Mt 5, 13-16)

    targets = [
        {"type": "r1", "ref_pattern": r"1\s*V\s*17,\s*1-6", "folder": "private/audio/readings", "prefix": "r1"},
        {"type": "gospel", "ref_pattern": r"Mt\s*5,\s*27-32", "folder": "private/audio/gospels", "prefix": "gospel"},
        {"type": "gospel", "ref_pattern": r"Mt\s*13,\s*18-23", "folder": "private/audio/gospels", "prefix": "gospel"},
        {"type": "gospel", "ref_pattern": r"Mt\s*5,\s*13-16", "folder": "private/audio/gospels", "prefix": "gospel"},
    ]

    print("🔧 BẮT ĐẦU FIX TRIỆT ĐỂ 4 FILE AUDIO BỊ THIẾU CÂU / CẮT CỔNG...\n")

    for t in targets:
        found = False
        for item in data:
            ref = (item.get(f"{t['type']}_ref") or "").strip()
            if re.search(t['ref_pattern'], ref, re.IGNORECASE):
                found = True
                intro = item.get(f"{t['type']}_intro", "") or ""
                content = item.get(f"{t['type']}_content", "") or ""
                
                label = "Bài đọc 1. " if t["type"] == "r1" else "Phúc Âm. "
                full_text = f"{label}{intro}. {content}" if intro else f"{label}{content}"
                clean_text = perfect_liturgical_cleaner(full_text)

                file_name = format_ref_filename(t["prefix"], ref)
                output_path = os.path.abspath(os.path.join(t["folder"], file_name))

                print(f"📌 Xử lý bài: {ref} -> {file_name}")
                await generate_single_mp3(clean_text, output_path)
                print("-" * 50)
                break
        
        if not found:
            print(f"❌ KHÔNG TÌM THẤY TRÍCH ĐẠN TRONG DATA.JSON CHO PATTERN: {t['ref_pattern']}")

if __name__ == "__main__":
    asyncio.run(main())
