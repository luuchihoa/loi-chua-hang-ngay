import os
import sys
import re
import json
import gc
import time
import subprocess
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')
from omnivoice import OmniVoice

REF_FEMALE_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"

def format_reading_filename(ref_str):
    if not ref_str:
        return None
    ref = ref_str.strip()
    ref = re.sub(r"[\.,:;()\\/*?\"<>|]", "", ref)
    ref = re.sub(r"\s*-\s*", "-", ref)
    ref = re.sub(r"\s+", "_", ref)
    ref = re.sub(r"_+", "_", ref)
    if not ref:
        return None
    return f"r_{ref}.mp3"

def perfect_scripture_cleaner(text):
    if not text:
        return ""

    # 1. Bỏ ký tự thập tự ✠ và ngoặc kép đặc biệt
    text = text.replace("✠", "").replace("“", '"').replace("”", '"')

    # 2. Xóa chỉ số câu dạng superscript: ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁰
    for s in "¹²³⁴⁵⁶⁷⁸⁹⁰":
        text = text.replace(s, "")

    # 3. Xóa số câu ở đầu dòng, đầu câu hoặc dính sau ngoặc kép / dấu câu / khoảng trắng
    text = re.sub(r'(?:^|[\n\s.!?\"\'\)\],;])\d+[a-z]?(?=[\sA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴa-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])', ' ', text)

    # 4. Xóa số câu đứng riêng lẻ hoặc kèm ký tự a-z
    text = re.sub(r'(?<=\s)\d+[a-z]?(?=[\s.,!?\"\'\)])', ' ', text)

    # 5. Xóa các số câu dạng word boundary
    text = re.sub(r'\b\d+[a-z]?\b', ' ', text)

    # 6. Chuẩn hóa khoảng trắng và gạch ngang
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

def generate_single_file(ref_name, intro, content, output_mp3_path, num_step=16, use_cpu=False, section_label=""):
    temp_wav_path = output_mp3_path.replace(".mp3", "_temp.wav")
    
    prefix_str = f"{section_label.strip()} " if section_label and section_label.strip() else ""
    full_text = perfect_scripture_cleaner(f"{prefix_str}{intro} {content}")
    sentences = split_into_sentences(full_text)

    device_str = "CPU (Mát máy)" if use_cpu else "MPS/GPU (Tối ưu step=16)"
    print(f"🎙️ Xử lý [{device_str}]: {ref_name} ({len(sentences)} câu)")

    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    if use_cpu:
        torch.set_num_threads(4)
        device = "cpu"
    else:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        
    model = model.to(device)
    sr = getattr(model, "sampling_rate", 24000)

    pause_samples = int(sr * 0.35)
    silence = torch.zeros((1, pause_samples), dtype=torch.float32)

    audio_chunks = []
    for idx, sentence in enumerate(sentences, 1):
        with torch.inference_mode():
            chunk = model.generate(
                text=sentence,
                ref_audio=REF_FEMALE_VOICE,
                num_step=num_step
            )
        if isinstance(chunk, list):
            chunk = chunk[0]
        if chunk.dim() == 1:
            chunk = chunk.unsqueeze(0)
            
        audio_chunks.append(chunk.cpu())
        audio_chunks.append(silence)

        time.sleep(0.5)

    full_audio = torch.cat(audio_chunks, dim=-1)
    peak = full_audio.abs().max().item()
    if peak > 0:
        full_audio = full_audio / peak * 0.97

    torchaudio.save(
        temp_wav_path,
        full_audio.to(torch.float32),
        sr,
        encoding="PCM_S",
        bits_per_sample=16
    )

    convert_wav_to_mp3(temp_wav_path, output_mp3_path)
    if os.path.exists(temp_wav_path):
        os.remove(temp_wav_path)

    del model, full_audio, audio_chunks
    gc.collect()
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()

    size_kb = os.path.getsize(output_mp3_path) / 1024
    print(f"✅ Hoàn thành: {output_mp3_path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python generate_single_r2_mp3.py <ref> <intro> <content> <out_path> [num_step] [use_cpu] [section_label]")
        sys.exit(1)
    
    ref = sys.argv[1]
    intro = sys.argv[2]
    content = sys.argv[3]
    out_path = sys.argv[4]
    step = int(sys.argv[5]) if len(sys.argv) > 5 else 16
    use_cpu = sys.argv[6].lower() == "true" if len(sys.argv) > 6 else False
    section_label = sys.argv[7] if len(sys.argv) > 7 else ""
    
    generate_single_file(ref, intro, content, out_path, num_step=step, use_cpu=use_cpu, section_label=section_label)
