import os
import sys
import re
import json
import torch
import torchaudio

# OmniVoice Studio Import
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')
try:
    from omnivoice import OmniVoice
except ImportError:
    print("❌ Lỗi: Không thể load thư viện OmniVoice. Vui lòng kiểm tra môi trường virtualenv.")
    sys.exit(1)

DEFAULT_REF_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"

def clean_scripture(text):
    if not text:
        return ""
    text = re.sub(r'\b\d+\b', '', text)  # Xóa số câu
    text = text.replace("✠", "").replace("“", '"').replace("”", '"')
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def generate_gospel_audio(gospel_intro, gospel_content, output_path, ref_voice_path=DEFAULT_REF_VOICE):
    full_text = clean_scripture(f"{gospel_intro}. {gospel_content} Đó là lời Chúa.")
    print(f"📖 Text to Generate ({len(full_text)} chars):\n{full_text}\n")
    
    if not os.path.exists(ref_voice_path):
        raise FileNotFoundError(f"❌ Không tìm thấy file âm thanh mẫu tại: {ref_voice_path}")

    print("1. Loading OmniVoice model...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = model.to(device)

    print("2. Loading Whisper ASR model...")
    model.load_asr_model("openai/whisper-large-v3-turbo")

    print(f"3. Loading Voice Prompt from:\n   {ref_voice_path}")
    prompt = model.create_voice_clone_prompt(ref_voice_path)

    print("4. Generating audio with OmniVoice pipeline...")
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

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    torchaudio.save(output_path, audio_waveform.cpu(), model.sampling_rate)
    print(f"✅ Đã tạo thành công file audio tại:\n   {output_path}")

if __name__ == "__main__":
    intro = "Tin Mừng Đức Giê-su Ki-tô theo thánh Mác-cô"
    content = "Khi ấy, Đức Giê-su hiện ra cho mười một Tông Đồ và nói: Anh em hãy đi khắp tứ phương thiên hạ, loan báo Tin Mừng cho mọi loài thọ tạo."
    out = "/Users/tranthithuynhi/my-react-app/private/audio/gospels/demo_gospel_omnivoice.wav"
    generate_gospel_audio(intro, content, out)
