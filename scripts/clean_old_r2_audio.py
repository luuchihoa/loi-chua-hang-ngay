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

def old_format_r2_filename(r2_ref):
    if not r2_ref:
        return None
    clean = re.sub(r'[\\\/:*?"<>|()]', '', r2_ref.strip())
    clean = re.sub(r'[\.,]', '', clean)
    clean = re.sub(r'\s+', '_', clean)
    clean = re.sub(r'_+', '_', clean)
    if not clean:
        return None
    return f"r2_{clean}.mp3"

def rebuild_manifest():
    try:
        subprocess.run(["python3", SCRIPT_MANIFEST], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"⚠️ Cảnh báo: Không thể cập nhật audioManifest.json: {e}")

def main():
    json_path = "/Users/tranthithuynhi/my-react-app/liturgy_contents_rows.json"
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    db_r2_files = {}
    for r in rows:
        ref = r.get("r2_ref")
        content = r.get("r2_content")
        if ref and content and len(content.strip()) > 10:
            fname = old_format_r2_filename(ref)
            if fname and fname not in db_r2_files:
                db_r2_files[fname] = {
                    "ref": ref,
                    "intro": r.get("r2_intro", "").strip(),
                    "content": content.strip()
                }

    print("===============================================================")
    print("🧹 BẮT ĐẦU DỌN DẸP FILE BÀI ĐỌC 2 CŨ & HOÀN THIỆN CÁC BÀI THIẾU")
    print("===============================================================")

    # 1. Xóa các file cũ trong private/audio/readings/
    deleted_count = 0
    all_files = [f for f in os.listdir(READINGS_DIR) if f.startswith("r2_") and f.endswith(".mp3")]
    
    for f in all_files:
        fpath = os.path.join(READINGS_DIR, f)
        mtime = os.path.getmtime(fpath)
        mtime_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime))
        
        # Nếu mtime trước 2026-07-25 20:00:00 -> File cũ cần xóa
        if not ("2026-07-25 2" in mtime_str or "2026-07-26" in mtime_str):
            try:
                os.remove(fpath)
                deleted_count += 1
            except Exception as e:
                print(f"Lỗi khi xóa file {f}: {e}")

    print(f"🗑️ Đã dọn dẹp xóa thành công {deleted_count} file r2 cũ rác.")

    # 2. Kiểm tra danh sách 3 bài thiếu và render nốt
    missing_items = []
    for fname, data in db_r2_files.items():
        fpath = os.path.join(READINGS_DIR, fname)
        if not os.path.exists(fpath):
            missing_items.append((fname, data))

    print(f"📌 Số bài đọc 2 chuẩn còn thiếu: {len(missing_items)} bài")

    for idx, (fname, data) in enumerate(missing_items, 1):
        mp3_path = os.path.join(READINGS_DIR, fname)
        print(f"\n🎙️ [BÀI {idx}/{len(missing_items)}] ── Đang render bài thiếu: {data['ref']} -> {fname}")
        
        cmd = [
            PYTHON_BIN, SCRIPT_SINGLE,
            data['ref'],
            data['intro'],
            data['content'],
            mp3_path,
            "16",
            "false"
        ]
        
        start_time = time.time()
        res = subprocess.run(cmd)
        elapsed = time.time() - start_time

        if res.returncode == 0:
            file_size_kb = os.path.getsize(mp3_path) / 1024 if os.path.exists(mp3_path) else 0
            print(f"✅ [HOÀN THÀNH {idx}/{len(missing_items)}] {data['ref']} -> {fname} | Thời gian: {elapsed:.1f}s | Dung lượng: {file_size_kb:.1f} KB")
        else:
            print(f"❌ Lỗi khi tạo file {data['ref']}")

        if idx < len(missing_items):
            print("❄️ Đang nghỉ 5s xả nhiệt GPU/CPU...")
            time.sleep(5)

    # 3. Đồng bộ lại manifest
    rebuild_manifest()

    final_files = [f for f in os.listdir(READINGS_DIR) if f.startswith("r2_") and f.endswith(".mp3")]
    print("\n===============================================================")
    print(f"🎉 HOÀN THÀNH DỌN DẸP VÀ CHUẨN HÓA TOÀN BỘ BÀI ĐỌC 2!")
    print(f"✅ Tổng số file Bài đọc 2 chuẩn hiện có trong thư mục: {len(final_files)}/69 file")
    print(f"🔄 Đã tự động cập nhật audioManifest.json!")
    print("===============================================================")

if __name__ == "__main__":
    main()
