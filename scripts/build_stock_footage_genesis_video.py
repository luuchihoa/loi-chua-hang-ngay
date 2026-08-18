import os
import sys
import json
import asyncio
import subprocess
import urllib.request
from pathlib import Path

# Paths
WORKSPACE = Path("/Users/tranthithuynhi/loi-chua-hang-ngay")
BUILD_DIR = WORKSPACE / "scratch" / "stock_footage_build"
AUDIO_DIR = WORKSPACE / "scratch" / "genesis_video_build"
OUTPUT_VIDEO = Path("/Users/tranthithuynhi/Downloads/Video_Sang_The_Chuong_1_Stock_Footage_Cinematic.mp4")

BUILD_DIR.mkdir(parents=True, exist_ok=True)

SCENES = [
    {
        "id": 1,
        "title": "Phân cảnh 1: Khởi đầu hư vô",
        "video_url": "https://assets.mixkit.co/videos/44392/44392-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_1_padded.mp3"
    },
    {
        "id": 2,
        "title": "Phân cảnh 2: Ánh sáng ban sơ",
        "video_url": "https://assets.mixkit.co/videos/4831/4831-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_2_padded.mp3"
    },
    {
        "id": 3,
        "title": "Phân cảnh 3: Vòm trời và Đất khô",
        "video_url": "https://assets.mixkit.co/videos/2213/2213-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_3_padded.mp3"
    },
    {
        "id": 4,
        "title": "Phân cảnh 4: Các vầng sáng vũ trụ",
        "video_url": "https://assets.mixkit.co/videos/1610/1610-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_4_padded.mp3"
    },
    {
        "id": 5,
        "title": "Phân cảnh 5: Sự sống muôn màu",
        "video_url": "https://assets.mixkit.co/videos/2560/2560-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_5_padded.mp3"
    },
    {
        "id": 6,
        "title": "Phân cảnh 6: Đỉnh cao Sáng tạo - Con Người",
        "video_url": "https://assets.mixkit.co/videos/4661/4661-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_6_padded.mp3"
    },
    {
        "id": 7,
        "title": "Phân cảnh 7: Ngày thứ Bảy Thánh hiến & Suy niệm",
        "video_url": "https://assets.mixkit.co/videos/5009/5009-1080.mp4",
        "audio_file": AUDIO_DIR / "scene_7_padded.mp3"
    }
]

def download_file(url, out_path):
    if out_path.exists() and out_path.stat().st_size > 500000:
        print(f"File already downloaded: {out_path.name}")
        return
    print(f"Downloading stock video: {url} -> {out_path.name}...")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp, open(out_path, "wb") as f:
        f.write(resp.read())
    print(f" -> Done: {out_path.stat().st_size / (1024*1024):.2f} MB")

def process_scenes():
    print("--- [1/3] Downloading Real Stock Footage & Syncing with Voiceover ---")
    for scene in SCENES:
        sid = scene["id"]
        raw_stock = BUILD_DIR / f"raw_stock_{sid}.mp4"
        download_file(scene["video_url"], raw_stock)
        
        # Get audio duration
        probe = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(scene["audio_file"])
        ]).decode().strip()
        dur = float(probe)
        scene["duration"] = dur
        
        # Process stock video: loop if shorter than duration, scale to 1080p 16:9, sync with audio
        rendered_clip = BUILD_DIR / f"clip_{sid}.mp4"
        print(f"Processing Clip {sid} ({dur:.2f}s) with stock footage...")
        
        vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p"
        
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1",
            "-i", str(raw_stock),
            "-i", str(scene["audio_file"]),
            "-vf", vf,
            "-t", str(dur),
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(rendered_clip)
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        scene["clip_path"] = rendered_clip

def generate_ambient_music(total_dur):
    print("--- [2/3] Synthesizing Sacred Ambient Orchestral BGM ---")
    bgm_path = BUILD_DIR / "bgm_sacred.wav"
    synth_cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anoisesrc=d={total_dur+10}:c=pink:r=44100:a=0.008",
        "-f", "lavfi", "-i", f"sine=f=130.81:d={total_dur+10}", # C3
        "-f", "lavfi", "-i", f"sine=f=196.00:d={total_dur+10}", # G3
        "-f", "lavfi", "-i", f"sine=f=261.63:d={total_dur+10}", # C4
        "-f", "lavfi", "-i", f"sine=f=329.63:d={total_dur+10}", # E4
        "-filter_complex",
        "[1:a]volume=0.06[s1];[2:a]volume=0.04[s2];[3:a]volume=0.03[s3];[4:a]volume=0.02[s4];"
        "[0:a][s1][s2][s3][s4]amix=inputs=5:duration=longest[mixed];"
        "[mixed]lowpass=f=700,afade=t=in:ss=0:d=4,afade=t=out:st=" + str(total_dur) + ":d=5[out]",
        "-map", "[out]",
        str(bgm_path)
    ]
    subprocess.run(synth_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return bgm_path

def assemble_master_video():
    print("--- [3/3] Assembling Master Stock Footage Video ---")
    concat_txt = BUILD_DIR / "concat_list.txt"
    with open(concat_txt, "w", encoding="utf-8") as f:
        for scene in SCENES:
            f.write(f"file '{scene['clip_path']}'\n")
            
    concat_raw = BUILD_DIR / "video_raw_concat.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_txt),
        "-c", "copy",
        str(concat_raw)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    total_dur = sum(s["duration"] for s in SCENES)
    bgm_path = generate_ambient_music(total_dur)
    
    final_cmd = [
        "ffmpeg", "-y",
        "-i", str(concat_raw),
        "-i", str(bgm_path),
        "-filter_complex",
        "[0:a]volume=1.0[voice];[1:a]volume=0.20[bgm];[voice][bgm]amix=inputs=2:duration=first[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "256k",
        str(OUTPUT_VIDEO)
    ]
    subprocess.run(final_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"\n=======================================================")
    print(f"🎬 VIDEO STOCK FOOTAGE CINEMATIC ĐÃ HOÀN THÀNH!")
    print(f"File: {OUTPUT_VIDEO}")
    print(f"Kích thước: {OUTPUT_VIDEO.stat().st_size / (1024*1024):.2f} MB")
    print(f"Thời lượng: {total_dur:.1f}s (~{int(total_dur//60)} phút {int(total_dur%60)} giây)")
    print(f"=======================================================")

def main():
    process_scenes()
    assemble_master_video()

if __name__ == "__main__":
    main()
