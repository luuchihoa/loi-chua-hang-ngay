import numpy as np
import scipy.io.wavfile as wav
import os
import subprocess

def generate_soft_ambient_audio(output_mp3_path, duration_sec=180, sample_rate=44100):
    """
    Tạo nhạc nền Ambient không lời nhẹ nhàng (chord F-major / Bb-major)
    phù hợp làm nhạc nền Phụng Vụ lắng đọng.
    """
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    
    # Tần số nốt nhạc êm dịu (F3, C4, A4, F4 - 174Hz, 261Hz, 349Hz, 440Hz)
    freqs = [174.61, 261.63, 349.23, 440.00, 523.25]
    
    signal = np.zeros_like(t)
    for i, f in enumerate(freqs):
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.08 * t + i)
        tone = np.sin(2 * np.pi * f * t) * 0.15 * lfo
        harmonic = np.sin(2 * np.pi * (f * 2) * t) * 0.03 * lfo
        signal += tone + harmonic

    fade_in = np.minimum(t / 3.0, 1.0)
    fade_out = np.minimum((duration_sec - t) / 3.0, 1.0)
    signal = signal * fade_in * fade_out
    
    signal = signal / np.max(np.abs(signal)) * 0.35
    audio_int16 = (signal * 32767).astype(np.int16)
    
    temp_wav = output_mp3_path.replace(".mp3", ".wav")
    os.makedirs(os.path.dirname(output_mp3_path), exist_ok=True)
    wav.write(temp_wav, sample_rate, audio_int16)
    
    cmd = [
        "ffmpeg", "-y",
        "-i", temp_wav,
        "-codec:a", "libmp3lame",
        "-b:a", "128k",
        "-ac", "2",
        output_mp3_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    if os.path.exists(temp_wav):
        os.remove(temp_wav)
        
    print(f"✅ Đã tạo file nhạc nền thành công: {output_mp3_path}")

if __name__ == "__main__":
    out_dir = "/Users/tranthithuynhi/my-react-app/private/audio/bg_music"
    out_file = os.path.join(out_dir, "gentle_ambient_liturgy.mp3")
    generate_soft_ambient_audio(out_file, duration_sec=180)
