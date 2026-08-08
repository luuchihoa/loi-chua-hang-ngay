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
    cleaned = re.sub(r'<[^>]*>', '', text)
    cleaned = cleaned.replace("✠", "")
    
    # Lọc bỏ tên viết tắt sách thừa ở cuối câu intro (VD: "thánh Mác-cô Mc" -> "thánh Mác-cô")
    cleaned = re.sub(r'\b(Mc|Mt|Lc|Ga|Is|Gr|St|Xh|Lv)\s*\.', '.', cleaned)
    cleaned = re.sub(r'\b(Mc|Mt|Lc|Ga|Is|Gr|St|Xh|Lv)\s*$', '', cleaned)
    
    # Lọc bỏ số câu kinh thánh (VD: 18, 19, 31, :2)
    cleaned = re.sub(r':\s*\d+[a-zA-Z]?', ' : ', cleaned)
    cleaned = re.sub(r'\b\d+[a-zA-Z]?\b', '', cleaned)
    cleaned = re.sub(r'\b[a-zA-Z]\b', '', cleaned)

    cleaned = cleaned.replace("“", "").replace("”", "").replace('"', "")
    cleaned = cleaned.replace(" : ", ". ").replace(":", ".")
    cleaned = cleaned.replace("Đ.", "Đáp: ")
    cleaned = cleaned.replace("BĐ1:", "Bài đọc 1: ")
    cleaned = cleaned.replace("BĐ2:", "Bài đọc 2: ")
    cleaned = re.sub(r'\((Đ\.|Đ|Đáp)\)', ' Đáp. ', cleaned)
    
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
                    raise Exception(f"Lỗi chunk {idx}")
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
        raise Exception("Lỗi audio")

async def fix_and_rebuild_intros():
    print("🧹 BẮT ĐẦU SỬA VÀ TẠO LẠI BÀI ĐỌC CÓ LỖI TỪ DƯ THỪA...")

    # Delete bad old files without book name prefix
    bad_files = [
        "private/audio/gospels/gospel_331-35.mp3",
        "private/audio/gospels/gospel_1038-42.mp3",
        "private/audio/gospels/gospel_102-16.mp3",
        "private/audio/gospels/gospel_5_20-22a27-2833-34a37.mp3"
    ]
    for bf in bad_files:
        p = os.path.abspath(bf)
        if os.path.exists(p):
            try:
                os.remove(p)
                print(f"🗑️ Đã xóa file lỗi cũ: {bf}")
            except Exception:
                pass

    # Read updated data.json
    data_path = os.path.abspath("data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    target_refs = ["Mc 3,31-35", "Lc 10,38-42", "Mc 10,2-16", "Mt 5, 20-22a.27-28.33-34a.37"]

    for item in data:
        ref = (item.get("gospel_ref") or "").strip()
        if ref in target_refs:
            intro = item.get("gospel_intro", "")
            content = item.get("gospel_content", "")
            f_name = format_ref_filename("gospel", ref)
            out_file = os.path.abspath(f"private/audio/gospels/{f_name}")
            full_txt = f"{intro}. {content}" if intro else content

            print(f"🎙️ Đang tạo lại MP3 chuẩn cho {ref} -> {f_name}...")
            await generate_mp3_clean(full_txt, out_file)
            print(f"✅ ĐÃ SỬA THÀNH CÔNG: {f_name}")

if __name__ == "__main__":
    asyncio.run(fix_and_rebuild_intros())
