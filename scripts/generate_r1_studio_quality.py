import os
import sys
import json
import re
import time
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')

from omnivoice import OmniVoice

def clean_scripture(text):
    # Remove verse numbers
    text = re.sub(r'\b\d+\b', '', text)
    # Remove cross and quote artifacts
    text = text.replace("✠", "").replace("“", "").replace("”", "").replace('"', "")
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    
    # Reference voice file from OmniVoice-Studio assets
    ref_audio_path = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"
    
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "r1_studio_quality.wav")

    # Load today's liturgy entry (feast_07_25)
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    today_entry = None
    for r in rows:
        if r.get("liturgy_key") == "feast_07_25":
            today_entry = r
            break

    r1_intro = today_entry.get("r1_intro", "").strip()
    raw_content = today_entry.get("r1_content", "").strip()
    
    full_text = clean_scripture(f"{r1_intro}. {raw_content} Đó là lời Chúa.")

    print("--- TEXT TO GENERATE (STUDIO QUALITY) ---")
    print(full_text)
    print("------------------------------------------")

    print("1. Loading OmniVoice model...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    model = model.to(device)

    print("2. Loading Whisper ASR model for high-precision voice clone alignment...")
    model.load_asr_model("openai/whisper-large-v3-turbo")

    print(f"3. Creating voice clone prompt from:\n{ref_audio_path}")
    prompt = model.create_voice_clone_prompt(ref_audio_path)

    print("4. Generating audio with built-in OmniVoice Studio chunking pipeline...")
    start_time = time.time()

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
    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.1f}s! Saved studio-quality audio to:\n{output_file}")

if __name__ == "__main__":
    main()
