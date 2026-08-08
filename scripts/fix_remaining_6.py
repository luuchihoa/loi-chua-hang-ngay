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

async def generate_mp3_small_chunks(text, output_path):
    clean_text = strip_html(text)
    # Tách đoạn nhỏ 400 ký tự cho bài thương khó rất dài
    parts = re.split(r'(\. |\n)', clean_text)
    chunks = []
    current = ""
    for p in parts:
        if len(current) + len(p) < 400:
            current += p
        else:
            chunks.append(current)
            current = p
    if current:
        chunks.append(current)

    temp_files = []
    for idx, chunk in enumerate(chunks):
        if not chunk.strip():
            continue
        temp_file = f"{output_path}_sub_{idx}.mp3"
        for attempt in range(5):
            try:
                comm = edge_tts.Communicate(chunk.strip(), VOICE)
                await comm.save(temp_file)
                if os.path.exists(temp_file) and os.path.getsize(temp_file) > 100:
                    break
            except Exception:
                await asyncio.sleep(1.5)
        
        if os.path.exists(temp_file) and os.path.getsize(temp_file) > 100:
            temp_files.append(temp_file)

    if temp_files:
        with open(output_path, "wb") as outfile:
            for tf in temp_files:
                if os.path.exists(tf):
                    with open(tf, "rb") as infile:
                        outfile.write(infile.read())
                    os.remove(tf)
        print(f"✅ HOÀN THÀNH BÀI DÀI: {output_path}")

async def main():
    folder = os.path.abspath("private/audio/gospels")
    data_path = os.path.abspath("data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    seen = set()
    missing = []
    for item in data:
        ref = item.get("gospel_ref")
        content = item.get("gospel_content")
        intro = item.get("gospel_intro", "")
        if not ref or not content:
            continue
        clean_ref = ref.strip()
        if clean_ref not in seen:
            seen.add(clean_ref)
            filename = format_ref_filename(clean_ref)
            out_file = os.path.join(folder, filename)
            if not os.path.exists(out_file) or os.path.getsize(out_file) < 5000:
                missing.append({
                    "ref": clean_ref,
                    "text": f"{intro}. {content}" if intro else content,
                    "out": out_file
                })

    print(f"🔄 Xử lý {len(missing)} bài còn thiếu cuối cùng...")
    for item in missing:
        try:
            await generate_mp3_small_chunks(item["text"], item["out"])
        except Exception as e:
            print(f"❌ Lỗi {item['ref']}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
