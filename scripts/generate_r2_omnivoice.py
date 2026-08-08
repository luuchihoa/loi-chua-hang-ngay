import os
import sys
import re
import json
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')
try:
    from omnivoice import OmniVoice
except ImportError:
    print("❌ Lỗi: Không thể nạp thư viện OmniVoice. Kiểm tra môi trường venv.")
    sys.exit(1)

# File mẫu giọng nữ miền Bắc (Giang - Northern Female Narrator)
REF_FEMALE_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"

def clean_scripture(text):
    if not text:
        return ""
    # Xóa số câu chỉ dẫn (ví dụ: 8, 9, 10...)
    text = re.sub(r'\b\d+\b', '', text)
    # Xóa các ký tự thừa
    text = text.replace("✠", "").replace("“", '"').replace("”", '"').replace(":", ",")
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "r2_female_voice_giang.wav")

    # Lấy nội dung Bài đọc 2 chuẩn
    r2_intro = "Bài trích thư của thánh Phao-lô tông đồ gửi tín hữu Rô-ma."
    r2_raw = ("Thưa anh em, Kinh Thánh nói gì? Thưa: Lời Thiên Chúa ở gần bạn, ngay trên miệng, ngay trong lòng. "
              "Lời đó chính là lời chúng tôi rao giảng để khơi dậy đức tin. "
              "Nếu miệng bạn tuyên xưng Đức Giê-su là Chúa, và lòng bạn tin rằng Thiên Chúa đã làm cho Người sống lại từ cõi chết, "
              "thì bạn sẽ được cứu độ. Quả thế, có tin trong lòng, mới được trở nên công chính; "
              "có tuyên xưng ngoài miệng, mới được hưởng ơn cứu độ.")
    
    full_text = clean_scripture(f"{r2_intro} {r2_raw} Đó là lời Chúa.")
    
    print("--------------------------------------------------")
    print("🎙️ BÀI ĐỌC 2 - GIỌNG NỮ MIỀN BẮC (VOICE GIANG)")
    print(f"📄 Nội dung ({len(full_text)} ký tự):\n{full_text}")
    print("--------------------------------------------------")

    if not os.path.exists(REF_FEMALE_VOICE):
        print(f"❌ Không tìm thấy file mẫu giọng tại: {REF_FEMALE_VOICE}")
        sys.exit(1)

    print("1. Khởi tạo mô hình OmniVoice Studio...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = model.to(device)

    print("2. Khởi tạo Whisper ASR model...")
    model.load_asr_model("openai/whisper-large-v3-turbo")

    print(f"3. Nạp Prompt giọng nữ từ:\n   {REF_FEMALE_VOICE}")
    prompt = model.create_voice_clone_prompt(REF_FEMALE_VOICE)

    print("4. Tiến hành sinh audio Bài đọc 2...")
    with torch.inference_mode():
        audio_waveform = model.generate(
            text=full_text,
            prompt=prompt,
            audio_chunk_duration=15,
            audio_chunk_threshold=20,
        )

    if isinstance(audio_waveform, list):
        if len(audio_waveform) > 0 and isinstance(audio_waveform[0], torch.Tensor):
            audio_waveform = torch.cat(audio_waveform, dim=-1)
        else:
            audio_waveform = torch.tensor(audio_waveform)

    if audio_waveform.dim() == 1:
        audio_waveform = audio_waveform.unsqueeze(0)

    torchaudio.save(output_file, audio_waveform.cpu(), model.sampling_rate)
    print(f"\n✅ ĐÃ TẠO THÀNH CÔNG AUDIO BÀI ĐỌC 2 GIỌNG NỮ!")
    print(f"📁 Lưu tại: {output_file}")

if __name__ == "__main__":
    main()
