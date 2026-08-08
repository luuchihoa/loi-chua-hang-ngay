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

REF_MALE_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_trieu duong -deep, calm and resonant.mp3"

# Cấu hình chuẩn ngắt nghỉ Phụng vụ & Hạ nhiệt
CONFIG = {
    "paragraph_break_sec": 0.60,
    "sentence_break_sec": 0.45,
    "major_break_sec": 0.30,
    "medium_break_sec": 0.25,
    "thermal_file_cool_down_sec": 5.0,
    "process_isolation": True
}

def perfect_scripture_cleaner(text):
    if not text:
        return ""

    # 1. Bỏ ký tự thập tự ✠ và chuẩn hóa ngoặc kép
    text = text.replace("✠", "").replace("“", '"').replace("”", '"')

    # 2. Xóa các chỉ số câu dạng superscript: ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁰
    for s in "¹²³⁴⁵⁶⁷⁸⁹⁰":
        text = text.replace(s, "")

    v_chars = "a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵĐđ"
    vowels = "aáảãạâầấẩẫậăằắẳẵặeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ"

    # 3. GIỮ NGUYÊN DẤU CHẤM CÂU (. ! ?), chỉ xóa chữ số câu (ví dụ: ".5 Con" -> ". Con", ".”7 Vua" -> ".” Vua")
    text = re.sub(r'(?<=[.!?\"\'\)\],;\s])\d+[a-z]?(?=\s|[' + v_chars + r'])', '', text)
    text = re.sub(r'^\d+[a-z]?\s*', '', text)

    # Thay CHỈ chữ 'i' / 'I' đứng riêng lẻ thành 'y' / 'Y' (dùng Unicode-aware boundary v_chars)
    text = re.sub(r'(^|[^' + v_chars + r'])I(?=[^' + v_chars + r']|$)', r'\1Y', text)
    text = re.sub(r'(^|[^' + v_chars + r'])i(?=[^' + v_chars + r']|$)', r'\1y', text)

    # 4. Viết hoa từ/âm tiết đầu tiên đứng ngay sau dấu gạch nối '-' và thay gạch nối bằng khoảng trắng
    def capitalize_after_hyphen(match):
        parts = match.group(0).split('-')
        result = [parts[0]]
        for p in parts[1:]:
            if p:
                result.append(p[0].upper() + p[1:])
        return ' '.join(result)

    pattern_hyphen = r'\b[' + v_chars + r']+(?:-[' + v_chars + r']+)+\b'
    text = re.sub(pattern_hyphen, capitalize_after_hyphen, text)

    concatenated_names = [
        (r'\bGiuđa\b', 'Du Đa'),
        (r'\bGiuse\b', 'Du Se'),
        (r'\bGiêsu\b', 'Dê Su'),
        (r'\bHêrôđê\b', 'Hê Rô Đê'),
        (r'\bNicôđêmô\b', 'Ni Cô Đê Mô'),
        (r'\bBêtêsơđa\b', 'Bê Tê Sơ Đa'),
        (r'\bXađốc\b', 'Xa Đốc'),
        (r'\bGiuđêa\b', 'Du Đê A'),
        (r'\bGiacôbê\b', 'Dia Cơ Bê'),
        (r'\bGiacóp\b', 'Dia Cóp'),
        (r'\bGiêrusalem\b', 'Dê Ru Sa Lem'),
        (r'\bĐavít\b', 'Đa Vít'),
        (r'\bSalômôn\b', 'Sa Lô Môn'),
        (r'\bMôsê\b', 'Mô Sê'),
        (r'\bAbraham\b', 'A Bra Ham'),
        (r'\bNazarét\b', 'Na Za Rét'),
        (r'\bA-men\b|\bA men\b|\bAmen\b', 'A Meng'),
    ]
    for pattern, repl in concatenated_names:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)

    # 5. Chuyển 'gi' -> 'd' và 'Gi' -> 'D'
    text = re.sub(r'\bgiê', 'diê', text)
    text = re.sub(r'\bgiế', 'diế', text)
    text = re.sub(r'\bgiề', 'diề', text)
    text = re.sub(r'\bgiể', 'diể', text)
    text = re.sub(r'\bgiễ', 'diễ', text)
    text = re.sub(r'\bgiệ', 'diệ', text)
    text = re.sub(r'\bGiê', 'Dê', text)
    text = re.sub(r'\bGiế', 'Diế', text)

    text = re.sub(r'\bgi(?=[' + vowels + r'])', 'd', text)
    text = re.sub(r'\bGi(?=[' + vowels + r'])', 'D', text)

    text = re.sub(r'\bgì\b', 'dì', text)
    text = re.sub(r'\bGì\b', 'Dì', text)
    text = re.sub(r'\bgìn\b', 'dìn', text)

    # Xóa khoảng trắng thừa đứng trước dấu câu (rằng : -> rằng:, tôi ! -> tôi!)
    text = re.sub(r'\s+([.:;!?,])', r'\1', text)

    # Chuẩn hóa khoảng trắng sau các dấu câu , ; :
    text = re.sub(r',([^\s])', r', \1', text)
    text = re.sub(r';([^\s])', r'; \1', text)
    text = re.sub(r':([^\s])', r': \1', text)

    # Thu gọn khoảng trắng ngang (giữ \n)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    return '\n'.join(line for line in lines if line)

def trim_silence(tensor, threshold=0.005):
    # Cắt bỏ khoảng lặng dư thừa mà AI tự tạo ở đầu và đuôi audio chunk
    abs_t = tensor.abs().squeeze(0)
    mask = abs_t > threshold
    if not mask.any():
        return tensor
    start = torch.where(mask)[0][0]
    end = torch.where(mask)[0][-1]
    return tensor[:, start:end+1]

def parse_scripture_chunks(text):
    if not text:
        return []

    lines = text.split('\n')
    parsed_items = []

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue

        # Tách câu ở dấu chấm, dấu cảm, dấu hỏi (kể cả khi đứng trước dấu ngoặc đóng ", ', ), ])
        raw_sentences = re.split(r'(?<=[.!?])\s+|(?<=[.!?][\"\'\)\]])\s+', line_str)
        sentences = [s.strip() for s in raw_sentences if s.strip()]

        for s_idx, sentence in enumerate(sentences):
            is_last_in_line = (s_idx == len(sentences) - 1)
            
            # Tách vế câu ở dấu phẩy (,), dấu chấm phẩy (;), dấu hai chấm (:) và dấu gạch ngang (—)
            clauses = re.split(r'(?<=[,;:—])\s+', sentence)
            clauses = [c.strip() for c in clauses if c.strip()]
            
            for c_idx, clause in enumerate(clauses):
                is_last_clause = (c_idx == len(clauses) - 1)
                
                if is_last_clause:
                    pause_sec = CONFIG["paragraph_break_sec"] if is_last_in_line else CONFIG["sentence_break_sec"]
                else:
                    if clause.endswith(';') or clause.endswith(':'):
                        pause_sec = CONFIG["major_break_sec"]
                    else:
                        pause_sec = CONFIG["medium_break_sec"]
                        
                parsed_items.append((clause, pause_sec))

    return parsed_items

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

def generate_single_gospel(ref_name, intro, content, output_mp3_path, num_step=16, use_cpu=False, overwrite=False, custom_voice_path=None, paragraph_break=0.60, sentence_break=0.45, major_break=0.30, medium_break=0.25):
    # Cập nhật thông số ngắt nghỉ ngắt câu tùy chỉnh
    CONFIG["paragraph_break_sec"] = float(paragraph_break)
    CONFIG["sentence_break_sec"] = float(sentence_break)
    CONFIG["major_break_sec"] = float(major_break)
    CONFIG["medium_break_sec"] = float(medium_break)

    # Chọn giọng mẫu: custom nếu có, mặc định giọng Nam Triều Dương
    voice_path = custom_voice_path if (custom_voice_path and os.path.exists(custom_voice_path)) else REF_MALE_VOICE
    voice_label = os.path.basename(voice_path)

    # Cơ chế kiểm tra bỏ qua nếu file audio đã tồn tại sẵn
    if os.path.exists(output_mp3_path) and not overwrite:
        size_kb = os.path.getsize(output_mp3_path) / 1024
        print(f"⏩ [BỎ QUA RENDER] File audio đã có sẵn ({size_kb:.1f} KB): {output_mp3_path}", flush=True)
        return

    temp_wav_path = output_mp3_path.replace(".mp3", "_temp.wav")
    
    clean_intro = intro.replace("✠", "").strip() if intro else ""
    raw_combined = f"{clean_intro}\n{content}"
    clean_combined = perfect_scripture_cleaner(raw_combined)
    parsed_items = parse_scripture_chunks(clean_combined)

    device_str = "CPU (Mát máy)" if use_cpu else "MPS/GPU (Tối ưu step=16)"
    print(f"🎙️ Xử lý [{device_str}]: {ref_name} ({len(parsed_items)} cụm câu) | Giọng: {voice_label}", flush=True)

    if not os.path.exists(voice_path):
        print(f"❌ Lỗi: Không tìm thấy file giọng mẫu tại: {voice_path}", flush=True)
        sys.exit(1)

    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    if use_cpu:
        torch.set_num_threads(4)
        device = "cpu"
    else:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        
    model = model.to(device)
    sr = getattr(model, "sampling_rate", 24000)

    audio_chunks = []
    for idx, (seg_text, pause_sec) in enumerate(parsed_items, 1):
        clean_prompt_text = seg_text.rstrip(',;:—').strip() or seg_text
        with torch.inference_mode():
            chunk = model.generate(
                text=clean_prompt_text,
                ref_audio=voice_path,
                num_step=num_step
            )
        if isinstance(chunk, list):
            chunk = chunk[0]
        if chunk.dim() == 1:
            chunk = chunk.unsqueeze(0)
            
        # Cắt sạch khoảng lặng tự sinh thừa ở đầu và cuối trước khi chèn thời gian pause chính xác
        trimmed_chunk = trim_silence(chunk)
        audio_chunks.append(trimmed_chunk.cpu())
        
        pause_samples = int(sr * pause_sec)
        silence = torch.zeros((1, pause_samples), dtype=torch.float32)
        audio_chunks.append(silence)

        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
        gc.collect()
        time.sleep(0.6)

    full_audio = torch.cat(audio_chunks, dim=-1)
    peak = full_audio.abs().max().item()
    if peak > 0:
        full_audio = full_audio / peak * 0.97

    os.makedirs(os.path.dirname(output_mp3_path), exist_ok=True)
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
    print(f"✅ Đã tạo xong MP3 ({size_kb:.1f} KB): {output_mp3_path}", flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python generate_single_gospel_mp3.py <ref> <intro> <content> <out_path> [num_step] [use_cpu] [overwrite] [custom_voice_path] [paragraph_break] [sentence_break] [major_break] [medium_break]")
        sys.exit(1)
    
    ref = sys.argv[1]
    intro = sys.argv[2]
    content = sys.argv[3]
    out_path = sys.argv[4]
    step = int(sys.argv[5]) if len(sys.argv) > 5 else 16
    use_cpu = sys.argv[6].lower() == "true" if len(sys.argv) > 6 else False
    overwrite = sys.argv[7].lower() == "true" if len(sys.argv) > 7 else False
    custom_voice = sys.argv[8] if len(sys.argv) > 8 and sys.argv[8].strip() else None
    paragraph_break = float(sys.argv[9]) if len(sys.argv) > 9 else 0.60
    sentence_break = float(sys.argv[10]) if len(sys.argv) > 10 else 0.45
    major_break = float(sys.argv[11]) if len(sys.argv) > 11 else 0.30
    medium_break = float(sys.argv[12]) if len(sys.argv) > 12 else 0.25
    
    generate_single_gospel(ref, intro, content, out_path, num_step=step, use_cpu=use_cpu, overwrite=overwrite, custom_voice_path=custom_voice, paragraph_break=paragraph_break, sentence_break=sentence_break, major_break=major_break, medium_break=medium_break)
