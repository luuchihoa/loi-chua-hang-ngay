import os
import sys
import json
import asyncio
import subprocess
import re
from pathlib import Path
import edge_tts

# Paths
WORKSPACE = Path("/Users/tranthithuynhi/loi-chua-hang-ngay")
BRAIN_DIR = Path("/Users/tranthithuynhi/.gemini/antigravity/brain/05954bd4-7f37-424b-8048-dfd3d2f79ad7")
TEMP_DIR = WORKSPACE / "scratch" / "genesis_video_build"
OUTPUT_VIDEO = Path("/Users/tranthithuynhi/Downloads/Video_Sang_The_Chuong_1_Khoi_Dau.mp4")

TEMP_DIR.mkdir(parents=True, exist_ok=True)

def find_image(prefix):
    matches = list(BRAIN_DIR.glob(f"{prefix}*.jpg"))
    if not matches:
        raise FileNotFoundError(f"Cannot find image for {prefix}")
    return sorted(matches)[-1]

SCENES = [
    {
        "id": 1,
        "title": "Phân cảnh 1: Khởi đầu hư vô",
        "image": find_image("scene1_dark_void"),
        "text": "Khởi đầu... khi thời gian chưa là thời gian. Đất còn trống rỗng chưa có hình dạng, bóng tối bao trùm vực thẳm mênh mông. Nhưng trong sự tĩnh lặng sâu thẳm ấy, Thần Khí Thiên Chúa vẫn âm thầm bay lượn trên mặt nước, ấp ủ một mầm sống vĩ đại sắp sửa trào dâng từ tình yêu bao la của Ngài.",
        "zoom": "in"
    },
    {
        "id": 2,
        "title": "Phân cảnh 2: Ánh sáng ban sơ",
        "image": find_image("scene2_divine_light"),
        "text": "Và rồi, tiếng phán uy nghiêm của Đấng Tối Cao xé tan màn đêm trường cổ: Phải có ánh sáng! Liền có ánh sáng. Thiên Chúa phân rẽ ánh sáng và bóng tối, đặt tên ánh sáng là ngày, bóng tối là đêm. Trật tự thiêng liêng bắt đầu hiển hiện, xua tan sự hỗn mang bằng vầng quang ấm áp của sự sống.",
        "zoom": "out"
    },
    {
        "id": 3,
        "title": "Phân cảnh 3: Vòm trời và Đất khô",
        "image": find_image("scene3_earth_plants"),
        "text": "Ngài tạo vòm trời xanh thẳm, phân rẽ nước phía dưới vòm với nước phía trên vòm. Từ dòng nước tụ lại, đất khô lộ dạng. Thiên Chúa phán, và mặt đất chuyển mình gieo mầm sự sống. Đất trổ sinh cây cỏ, mang hạt giống và cây ăn trái trĩu quả theo từng loại. Mọi sự bừng nở trong một trật tự hoàn mỹ và tràn đầy hương sắc.",
        "zoom": "in"
    },
    {
        "id": 4,
        "title": "Phân cảnh 4: Các vầng sáng vũ trụ",
        "image": find_image("scene4_sun_moon_stars"),
        "text": "Trên vòm trời cao, Ngài dệt nên những kiệt tác ánh sáng. Mặt trời rực rỡ cai trị ban ngày, Mặt trăng dịu hiền điều khiển ban đêm cùng muôn triệu ngôi sao lấp lánh. Chúng xoay vần, dệt nên thời gian, định đoạt ngày tháng, mùa màng, để vũ trụ ca bài ca hòa nhịp không ngừng.",
        "zoom": "out"
    },
    {
        "id": 5,
        "title": "Phân cảnh 5: Sự sống muôn màu",
        "image": find_image("scene5_ocean_birds"),
        "text": "Sự sống bắt đầu reo ca dưới nước và trên không. Thiên Chúa tạo sinh vật biển khổng lồ và muôn loài cá lội, cùng chim muông sải cánh bay lượn trên bầu trời. Ngài ban phúc lành: Hãy sinh sôi nảy nở thật nhiều. Và trên mặt đất khô, muôn thú vạn vật cũng bừng tỉnh đón chào ngày mới.",
        "zoom": "in"
    },
    {
        "id": 6,
        "title": "Phân cảnh 6: Đỉnh cao Sáng tạo - Con Người",
        "image": find_image("scene6_creation_man"),
        "text": "Khi đất trời đã sẵn sàng, Thiên Chúa thực hiện công trình kỳ diệu nhất: Chúng ta hãy làm ra con người theo hình ảnh chúng ta. Ngài tạo dựng con người có nam có nữ. Trao cho họ hơi thở linh thánh, phẩm giá tối cao, và sứ mạng yêu thương, quản lý vũ trụ và mọi sinh vật bằng tình yêu trung tín của Ngài. Con người chính là tuyệt tác, là đỉnh cao của tình yêu sáng tạo.",
        "zoom": "out"
    },
    {
        "id": 7,
        "title": "Phân cảnh 7: Ngày thứ Bảy Thánh hiến & Suy niệm",
        "image": find_image("scene7_holy_sabbath"),
        "text": "Khi công trình hoàn tất, Thiên Chúa nhìn ngắm mọi loài Ngài đã dựng nên: Tất cả đều tốt đẹp. Vào ngày thứ bảy, Ngài nghỉ ngơi, chúc lành và thánh hóa ngày ấy. Hãy để tâm hồn ta lắng đọng, nhận ra tình yêu cứu độ ẩn tàng trong trật tự hoàn mỹ của vũ trụ, và dâng lời tạ ơn Đấng đã dựng nên ta từ hư vô.",
        "zoom": "in"
    }
]

def clean_for_tts(text):
    t = text.replace('"', '').replace('“', '').replace('”', '')
    t = re.sub(r'\[\d+.*?\]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

async def generate_single_audio(text, output_path, retries=5):
    clean_t = clean_for_tts(text)
    for attempt in range(retries):
        try:
            comm = edge_tts.Communicate(clean_t, voice="vi-VN-NamMinhNeural", rate="-5%")
            await comm.save(str(output_path))
            if output_path.exists() and output_path.stat().st_size > 1000:
                return
        except Exception as e:
            print(f"Retry {attempt+1}/{retries} for TTS...")
            await asyncio.sleep(2)
            
    for attempt in range(retries):
        try:
            comm = edge_tts.Communicate(clean_t, voice="vi-VN-HoaiMyNeural", rate="-5%")
            await comm.save(str(output_path))
            if output_path.exists() and output_path.stat().st_size > 1000:
                return
        except Exception as e:
            await asyncio.sleep(2)
    raise RuntimeError("Failed to generate audio after retries")

async def generate_voiceovers():
    print("--- [1/4] Checking / Generating Vietnamese Voiceovers ---")
    for scene in SCENES:
        sid = scene["id"]
        raw_audio = TEMP_DIR / f"scene_{sid}_raw.mp3"
        padded_audio = TEMP_DIR / f"scene_{sid}_padded.mp3"
        
        if not raw_audio.exists() or raw_audio.stat().st_size < 1000:
            print(f"Generating audio for Scene {sid}...")
            await generate_single_audio(scene["text"], raw_audio)
            
            subprocess.run([
                "ffmpeg", "-y", "-i", str(raw_audio),
                "-af", "apad=pad_dur=1.2",
                "-c:a", "libmp3lame", str(padded_audio)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif not padded_audio.exists():
            subprocess.run([
                "ffmpeg", "-y", "-i", str(raw_audio),
                "-af", "apad=pad_dur=1.2",
                "-c:a", "libmp3lame", str(padded_audio)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
        probe = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(padded_audio)
        ]).decode().strip()
        
        dur = float(probe)
        scene["duration"] = dur
        scene["audio_path"] = padded_audio
        print(f" -> Scene {sid} ({scene['title']}): {dur:.2f}s")

def build_scene_videos():
    print("--- [2/4] Rendering Animated Cinematic Video Clips (1080p, 30fps) ---")
    for scene in SCENES:
        sid = scene["id"]
        dur = scene["duration"]
        img_path = scene["image"]
        audio_path = scene["audio_path"]
        out_mp4 = TEMP_DIR / f"clip_{sid}.mp4"
        
        fps = 30
        frames = int(dur * fps) + 10
        
        if scene["zoom"] == "in":
            zoom_expr = "zoom+0.0005"
        else:
            zoom_expr = "if(lte(zoom,1.0),1.15,zoom-0.0005)"
            
        vf_filter = (
            f"scale=2560:1440,"
            f"zoompan=z='{zoom_expr}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps={fps},"
            f"format=yuv420p"
        )
        
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(img_path),
            "-i", str(audio_path),
            "-vf", vf_filter,
            "-t", str(dur),
            "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(out_mp4)
        ]
        print(f"Rendering Clip {sid} ({dur:.2f}s)...")
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        scene["clip_path"] = out_mp4

def generate_ambient_music(total_dur):
    print("--- [3/4] Synthesizing Sacred Ambient Orchestral Drone ---")
    bgm_path = TEMP_DIR / "bgm_sacred.wav"
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

def assemble_final_video():
    print("--- [4/4] Assembling Final Master Video ---")
    concat_txt = TEMP_DIR / "concat_list.txt"
    with open(concat_txt, "w", encoding="utf-8") as f:
        for scene in SCENES:
            f.write(f"file '{scene['clip_path']}'\n")
            
    concat_raw = TEMP_DIR / "video_raw_concat.mp4"
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
    print(f"🎬 VIDEO ĐÃ TẠO THÀNH CÔNG!")
    print(f"Đường dẫn: {OUTPUT_VIDEO}")
    print(f"Kích thước: {OUTPUT_VIDEO.stat().st_size / (1024*1024):.2f} MB")
    print(f"Thời lượng: {total_dur:.1f}s (~{int(total_dur//60)} phút {int(total_dur%60)} giây)")
    print(f"=======================================================")

async def main():
    await generate_voiceovers()
    build_scene_videos()
    assemble_final_video()

if __name__ == "__main__":
    asyncio.run(main())
