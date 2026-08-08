import os
import json
import re
import sys
import asyncio
import edge_tts

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from rebuild_all_mp3s_solemn_tone import perfect_liturgical_cleaner, format_ref_filename

# Cấu hình 4 Giọng Đọc Phân Vai Phụng Vụ Chuẩn
ROLE_VOICES = {
    "nk": {"voice": "vi-VN-HoaiMyNeural",  "rate": "-10%", "pitch": "-1Hz", "label": "Người Kể"},
    "✠":  {"voice": "vi-VN-NamMinhNeural", "rate": "-10%", "pitch": "-2Hz", "label": "Đức Giê-su"},
    "m":  {"voice": "vi-VN-NamMinhNeural", "rate": "-8%",  "pitch": "+0Hz", "label": "Một Người"},
    "dc": {"voice": "vi-VN-HoaiMyNeural",  "rate": "-5%",  "pitch": "+1Hz", "label": "Dân Chúng"}
}

def parse_passion_roles(text):
    if not text:
        return []
    
    # 1. Tách số câu dính trước ký hiệu (vd: 30nk -> nk, 33nk -> nk, 14nk -> nk)
    text_cleaned = re.sub(r"\d{1,3}(nk|m|dc)\b", r" \1 ", text)
    
    # 2. Tách theo các ký hiệu \bnk\b, \bm\b, \bdc\b, ✠
    tokens = re.split(r"(\b(?:nk|m|dc)\b|✠)", text_cleaned)
    
    raw_segments = []
    curr_role = "nk"
    
    for t in tokens:
        if t in ["nk", "m", "dc", "✠"]:
            curr_role = t
        else:
            clean_txt = perfect_liturgical_cleaner(t)
            if clean_txt and re.search(r"[a-zA-ZÀ-ỹ]", clean_txt):
                raw_segments.append((curr_role, clean_txt))
                
    # 3. Gộp các đoạn liên tiếp có cùng vai đọc để tối ưu số lần gọi API và tạo nhịp đọc mượt
    merged = []
    for role, txt in raw_segments:
        if merged and merged[-1][0] == role:
            merged[-1] = (role, merged[-1][1] + " ... " + txt)
        else:
            merged.append((role, txt))
            
    return merged

async def generate_single_part(txt, cfg, tf):
    for attempt in range(3):
        try:
            comm = edge_tts.Communicate(txt, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"])
            await comm.save(tf)
            if os.path.exists(tf) and os.path.getsize(tf) > 100:
                return True
        except Exception as e:
            await asyncio.sleep(1)
    return False

async def generate_passion_mp3(semaphore, segments, output_path, title):
    async with semaphore:
        print(f"🎙️ Bắt đầu tổng hợp {len(segments)} khối thoại 4 vai cho {title}...")
        temp_files = []
        
        try:
            for i, (role, txt) in enumerate(segments):
                cfg = ROLE_VOICES.get(role, ROLE_VOICES["nk"])
                tf = f"{output_path}_passion_chunk_{i}.mp3"
                
                success = await generate_single_part(txt, cfg, tf)
                if success:
                    temp_files.append(tf)
                else:
                    print(f"  ⚠️ Cảnh báo: Đoạn #{i} [{role}] không tạo được audio!")

            if not temp_files:
                return False

            # Ghép nối tất cả các file audio phân vai thành 1 file MP3 duy nhất
            with open(output_path, "wb") as outfile:
                for tf in temp_files:
                    if os.path.exists(tf):
                        with open(tf, "rb") as infile:
                            outfile.write(infile.read())
                        os.remove(tf)
                        
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"🎉 XUẤT THÀNH CÔNG MP3 PHÂN VAI 4 GIỌNG ĐỌC: {os.path.basename(output_path)} ({size_mb:.2f} MB)")
            return True
        except Exception as e:
            print(f"❌ Lỗi khi sinh audio phân vai cho {title}: {e}")
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

    passion_items = []
    for idx, item in enumerate(data):
        ref = item.get("gospel_ref") or ""
        title = item.get("title") or ""
        content = item.get("gospel_content") or ""
        
        is_passion = ("Mt 26," in ref or "Mc 14," in ref or "Lc 22," in ref or "Ga 18," in ref or 
                      "Thương Khó" in title or "LỄ LÁ" in title or "Tuần Thánh" in title)
        
        if is_passion and content and ("nk" in content or "✠" in content):
            passion_items.append((idx, item))

    print(f"🚀 Tìm thấy {len(passion_items)} bài Thương Khó cần tạo Audio 4 Giọng Đọc Phân Vai...")

    semaphore = asyncio.Semaphore(2)
    tasks = []

    for idx, item in passion_items:
        g_ref = item.get("gospel_ref")
        cycle = item.get("cycle") or ""
        title = f"{item.get('title')} (Năm {cycle} - {g_ref})"
        fn = format_ref_filename(g_ref, "gospel")
        out_path = os.path.abspath(f"private/audio/gospels/{fn}")
        
        content = item.get("gospel_content") or ""
        intro = item.get("gospel_intro") or ""
        full_text = f"{intro}. {content}" if intro else content
        
        segments = parse_passion_roles(full_text)
        if segments:
            tasks.append(generate_passion_mp3(semaphore, segments, out_path, title))

    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
