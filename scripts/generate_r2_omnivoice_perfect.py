import os
import sys
import re
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')
from omnivoice import OmniVoice

REF_FEMALE_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"

def clean_and_normalize_vietnamese(text):
    """Chuẩn hóa văn bản Tiếng Việt Phụng Vụ để OmniVoice đọc mượt nhất"""
    text = re.sub(r'\b\d+\b', '', text)  # Xóa số câu
    text = text.replace("✠", "").replace("“", '"').replace("”", '"')
    # Thay thế các gạch nối tên riêng bằng khoảng trắng mềm để tránh sượng
    text = text.replace("-", " ")
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def split_into_sentences(text):
    """Tách câu thông minh theo ranh giới dấu chấm, hỏi, cảm để AI đọc từng câu tròn vành rõ chữ"""
    raw_sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    return sentences

def generate_perfect_omnivoice_reading():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "r2_female_voice_giang_perfect.wav")

    r2_intro = "Bài trích thư của thánh Phao lô tông đồ gửi tín hữu Rô ma."
    r2_body = ("Thưa anh em, Kinh Thánh nói gì? Thưa: Lời Thiên Chúa ở gần bạn, ngay trên miệng, ngay trong lòng. "
               "Lời đó chính là lời chúng tôi rao giảng để khơi dậy đức tin. "
               "Nếu miệng bạn tuyên xưng Đức Giê su là Chúa, và lòng bạn tin rằng Thiên Chúa đã làm cho Người sống lại từ cõi chết, "
               "thì bạn sẽ được cứu độ. Quả thế, có tin trong lòng, mới được trở nên công chính; "
               "có tuyên xưng ngoài miệng, mới được hưởng ơn cứu độ.")
    r2_outro = "Đó là lời Chúa."

    full_text = clean_and_normalize_vietnamese(f"{r2_intro} {r2_body} {r2_outro}")
    sentences = split_into_sentences(full_text)

    print("---------------------------------------------------------------")
    print("🎙️ OMNIVOICE STUDIO PRO PIPELINE (NUM_STEP=24 + PEAK NORMALIZATION)")
    print(f"📄 Số câu cần sinh: {len(sentences)} câu")
    for i, s in enumerate(sentences, 1):
        print(f"  [{i}] {s}")
    print("---------------------------------------------------------------")

    print("1. Khởi tạo mô hình OmniVoice Studio...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = model.to(device)

    print(f"2. Nạp giọng mẫu chuẩn từ:\n   {REF_FEMALE_VOICE}")
    
    sr = getattr(model, "sampling_rate", 24000)
    audio_chunks = []
    
    # Tạo đoạn khoảng lặng 0.3s giữa các câu
    pause_samples = int(sr * 0.35)
    silence = torch.zeros((1, pause_samples), dtype=torch.float32)

    print("3. Tiến hành sinh từng câu với num_step=24...")
    for idx, sentence in enumerate(sentences, 1):
        print(f"   ► Đang sinh câu [{idx}/{len(sentences)}]: {sentence[:30]}...")
        with torch.inference_mode():
            chunk = model.generate(
                text=sentence,
                ref_audio=REF_FEMALE_VOICE,
                num_step=24  # Tăng số bước khuếch tán để âm thanh mịn và rõ tiếng
            )
        
        if isinstance(chunk, list):
            chunk = chunk[0]
        if chunk.dim() == 1:
            chunk = chunk.unsqueeze(0)
            
        audio_chunks.append(chunk.cpu())
        audio_chunks.append(silence)

    # Ghép tất cả các câu lại thành bài hoàn chỉnh
    full_audio = torch.cat(audio_chunks, dim=-1)

    # 4. Chuẩn hóa Peak Headroom Clipping (Tránh xé tiếng / vỡ âm)
    peak = full_audio.abs().max().item()
    print(f"4. Audio Peak Max: {peak:.4f}")
    if peak > 0:
        full_audio = full_audio / peak * 0.97

    # 5. Lưu chuẩn 16-bit PCM WAV
    torchaudio.save(
        output_file,
        full_audio.to(torch.float32),
        sr,
        encoding="PCM_S",
        bits_per_sample=16
    )
    print(f"\n✅ ĐÃ XUẤT THÀNH CÔNG AUDIO BÀI ĐỌC 2 CHUẨN OMNIVOICE STUDIO PRO!")
    print(f"📁 Đường dẫn file: {output_file}")

if __name__ == "__main__":
    generate_perfect_omnivoice_reading()
