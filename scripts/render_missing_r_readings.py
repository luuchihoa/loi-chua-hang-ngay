import os
import sys
import re
import time
import json
import subprocess

PYTHON_BIN = "/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python"
SCRIPT_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_r2_mp3.py"
SCRIPT_MANIFEST = "/Users/tranthithuynhi/my-react-app/scripts/rebuild_audio_manifest.py"
READINGS_DIR = "/Users/tranthithuynhi/my-react-app/private/audio/readings"

def format_unified_reading_filename(ref_str):
    if not ref_str: return None
    ref = ref_str.strip()
    ref = re.sub(r"[\.,:;()\\/*?\"<>|]", "", ref)
    ref = re.sub(r"\s*-\s*", "-", ref)
    ref = re.sub(r"\s+", "_", ref)
    ref = re.sub(r"_+", "_", ref)
    return f"r_{ref}.mp3" if ref else None

def rebuild_manifest():
    try:
        subprocess.run(["python3", SCRIPT_MANIFEST], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"⚠️ Cảnh báo: Không thể cập nhật audioManifest.json: {e}")

def main():
    json_path = "/Users/tranthithuynhi/my-react-app/liturgy_contents_rows.json"
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    r2_db_items = []
    seen = set()
    for r in rows:
        ref = r.get("r2_ref")
        content = r.get("r2_content")
        if ref and content and len(content.strip()) > 10:
            fname = format_unified_reading_filename(ref)
            if fname and fname not in seen:
                seen.add(fname)
                r2_db_items.append({
                    "ref": ref,
                    "filename": fname,
                    "intro": r.get("r2_intro", "").strip(),
                    "content": content.strip()
                })

    missing_items = []
    for item in r2_db_items:
        fpath = os.path.join(READINGS_DIR, item["filename"])
        if not os.path.exists(fpath) or os.path.getsize(fpath) < 10 * 1024:
            missing_items.append(item)

    total_missing = len(missing_items)
    print("===============================================================")
    print(f"🎙️ BẮT ĐẦU RENDER NỐT {total_missing} BÀI ĐỌC 2 THIẾU CÒN LẠI")
    print("===============================================================")

    for idx, item in enumerate(missing_items, 1):
        mp3_path = os.path.join(READINGS_DIR, item["filename"])
        print(f"\n🎙️ [BÀI {idx}/{total_missing}] ── Bắt đầu render: {item['ref']} -> {item['filename']}", flush=True)
        
        cmd = [
            PYTHON_BIN, SCRIPT_SINGLE,
            item['ref'],
            item['intro'],
            item['content'],
            mp3_path,
            "16",
            "false"
        ]
        
        start_time = time.time()
        res = subprocess.run(cmd)
        elapsed = time.time() - start_time

        if res.returncode == 0:
            file_size_kb = os.path.getsize(mp3_path) / 1024 if os.path.exists(mp3_path) else 0
            print(f"✅ [HOÀN THÀNH {idx}/{total_missing}] {item['ref']} -> {item['filename']} | Thời gian: {elapsed:.1f}s | Dung lượng: {file_size_kb:.1f} KB", flush=True)
            rebuild_manifest()
        else:
            print(f"❌ [LỖI {idx}/{total_missing}] Thất bại khi tạo file {item['ref']}", flush=True)

        if idx < total_missing:
            print("❄️ Đang nghỉ 5s xả nhiệt GPU/CPU...", flush=True)
            time.sleep(5)

    rebuild_manifest()
    print("\n===============================================================")
    print(f"🎉 ĐÃ HOÀN THÀNH 100% TOÀN BỘ 69 BÀI ĐỌC 2 THEO CHUẨN r_ MỚI!")
    print("===============================================================")

if __name__ == "__main__":
    main()
