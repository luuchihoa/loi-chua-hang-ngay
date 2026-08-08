import os
import sys
import re
import json
import time
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
        pass

def main():
    use_cpu = "--cpu" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        try:
            limit_idx = sys.argv.index("--limit") + 1
            limit = int(sys.argv[limit_idx])
        except (ValueError, IndexError):
            limit = None

    step = 16

    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    os.makedirs(READINGS_DIR, exist_ok=True)

    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    # Filter all 184 Reading 2 rows
    r2_rows = [r for r in rows if r.get("r2_ref") and r.get("r2_content") and len(r.get("r2_content", "").strip()) > 10]

    all_target_items = []
    seen = set()
    for r in r2_rows:
        ref = r.get("r2_ref").strip()
        fname = format_unified_reading_filename(ref)
        if fname and fname not in seen:
            seen.add(fname)
            all_target_items.append({
                "ref": ref,
                "filename": fname,
                "intro": r.get("r2_intro", "").strip(),
                "content": r.get("r2_content", "").strip()
            })

    # Filter missing items
    missing_items = []
    for item in all_target_items:
        fpath = os.path.join(READINGS_DIR, item["filename"])
        if not os.path.exists(fpath) or os.path.getsize(fpath) < 10 * 1024:
            missing_items.append(item)

    if limit and limit > 0:
        missing_items = missing_items[:limit]

    total = len(missing_items)
    mode_str = "CPU Mode (Siêu mát)" if use_cpu else "GPU MPS Mode (Đã tối ưu 16 step & nghỉ giữa câu)"
    print("===============================================================", flush=True)
    print(f"🔥 CẤU HÌNH HẠ NHIỆT MÁY: {mode_str}", flush=True)
    print(f"📦 BẮT ĐẦU RENDER BÀI ĐỌC 2 TOÀN BỘ CSDL SUPABASE ({total} bài còn thiếu)", flush=True)
    print("===============================================================", flush=True)

    success_count = 0
    fail_count = 0

    for idx, item in enumerate(missing_items, 1):
        mp3_path = os.path.join(READINGS_DIR, item['filename'])
        
        print(f"\n🎙️ [BÀI {idx}/{total}] ── Bắt đầu render: {item['ref']} -> {item['filename']}", flush=True)
        
        cmd = [
            PYTHON_BIN, SCRIPT_SINGLE,
            item['ref'],
            item['intro'],
            item['content'],
            mp3_path,
            str(step),
            "true" if use_cpu else "false"
        ]
        
        start_time = time.time()
        res = subprocess.run(cmd)
        elapsed = time.time() - start_time

        if res.returncode == 0:
            success_count += 1
            file_size_kb = os.path.getsize(mp3_path) / 1024 if os.path.exists(mp3_path) else 0
            print(f"✅ [HOÀN THÀNH {idx}/{total}] {item['ref']} -> {item['filename']} | Thời gian: {elapsed:.1f}s | Dung lượng: {file_size_kb:.1f} KB", flush=True)
            rebuild_manifest()
        else:
            fail_count += 1
            print(f"❌ [LỖI {idx}/{total}] Thất bại khi tạo file {item['ref']}", flush=True)
        
        if idx < total:
            cool_time = 3 if use_cpu else 5
            print(f"❄️ Đang nghỉ {cool_time}s xả nhiệt GPU/CPU...", flush=True)
            time.sleep(cool_time)

    rebuild_manifest()

    print("\n===============================================================", flush=True)
    print(f"🎉 HOÀN THÀNH RENDER BÀI ĐỌC 2 TOÀN BỘ CSDL SUPABASE!", flush=True)
    print(f"✅ Thành công: {success_count}/{total} file", flush=True)
    print(f"🔄 Đã tự động đồng bộ audioManifest.json cho toàn bộ ứng dụng!", flush=True)
    if fail_count > 0:
        print(f"⚠️ Thất bại: {fail_count} file", flush=True)
    print("===============================================================", flush=True)

if __name__ == "__main__":
    main()
