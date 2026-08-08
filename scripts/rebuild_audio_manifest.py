import os
import re
import json

PRIVATE_AUDIO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "private", "audio"))
MANIFEST_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "private", "audio", "audioManifest.json"))

def norm(s):
    if not s:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', s).lower()

def rebuild_manifest():
    manifest = {}

    folders_in_order = []
    
    if os.path.exists(PRIVATE_AUDIO_DIR):
        for root, dirs, files in os.walk(PRIVATE_AUDIO_DIR):
            folders_in_order.append(root)

    for folder_path in folders_in_order:
        if not os.path.exists(folder_path):
            continue
        for file in os.listdir(folder_path):
            if file.endswith(".mp3") and not file.startswith("_temp"):
                abs_file_path = os.path.join(folder_path, file)
                rel_url = "/" + os.path.relpath(abs_file_path, PRIVATE_AUDIO_DIR).replace("\\", "/")
                
                base_name = os.path.splitext(file)[0]
                key = norm(base_name)
                manifest[key] = rel_url

    sorted_manifest = dict(sorted(manifest.items()))
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_manifest, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã rebuild private audioManifest.json thành công!")
    print(f"📊 Tổng số key trong manifest: {len(sorted_manifest)}")

if __name__ == "__main__":
    rebuild_manifest()
