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

def clean_and_split_sentences(text):
    # Remove verse numbers like 7, 8, 9...
    text = re.sub(r'\b\d+\b\s*', '', text)
    # Clean extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split text into manageable sentence chunks (e.g. by ., !, ?, ;, or :)
    raw_chunks = re.split(r'([.!?;\n])', text)
    chunks = []
    current = ""
    for item in raw_chunks:
        current += item
        if item in [".", "!", "?", ";", "\n"] or len(current) > 120:
            if current.strip():
                chunks.append(current.strip())
            current = ""
    if current.strip():
        chunks.append(current.strip())
    return chunks

def main():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    
    # Using voice file directly from Downloads as requested
    ref_audio_path = "/Users/tranthithuynhi/Downloads/voice_giang - northern female narrator.mp3"
    
    output_dir = os.path.join(base_dir, "public", "audio", "readings")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "r1_today_2026_07_25.wav")

    # Load today's liturgy entry (feast_07_25)
    with open(json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    today_entry = None
    for r in rows:
        if r.get("liturgy_key") == "feast_07_25":
            today_entry = r
            break

    if not today_entry:
        print("Error: Could not find entry for feast_07_25")
        return

    r1_intro = today_entry.get("r1_intro", "").strip()
    raw_content = today_entry.get("r1_content", "").strip()
    
    full_text = f"{r1_intro}. {raw_content} Đó là lời Chúa."
    sentence_chunks = clean_and_split_sentences(full_text)

    print("--- 1ST READING TEXT (BÀI ĐỌC 1 HÔM NAY) ---")
    print(full_text)
    print("---------------------------------------------")
    print(f"Split text into {len(sentence_chunks)} sentence chunks.")

    print("Loading OmniVoice model in optimized inference mode...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    model = model.to(device)

    print(f"Loading reference voice from Downloads:\n{ref_audio_path}")
    prompt = model.create_voice_clone_prompt(ref_audio_path)

    generated_audio_list = []
    # 0.3s silence padding between sentences
    silence_padding = torch.zeros(1, int(model.sampling_rate * 0.3))

    start_time = time.time()

    with torch.inference_mode():
        for idx, chunk in enumerate(sentence_chunks):
            if not chunk:
                continue
            print(f"[{idx+1}/{len(sentence_chunks)}] Processing chunk: {chunk[:40]}...")
            
            chunk_audio = model.generate(
                text=chunk,
                prompt=prompt,
            )

            if isinstance(chunk_audio, list):
                if len(chunk_audio) > 0 and isinstance(chunk_audio[0], torch.Tensor):
                    chunk_audio = torch.cat(chunk_audio, dim=-1)
                else:
                    chunk_audio = torch.tensor(chunk_audio)

            if chunk_audio.dim() == 1:
                chunk_audio = chunk_audio.unsqueeze(0)

            generated_audio_list.append(chunk_audio.cpu())
            generated_audio_list.append(silence_padding)
            
            # Tiny 0.1s cooling pause between sentence chunks to keep GPU temperature low
            time.sleep(0.1)

    print("Concatenating audio chunks...")
    final_audio = torch.cat(generated_audio_list, dim=-1)

    torchaudio.save(output_file, final_audio, model.sampling_rate)
    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.1f}s! Saved 1st Reading Audio to:\n{output_file}")

if __name__ == "__main__":
    main()
