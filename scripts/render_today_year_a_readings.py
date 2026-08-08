import os
import sys
import json
import time
import subprocess

PYTHON_BIN = "/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python"
SCRIPT_R_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_reading_mp3.py"
SCRIPT_GOSPEL_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_gospel_mp3.py"
SCRIPT_MANIFEST = "/Users/tranthithuynhi/my-react-app/scripts/rebuild_audio_manifest.py"

BASE_DIR = "/Users/tranthithuynhi/my-react-app"
READINGS_R1_DIR = os.path.join(BASE_DIR, "public", "audio", "readings", "r1")
READINGS_R2_DIR = os.path.join(BASE_DIR, "public", "audio", "readings", "r2")
GOSPELS_DIR = os.path.join(BASE_DIR, "public", "audio", "gospels")

os.makedirs(READINGS_R1_DIR, exist_ok=True)
os.makedirs(READINGS_R2_DIR, exist_ok=True)
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

    # Dòng phụng vụ NĂM A cho Chúa Nhật XVII Thường Niên (ID: 4d2f4c67-7d47-4829-81f7-6f921d91928f)
    today_row = None
    for r in rows:
        if r.get("id") == "4d2f4c67-7d47-4829-81f7-6f921d91928f":
            today_row = r
            break

    if not today_row:
        print("❌ Không tìm thấy dữ liệu NĂM A cho Chúa Nhật XVII Thường Niên!")
        sys.exit(1)

    print("===============================================================")
    print("🎙️ BẮT ĐẦU RENDER BÀI ĐỌC HÔM NAY (NĂM A - CHUẨN THƯ MỤC r1/ r2/ TÁCH BIỆT)")
    print(f"📖 Tiêu đề: {today_row.get('title')}")
    print("===============================================================")

    tasks = [
        {
            "type": "reading",
            "section": "Bài Đọc 1 (Năm A)",
            "section_label": "Bài đọc một.",
            "ref": today_row.get("r1_ref"),
            "intro": today_row.get("r1_intro", "").strip(),
            "content": today_row.get("r1_content", "").strip(),
            "out_path": os.path.join(READINGS_R1_DIR, "r1_1_V_357-12.mp3"),
            "script": SCRIPT_R_SINGLE
        },
        {
            "type": "reading",
            "section": "Bài Đọc 2 (Năm A)",
            "section_label": "Bài đọc hai.",
            "ref": today_row.get("r2_ref"),
            "intro": today_row.get("r2_intro", "").strip(),
            "content": today_row.get("r2_content", "").strip(),
            "out_path": os.path.join(READINGS_R2_DIR, "r2_Rm_828-30.mp3"),
            "script": SCRIPT_R_SINGLE
        },
        {
            "type": "gospel",
            "section": "Tin Mừng (Năm A)",
            "section_label": "",
            "ref": today_row.get("gospel_ref"),
            "intro": today_row.get("gospel_intro", "").strip(),
            "content": today_row.get("gospel_content", "").strip(),
            "out_path": os.path.join(GOSPELS_DIR, "gospel_Mt_1344-52.mp3"),
            "script": SCRIPT_GOSPEL_SINGLE
        }
    ]

    total = len(tasks)
    for idx, t in enumerate(tasks, 1):
        print(f"\n🎙️ [{idx}/{total}] ── {t['section']}: {t['ref']} -> {os.path.relpath(t['out_path'], BASE_DIR)}", flush=True)
        
        if t["type"] == "reading":
            cmd = [
                PYTHON_BIN, t['script'],
                t['ref'],
                t['intro'],
                t['content'],
                t['out_path'],
                t['section_label'],
                "16",
                "false"
            ]
        else:
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
            print(f"✅ [HOÀN THÀNH {idx}/{total}] {t['section']} ({t['ref']}) -> {os.path.relpath(t['out_path'], BASE_DIR)} | Thời gian: {elapsed:.1f}s | Dung lượng: {file_size_kb:.1f} KB", flush=True)
            rebuild_manifest()
        else:
            print(f"❌ [LỖI {idx}/{total}] Thất bại khi tạo file {t['ref']}", flush=True)

        if idx < total:
            print("❄️ Đang nghỉ 5s xả nhiệt GPU/CPU...", flush=True)
            time.sleep(5)

    rebuild_manifest()
    print("\n===============================================================")
    print("🎉 HOÀN THÀNH RENDER TOÀN BỘ BÀI ĐỌC NĂM A (THƯ MỤC TÁCH BIỆT) CHO HÔM NAY!")
    print("===============================================================")

if __name__ == "__main__":
    main()
