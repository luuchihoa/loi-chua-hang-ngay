import os
import sys
import json
import time
import subprocess

PYTHON_BIN = "/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python"
SCRIPT_R_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_r2_mp3.py"
SCRIPT_GOSPEL_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_gospel_mp3.py"
SCRIPT_MANIFEST = "/Users/tranthithuynhi/my-react-app/scripts/rebuild_audio_manifest.py"

BASE_DIR = "/Users/tranthithuynhi/my-react-app"
READINGS_DIR = os.path.join(BASE_DIR, "public", "audio", "readings")
GOSPELS_DIR = os.path.join(BASE_DIR, "public", "audio", "gospels")

os.makedirs(READINGS_DIR, exist_ok=True)
os.makedirs(GOSPELS_DIR, exist_ok=True)

def rebuild_manifest():
    try:
        subprocess.run(["python3", SCRIPT_MANIFEST], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        pass

def main():
    json_path = os.path.join(BASE_DIR, "liturgy_contents_rows.json")
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    # Tìm dòng phụng vụ Chúa Nhật XVII Thường Niên Năm C (ID: 6cc7b7f2-eea7-4eb8-8e0d-1cd02ca3a025)
    today_row = None
    for r in rows:
        if r.get("id") == "6cc7b7f2-eea7-4eb8-8e0d-1cd02ca3a025" or r.get("liturgy_key") == "thuong_cn_17":
            if r.get("r1_ref") and "St 18" in r.get("r1_ref"):
                today_row = r
                break

    if not today_row:
        print("❌ Không tìm thấy dữ liệu phụng vụ Chúa Nhật XVII Thường Niên Năm C!")
        sys.exit(1)

    print("===============================================================")
    print("🎙️ BẮT ĐẦU RENDER BÀI ĐỌC HÔM NAY (Chúa Nhật XVII Thường Niên - 26/07/2026)")
    print(f"📖 Tiêu đề: {today_row.get('title')}")
    print("===============================================================")

    tasks = [
        {
            "type": "reading",
            "section": "Bài Đọc 1",
            "ref": today_row.get("r1_ref"),
            "intro": today_row.get("r1_intro", "").strip(),
            "content": today_row.get("r1_content", "").strip(),
            "out_path": os.path.join(READINGS_DIR, "r_St_1820-32.mp3"),
            "script": SCRIPT_R_SINGLE
        },
        {
            "type": "reading",
            "section": "Bài Đọc 2",
            "ref": today_row.get("r2_ref"),
            "intro": today_row.get("r2_intro", "").strip(),
            "content": today_row.get("r2_content", "").strip(),
            "out_path": os.path.join(READINGS_DIR, "r_Cl_212-14.mp3"),
            "script": SCRIPT_R_SINGLE
        },
        {
            "type": "gospel",
            "section": "Tin Mừng",
            "ref": today_row.get("gospel_ref"),
            "intro": today_row.get("gospel_intro", "").strip(),
            "content": today_row.get("gospel_content", "").strip(),
            "out_path": os.path.join(GOSPELS_DIR, "gospel_Lc_111-13.mp3"),
            "script": SCRIPT_GOSPEL_SINGLE
        }
    ]

    total = len(tasks)
    for idx, t in enumerate(tasks, 1):
        print(f"\n🎙️ [{idx}/{total}] ── {t['section']}: {t['ref']} -> {os.path.basename(t['out_path'])}", flush=True)
        
        cmd = [
            PYTHON_BIN, t['script'],
            t['ref'],
            t['intro'],
            t['content'],
            t['out_path'],
            "16",
            "false"
        ]
        
        start_time = time.time()
        res = subprocess.run(cmd)
        elapsed = time.time() - start_time

        if res.returncode == 0:
            file_size_kb = os.path.getsize(t['out_path']) / 1024 if os.path.exists(t['out_path']) else 0
            print(f"✅ [HOÀN THÀNH {idx}/{total}] {t['section']} ({t['ref']}) -> {os.path.basename(t['out_path'])} | Thời gian: {elapsed:.1f}s | Dung lượng: {file_size_kb:.1f} KB", flush=True)
            rebuild_manifest()
        else:
            print(f"❌ [LỖI {idx}/{total}] Thất bại khi tạo file {t['ref']}", flush=True)

        if idx < total:
            print("❄️ Đang nghỉ 5s xả nhiệt GPU/CPU...", flush=True)
            time.sleep(5)

    rebuild_manifest()
    print("\n===============================================================")
    print("🎉 HOÀN THÀNH RENDER TOÀN BỘ BÀI ĐỌC CHO NGÀY HÔM NAY!")
    print("===============================================================")

if __name__ == "__main__":
    main()
