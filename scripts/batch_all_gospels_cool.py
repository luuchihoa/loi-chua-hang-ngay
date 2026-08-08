import os
import sys
import re
import json
import time
import subprocess

PYTHON_BIN = "/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python"
SCRIPT_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_gospel_mp3.py"
SCRIPT_MANIFEST = "/Users/tranthithuynhi/my-react-app/scripts/rebuild_audio_manifest.py"

def format_gospel_filename(ref_str):
    if not ref_str:
        return None
    clean = re.sub(r'[\\\/:*?"<>|()]', '', ref_str.strip())
    clean = re.sub(r'[\.,]', '', clean)
    clean = re.sub(r'\s+', '_', clean)
    clean = re.sub(r'_+', '_', clean)
    if not clean:
        return None
    return f"gospel_{clean}.mp3"

def rebuild_manifest():
    try:
        subprocess.run(["python3", SCRIPT_MANIFEST], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        pass

def main():
    use_cpu = "--cpu" in sys.argv
    
    # Optional limit argument: e.g. python batch_all_gospels_cool.py --limit 5
    limit = None
    if "--limit" in sys.argv:
        try:
            limit_idx = sys.argv.index("--limit") + 1
            limit = int(sys.argv[limit_idx])
        except (ValueError, IndexError):
            limit = None

    step = 16  # 16 steps for optimal thermal & audio quality balance

    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    output_dir = os.path.join(base_dir, "public", "audio", "gospels")
    os.makedirs(output_dir, exist_ok=True)

    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    # Gather all unique Gospel items
    gospel_items = []
    seen_refs = set()
    for r in rows:
        ref = r.get("gospel_ref")
        content = r.get("gospel_content")
        if ref and content and len(content.strip()) > 10:
            filename = format_gospel_filename(ref)
            if filename not in seen_refs:
                seen_refs.add(filename)
                gospel_items.append({
                    "ref": ref,
                    "filename": filename,
                    "intro": r.get("gospel_intro", "").strip(),
                    "content": content.strip()
                })

    if limit and limit > 0:
        gospel_items = gospel_items[:limit]

    total = len(gospel_items)
    mode_str = "CPU Mode (Siêu mát)" if use_cpu else "GPU MPS Mode (Đã tối ưu 16 step & nghỉ giữa câu)"
    print("===============================================================", flush=True)
    print(f"🔥 CẤU HÌNH HẠ NHIỆT MÁY (GIỌNG NAM TRIỀU DƯƠNG): {mode_str}", flush=True)
    print(f"📦 BẮT ĐẦU RENDER BÀI ĐỌC TIN MỪNG (Tổng cộng: {total} bài)", flush=True)
    print("===============================================================", flush=True)

    success_count = 0
    fail_count = 0

    for idx, item in enumerate(gospel_items, 1):
        mp3_path = os.path.join(output_dir, item['filename'])
        
        # IN LOG REALTIME NGAY KHI BẮT ĐẦU
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
            
            # IN LOG REALTIME NGAY LẬP TỨC KHI HOÀN THÀNH
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
    print(f"🎉 HOÀN THÀNH RENDER BÀI ĐỌC TIN MỪNG!", flush=True)
    print(f"✅ Thành công: {success_count}/{total} file", flush=True)
    print(f"🔄 Đã tự động đồng bộ audioManifest.json cho toàn bộ ứng dụng!", flush=True)
    if fail_count > 0:
        print(f"⚠️ Thất bại: {fail_count} file", flush=True)
    print("===============================================================", flush=True)

if __name__ == "__main__":
    main()
