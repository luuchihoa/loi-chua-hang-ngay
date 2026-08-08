import os
import sys
import json
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')

from omnivoice import OmniVoice

def main():
    base_dir = "/Users/tranthithuynhi/my-react-app"
    json_path = os.path.join(base_dir, "liturgy_contents_rows.json")
    audio_output_dir = os.path.join(base_dir, "public", "audio", "readings")
    ref_audio_path = os.path.join(base_dir, "public", "audio", "voice_preview_giang - northern female narrator.mp3")

    os.makedirs(audio_output_dir, exist_ok=True)

    print("Loading OmniVoice model...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    if torch.backends.mps.is_available():
        print("Using Apple Silicon MPS GPU acceleration!")
        model = model.to("mps")

    print(f"Loading reference voice from: {ref_audio_path}")
    prompt = model.create_voice_clone_prompt(ref_audio_path)

    print(f"Reading liturgy data from: {json_path}")
    with open(json_path, "r", encoding="utf-8") as f:
        readings_data = json.load(f)

    print(f"Total liturgy entries: {len(readings_data)}")

    count = 0
    for entry in readings_data:
        liturgy_key = entry.get("liturgy_key", entry.get("id"))
        
        # Sections to generate
        sections = [
            ("r1", entry.get("r1_intro", ""), entry.get("r1_content", "")),
            ("r2", entry.get("r2_intro", ""), entry.get("r2_content", "")),
            ("gospel", entry.get("gospel_intro", ""), entry.get("gospel_content", "")),
        ]

        for sec_name, intro, content in sections:
            if not content or not content.strip():
                continue
                
            full_text = f"{intro}\n{content}".strip()
            out_filename = f"{liturgy_key}_{sec_name}.wav"
            out_path = os.path.join(audio_output_dir, out_filename)

            if os.path.exists(out_path):
                print(f"Skipping existing: {out_filename}")
                continue

            print(f"[{count+1}] Generating {out_filename}...")
            try:
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

                torchaudio.save(out_path, audio_waveform.cpu(), model.sampling_rate)
                print(f"Saved: {out_filename}")
                count += 1
            except Exception as e:
                print(f"Error generating {out_filename}: {e}")

    print(f"Batch generation completed! Total new files created: {count}")

if __name__ == "__main__":
    main()
