import os
import sys
import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')

from omnivoice import OmniVoice

def main():
    print("Loading OmniVoice model...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
    
    # Move to GPU if available (MPS on Apple Silicon)
    if torch.backends.mps.is_available():
        print("Using Apple Silicon MPS GPU acceleration!")
        model = model.to("mps")
    
    ref_audio_path = "/Users/tranthithuynhi/my-react-app/private/audio/voice_preview_giang - northern female narrator.mp3"
    print(f"Loading reference voice from: {ref_audio_path}")
    
    # Create voice clone prompt
    prompt = model.create_voice_clone_prompt(ref_audio_path)
    
    # Sample text for Bible reading
    sample_text = "Bài trích sách Lê-vi. Đức Chúa phán với ông Mô-sê rằng : Các ngươi phải thánh thiện, vì Ta, Đức Chúa, Thiên Chúa của các ngươi, Ta là Đấng Thánh."
    print(f"Generating audio for text: {sample_text}")
    
    # Generate audio waveform
    audio_waveform = model.generate(
        text=sample_text,
        prompt=prompt,
    )
    
    output_path = "/Users/tranthithuynhi/my-react-app/private/audio/test_reading_output.wav"
    print(f"Saving generated audio to: {output_path}")
    
    # Check type & convert to Tensor if needed
    if isinstance(audio_waveform, list):
        if len(audio_waveform) > 0 and isinstance(audio_waveform[0], torch.Tensor):
            audio_waveform = torch.cat(audio_waveform, dim=-1)
        else:
            audio_waveform = torch.tensor(audio_waveform)

    if audio_waveform.dim() == 1:
        audio_waveform = audio_waveform.unsqueeze(0)
        
    torchaudio.save(output_path, audio_waveform.cpu(), model.sampling_rate)
    print(f"Successfully generated audio at: {output_path}")

if __name__ == "__main__":
    main()
