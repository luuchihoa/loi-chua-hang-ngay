import os
import sys
import re
import json
import subprocess
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')
try:
    from omnivoice import OmniVoice
except ImportError:
    print("❌ Lỗi: Không thể nạp thư viện OmniVoice. Kiểm tra môi trường venv.")
    sys.exit(1)

REF_FEMALE_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"

def format_r2_filename(r2_ref):
    if not r2_ref:
        return None
    ref = r2_ref.strip()
    ref = re.sub(r"[\.,:;]", "", ref)
    ref = re.sub(r"\s*-\s*", "-", ref)
    ref = re.sub(r"\s+", "_", ref)
    ref = re.sub(r"[\\\/:*?\"<>|()]", "", ref)
    return f"r2_{ref}.mp3"

def clean_scripture_text(text):
    if not text:
        return ""
    # Remove verse numbers like 8, 9, 10, 31b...
    text = re.sub(r'\b\d+[a-z]?\b', '', text)
    text = text.replace("✠", "").replace("“", '"').replace("”", '"')
    text = text.replace("-", " ")
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def split_into_sentences(text):
    raw_sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    return sentences

def convert_wav_to_mp3(wav_path, mp3_path):
    cmd = [
        "ffmpeg", "-y",
        "-i", wav_path,
        "-codec:a", "libmp3lame",
        "-b:a", "96k",
        "-ac", "1",
        mp3_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def main():
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

    print(f"🚀 BẮT ĐẦU TẠO 5 FILE AUDIO BÀI ĐỌC 2 THỬ NGHIỆM...")
    for idx, item in enumerate(selected_items, 1):
        print(f"  [{idx}/5] {item['ref']} -> {item['filename']}")

    print("\n1. Khởi tạo mô hình OmniVoice Studio (Giọng nữ Giang)...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = model.to(device)
    sr = getattr(model, "sampling_rate", 24000)

    pause_samples = int(sr * 0.35)
    silence = torch.zeros((1, pause_samples), dtype=torch.float32)

    generated_files = []

    for item_idx, item in enumerate(selected_items, 1):
        mp3_filename = item['filename']
        mp3_path = os.path.join(output_dir, mp3_filename)
        temp_wav_path = os.path.join(output_dir, f"_temp_{mp3_filename}.wav")

        full_raw = f"{item['intro']} {item['content']} Đó là lời Chúa."
        cleaned = clean_scripture_text(full_raw)
        sentences = split_into_sentences(cleaned)

        print(f"\n───────────────────────────────────────────────────────────────")
        print(f"🎙️ [{item_idx}/5] Đang tạo: {item['ref']} ({len(sentences)} câu)")
        print(f"📁 Tên file MP3: {mp3_filename}")

        audio_chunks = []
        for s_idx, sentence in enumerate(sentences, 1):
            with torch.inference_mode():
                chunk = model.generate(
                    text=sentence,
                    ref_audio=REF_FEMALE_VOICE,
                    num_step=24
                )
            if isinstance(chunk, list):
                chunk = chunk[0]
            if chunk.dim() == 1:
                chunk = chunk.unsqueeze(0)
            
            audio_chunks.append(chunk.cpu())
            audio_chunks.append(silence)

        full_audio = torch.cat(audio_chunks, dim=-1)
        peak = full_audio.abs().max().item()
        if peak > 0:
            full_audio = full_audio / peak * 0.97

        # Save temporary WAV
        torchaudio.save(
            temp_wav_path,
            full_audio.to(torch.float32),
            sr,
            encoding="PCM_S",
            bits_per_sample=16
        )

        # Convert to 96kbps Mono MP3
        convert_wav_to_mp3(temp_wav_path, mp3_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

        file_size_kb = os.path.getsize(mp3_path) / 1024
        print(f"✅ Hoàn tất! File MP3 ({file_size_kb:.1f} KB): {mp3_path}")
        generated_files.append((item['ref'], mp3_filename, mp3_path, file_size_kb))

    print("\n===============================================================")
    print("🎉 HOÀN THÀNH TẠO 5 FILE BÀI ĐỌC 2 THỬ NGHIỆM!")
    print("===============================================================")
    for g in generated_files:
        print(f"  • {g[0]} -> {g[1]} ({g[3]:.1f} KB)")

if __name__ == "__main__":
    main()
