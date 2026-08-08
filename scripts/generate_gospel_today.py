import os
import sys
import json
import re
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')

from omnivoice import OmniVoice

def clean_scripture_text(text):
    # Remove verse numbers like 20, 21, 22...
    text = re.sub(r'\b\d+\b\s*', '', text)
    # Clean extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    ref_audio_path = os.path.join(base_dir, "public", "audio", "voice_preview_giang - northern female narrator.mp3")
    output_dir = os.path.join(base_dir, "public", "audio", "gospels")
    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, "gospel_today_2026_07_25.wav")

    # Load liturgy entry for feast_07_25
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    today_entry = None
    for r in rows:
        if r.get("liturgy_key") == "feast_07_25":
            today_entry = r
            break

    if not today_entry:
        print("Error: Could not find liturgy entry for feast_07_25")
        return

    gospel_intro = today_entry.get("gospel_intro", "Tin Mừng Chúa Giê-su Ki-tô theo thánh Mát-thêu.").replace("✠ ", "")
    raw_content = today_entry.get("gospel_content", "")
    cleaned_content = clean_scripture_text(raw_content)

    full_text = f"{gospel_intro} [pause] {cleaned_content} [pause] Đó là lời Chúa."

    print("--- GOSPEL TEXT TO GENERATE ---")
    print(full_text)
    print("-------------------------------")

    print("Loading OmniVoice model...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    if torch.backends.mps.is_available():
        print("Using Apple Silicon MPS GPU acceleration!")
        model = model.to("mps")

    print(f"Loading reference voice from: {ref_audio_path}")
    prompt = model.create_voice_clone_prompt(ref_audio_path)

    print("Generating audio for today's Gospel...")
    audio_waveform = model.generate(
        text=full_text,
        prompt=prompt,
    )

    if isinstance(audio_waveform, list):
        if len(audio_waveform) > 0 and isinstance(audio_waveform[0], torch.Tensor):
            audio_waveform = torch.cat(audio_waveform, dim=-1)
        else:
            audio_waveform = torch.tensor(audio_waveform)

    if audio_waveform.dim() == 1:
        audio_waveform = audio_waveform.unsqueeze(0)

    torchaudio.save(output_file, audio_waveform.cpu(), model.sampling_rate)
    print(f"\nSuccessfully generated Today's Gospel Audio at:\n{output_file}")

if __name__ == "__main__":
    main()
