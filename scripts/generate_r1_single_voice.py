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

def clean_and_normalize_text(text):
    # Remove verse numbers like 7, 8, 9...
    text = re.sub(r'\b\d+\b', '', text)
    # Remove awkward punctuation marks like extra dots, quotes, cross symbol
    text = text.replace("✠", "").replace("“", "").replace("”", "").replace('"', "")
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r';', ',', text)
    # Clean extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def split_into_paragraphs(text, max_chars=250):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    paragraphs = []
    current = ""
    for s in sentences:
        if not s.strip():
            continue
        if len(current) + len(s) < max_chars:
            current += (" " if current else "") + s.strip()
        else:
            if current.strip():
                paragraphs.append(current.strip())
            current = s.strip()
    if current.strip():
        paragraphs.append(current.strip())
    return paragraphs

def main():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    
    # Exact main reference voice from OmniVoice-Studio assets
    ref_audio_path = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"
    
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "r1_single_voice_giang.wav")

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
    
    raw_full = f"{r1_intro}. {raw_content} Đó là lời Chúa."
    cleaned_full = clean_and_normalize_text(raw_full)
    
    paragraphs = split_into_paragraphs(cleaned_full, max_chars=300)

    print("--- CLEANED PARAGRAPHS FOR SINGLE VOICE CLONING ---")
    for i, p in enumerate(paragraphs):
        print(f"[{i+1}] {p}")
    print("---------------------------------------------------")

    print("Loading OmniVoice model...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    model = model.to(device)

    print(f"Extracting main voice clone prompt from:\n{ref_audio_path}")
    prompt = model.create_voice_clone_prompt(ref_audio_path)

    generated_audio_list = []
    # 0.4s silence padding between paragraphs
    silence_padding = torch.zeros(1, int(model.sampling_rate * 0.4))

    start_time = time.time()

    with torch.inference_mode():
        for idx, para in enumerate(paragraphs):
            print(f"[{idx+1}/{len(paragraphs)}] Generating with voice_giang: {para[:50]}...")
            
            para_audio = model.generate(
                text=para,
                prompt=prompt,
            )

            if isinstance(para_audio, list):
                if len(para_audio) > 0 and isinstance(para_audio[0], torch.Tensor):
                    para_audio = torch.cat(para_audio, dim=-1)
                else:
                    para_audio = torch.tensor(para_audio)

            if para_audio.dim() == 1:
                para_audio = para_audio.unsqueeze(0)

            generated_audio_list.append(para_audio.cpu())
            generated_audio_list.append(silence_padding)
            time.sleep(0.1)

    print("Concatenating paragraphs into a single unified voice audio file...")
    final_audio = torch.cat(generated_audio_list, dim=-1)

    torchaudio.save(output_file, final_audio, model.sampling_rate)
    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.1f}s! Saved single voice audio to:\n{output_file}")

if __name__ == "__main__":
    main()
