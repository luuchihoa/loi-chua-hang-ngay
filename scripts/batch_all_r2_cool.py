import os
import sys
import re
import json
import time
import subprocess

PYTHON_BIN = "/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python"
SCRIPT_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_r2_mp3.py"
SCRIPT_MANIFEST = "/Users/tranthithuynhi/my-react-app/scripts/rebuild_audio_manifest.py"

# Danh sách file vừa render gần đây đã theo đúng tên cũ
RECENT_SKIPPED_FILES = {
    "r2_Rm_108-13.mp3",
    "r2_1_Pr_318-22.mp3",
    "r2_Rm_512-19.mp3",
    "r2_Pl_317_-_41.mp3",
    "r2_Pl_317-41.mp3",
    "r2_Rm_831b-34.mp3",
    "r2_2_Cr_520_-_62.mp3",
    "r2_2_Cr_520-62.mp3",
    "r2_Tt_211-14_;_34-7.mp3",
    "r2_Tt_211-14_34-7.mp3"
}

def format_r2_filename(r2_ref):
    """Quy chuẩn đặt tên file khớp 100% với mã nguồn cũ trong hệ thống"""
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
    use_cpu = "--cpu" in sys.argv
    step = 16  # 16 steps for optimal thermal & audio quality balance

    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)

    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    # Lọc danh sách bài đọc cần render
    to_render_items = []
    seen_refs = set()
    for r in rows:
        ref = r.get("r2_ref")
        content = r.get("r2_content")
        if ref and content and len(content.strip()) > 10:
            filename = format_r2_filename(ref)
            if filename not in seen_refs:
                seen_refs.add(filename)
                if filename in RECENT_SKIPPED_FILES:
                    continue
                to_render_items.append({
                    "ref": ref,
                    "filename": filename,
                    "intro": r.get("r2_intro", "").strip(),
                    "content": content.strip()
                })

    total = len(to_render_items)
    mode_str = "CPU Mode (Siêu mát)" if use_cpu else "GPU MPS Mode (Đã tối ưu 16 step & nghỉ giữa câu)"
    print("===============================================================")
    print(f"🔥 CẤU HÌNH HẠ NHIỆT MÁY: {mode_str}")
    print(f"📦 QUY CHUẨN TÊN FILE CŨ (Khớp 100% hệ thống): {total} Bài Đọc 2")
    print("===============================================================")

    success_count = 0
    fail_count = 0

    for idx, item in enumerate(to_render_items, 1):
        mp3_path = os.path.join(output_dir, item['filename'])
        print(f"\n🎙️ [BÀI {idx}/{total}] ── Bắt đầu render: {item['ref']} -> {item['filename']}")
        
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
            print(f"✅ [HOÀN THÀNH {idx}/{total}] {item['ref']} -> {item['filename']} | Thời gian: {elapsed:.1f}s | Dung lượng: {file_size_kb:.1f} KB")
            
            rebuild_manifest()
        else:
            fail_count += 1
            print(f"❌ [LỖI {idx}/{total}] Thất bại khi tạo file {item['ref']}")
        
        if idx < total:
            cool_time = 3 if use_cpu else 5
            print(f"❄️ Đang nghỉ {cool_time}s xả nhiệt GPU/CPU...")
            time.sleep(cool_time)

    rebuild_manifest()

    print("\n===============================================================")
    print(f"🎉 HOÀN THÀNH RENDER TOÀN BỘ BÀI ĐỌC 2 THEO TÊN FILE CŨ!")
    print(f"✅ Thành công: {success_count}/{total} file")
    print(f"🔄 Đã tự động đồng bộ audioManifest.json cho toàn bộ ứng dụng!")
    if fail_count > 0:
        print(f"⚠️ Thất bại: {fail_count} file")
    print("===============================================================")

if __name__ == "__main__":
    main()
