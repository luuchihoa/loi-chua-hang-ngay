import os
import sys
import re
import json
import time
import subprocess

PYTHON_BIN = "/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python"
SCRIPT_SINGLE = "/Users/tranthithuynhi/my-react-app/scripts/generate_single_r2_mp3.py"

def format_r2_filename(r2_ref):
    if not r2_ref:
        return None
    ref = r2_ref.strip()
    ref = re.sub(r"[\.,:;]", "", ref)
    ref = re.sub(r"\s*-\s*", "-", ref)
    ref = re.sub(r"\s+", "_", ref)
    ref = re.sub(r"[\\\/:*?\"<>|()]", "", ref)
    return f"r2_{ref}.mp3"

def main():
    use_cpu = "--cpu" in sys.argv
    step = 16  # Giảm xuống 16 bước để máy mát hơn 33%

    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)

    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    # Pick first 5 unique Reading 2 items
    selected_items = []
    seen_refs = set()
    for r in rows:
        ref = r.get("r2_ref")
        content = r.get("r2_content")
        if ref and content and len(content.strip()) > 10:
            filename = format_r2_filename(ref)
            if filename not in seen_refs:
                seen_refs.add(filename)
                selected_items.append({
                    "ref": ref,
                    "filename": filename,
                    "intro": r.get("r2_intro", "").strip(),
                    "content": content.strip()
                })
                if len(selected_items) == 5:
                    break

    mode_str = "CPU Mode (Siêu mát)" if use_cpu else "GPU MPS Mode (Đã tối ưu 16 step & nghỉ giữa câu)"
    print("===============================================================")
    print(f"🔥 CẤU HÌNH HẠ NHIỆT MÁY: {mode_str}")
    print("===============================================================")

    for idx, item in enumerate(selected_items, 1):
        mp3_path = os.path.join(output_dir, item['filename'])
        print(f"\n[FILE {idx}/5] ── Tiến hành sinh {item['ref']} -> {item['filename']}")
        
        cmd = [
            PYTHON_BIN, SCRIPT_SINGLE,
            item['ref'],
            item['intro'],
            item['content'],
            mp3_path,
            str(step),
            "true" if use_cpu else "false"
        ]
        
        res = subprocess.run(cmd)
        if res.returncode != 0:
            print(f"⚠️ Lỗi khi tạo file {item['ref']}")
        
        if idx < len(selected_items):
            cool_time = 3 if use_cpu else 6
            print(f"❄️ Đang tạm nghỉ {cool_time} giây để GPU & CPU xả toàn bộ nhiệt...")
            time.sleep(cool_time)

    print("\n🎉 ĐÃ HOÀN THÀNH 5 FILE THỬ NGHIỆM VỚI CẤU HÌNH MÁT MÁY!")

if __name__ == "__main__":
    main()
