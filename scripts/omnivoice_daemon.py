import os
import sys
import re
import json
import gc
import time
import subprocess
import concurrent.futures
from http.server import BaseHTTPRequestHandler, HTTPServer

import torch
import torchaudio

# Add OmniVoice Studio path
sys.path.append('/Users/tranthithuynhi/OmniVoice-Studio')
try:
    from omnivoice import OmniVoice
except ImportError:
    print("OmniVoice not found. Cannot start daemon.")
    sys.exit(1)

REF_FEMALE_VOICE = "/Users/tranthithuynhi/OmniVoice-Studio/backend/assets/samples/voice_giang - northern female narrator.mp3"

def trim_silence(tensor, threshold=0.005):
    abs_t = tensor.abs().squeeze(0)
    mask = abs_t > threshold
    if not mask.any():
        return tensor
    start = torch.where(mask)[0][0]
    end = torch.where(mask)[0][-1]
    return tensor[:, start:end+1]

def parse_scripture_chunks(text, params):
    if not text:
        return []

    lines = text.split('\n')
    parsed_paragraphs = []
    
    p_break = float(params.get("paragraph_break", 0.60))
    s_break = float(params.get("sentence_break", 0.45))
    maj_break = float(params.get("major_break", 0.30))
    med_break = float(params.get("medium_break", 0.25))

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        current_paragraph_items = []

        raw_sentences = re.split(r'(?<=[.!?])\s+|(?<=[.!?][\"\'\)\]])\s+', line_str)
        sentences = [s.strip() for s in raw_sentences if s.strip()]

        for s_idx, sentence in enumerate(sentences):
            is_last_in_line = (s_idx == len(sentences) - 1)
            
            clauses = re.split(r'(?<=[,;:—])\s+', sentence)
            clauses = [c.strip() for c in clauses if c.strip()]
            
            for c_idx, clause in enumerate(clauses):
                is_last_clause = (c_idx == len(clauses) - 1)
                
                if is_last_clause:
                    pause_sec = p_break if is_last_in_line else s_break
                else:
                    if clause.endswith(';') or clause.endswith(':'):
                        pause_sec = maj_break
                    else:
                        pause_sec = med_break
                        
                current_paragraph_items.append((clause, pause_sec))
                
        if current_paragraph_items:
            parsed_paragraphs.append(current_paragraph_items)

    return parsed_paragraphs

def convert_wav_to_mp3(wav_path, mp3_path):
    cmd = [
        "ffmpeg", "-y",
        "-i", wav_path,
        "-codec:a", "libmp3lame",
        "-b:a", "96k",
        "-ac", "1",
        mp3_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


class OmniVoiceDaemon:
    def __init__(self):
        print("🎙️ Loading OmniVoice Model into Memory... This will take a few seconds.")
        # Default to MPS (Apple Silicon GPU) if available
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model = OmniVoice.from_pretrained("k2-fsa/OmniVoice")
        self.model = self.model.to(self.device)
        self.sr = getattr(self.model, "sampling_rate", 24000)
        print(f"✅ OmniVoice Model successfully loaded on {self.device}!")

    def generate(self, params):
        out_path = params.get('out_path')
        overwrite = params.get('overwrite', False)
        
        if os.path.exists(out_path) and not overwrite:
            return {"success": True, "message": "File already exists", "path": out_path}

        use_cpu = params.get('use_cpu', False)
        current_device = "cpu" if use_cpu else self.device
        
        # Switch model device dynamically if requested (though keeping on MPS is recommended)
        if next(self.model.parameters()).device.type != current_device:
            self.model = self.model.to(current_device)

        intro = params.get('intro', '')
        content = params.get('content', '')
        section_label = params.get('section_label', '')
        custom_voice_path = params.get('custom_voice_path')
        voice_path = custom_voice_path if (custom_voice_path and os.path.exists(custom_voice_path)) else REF_FEMALE_VOICE
        num_step = params.get('num_step', 16)
        
        label_str = ""
        if section_label and section_label.strip():
            lbl = section_label.strip()
            if not lbl.endswith("."):
                lbl += "."
            label_str = f"{lbl}\n"
            
        # We skip perfect_scripture_cleaner here because Node.js frontend already perfectly cleaned it!
        raw_combined = f"{label_str}{intro}\n{content}"
        
        parsed_paragraphs = parse_scripture_chunks(raw_combined, params)
        total_chunks = sum(len(p) for p in parsed_paragraphs)
        print(f"🎙️ Rendering {len(parsed_paragraphs)} paragraphs ({total_chunks} chunks) on {current_device}...")
        
        temp_wav_path = out_path.replace(".mp3", "_temp.wav")
        
        def render_paragraph(paragraph_items, p_idx):
            audio_chunks = []
            for idx, (seg_text, pause_sec) in enumerate(paragraph_items, 1):
                clean_prompt_text = seg_text.rstrip(',;:—').strip() or seg_text
                with torch.inference_mode():
                    chunk = self.model.generate(
                        text=clean_prompt_text,
                        ref_audio=voice_path,
                        num_step=num_step
                    )
                if isinstance(chunk, list): chunk = chunk[0]
                if chunk.dim() == 1: chunk = chunk.unsqueeze(0)
                
                trimmed_chunk = trim_silence(chunk)
                audio_chunks.append(trimmed_chunk.cpu())
                
                pause_samples = int(self.sr * pause_sec)
                silence = torch.zeros((1, pause_samples), dtype=torch.float32)
                audio_chunks.append(silence)
                
                # Remove empty_cache inside the tight loop to save overhead
                # We will clear cache at the paragraph level instead

            
            if audio_chunks:
                return torch.cat(audio_chunks, dim=-1)
            return None

        # Execute paragraphs sequentially to avoid MPS segmentation fault
        paragraph_audios = []
        for p_idx, para_items in enumerate(parsed_paragraphs):
            try:
                audio = render_paragraph(para_items, p_idx)
                if audio is not None:
                    paragraph_audios.append(audio)
            except Exception as e:
                print(f"❌ Error rendering paragraph {p_idx}: {e}")
                
            # Perform GC safely between paragraphs
            if current_device == "mps":
                torch.mps.empty_cache()
            gc.collect()

        # Concatenate the final audio sequentially
        if not paragraph_audios:
            raise ValueError("Không tạo được bất kỳ âm thanh nào.")
            
        full_audio = torch.cat(paragraph_audios, dim=-1)
        
        peak = full_audio.abs().max().item()
        if peak > 0:
            full_audio = full_audio / peak * 0.97

        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        torchaudio.save(
            temp_wav_path,
            full_audio.to(torch.float32),
            self.sr,
            encoding="PCM_S",
            bits_per_sample=16
        )
        convert_wav_to_mp3(temp_wav_path, out_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

        del full_audio, paragraph_audios
        gc.collect()
        if current_device == "mps":
            torch.mps.empty_cache()

        print(f"✅ Finished: {out_path}")
        return {"success": True, "path": out_path}

DAEMON = None

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            params = json.loads(post_data.decode('utf-8'))
            result = DAEMON.generate(params)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
        except (BrokenPipeError, ConnectionResetError) as e:
            # Client disconnected before we could send the response (usually due to timeout on long renders)
            print("⚠️ Client ngắt kết nối (timeout) trước khi nhận được phản hồi. File vẫn được lưu thành công.")
        except Exception as e:
            print(f"❌ Error during generation: {e}")
            try:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            except:
                pass

    def log_message(self, format, *args):
        # Mute default HTTP logs to keep console clean
        pass

def run_server(port=5006):
    global DAEMON
    DAEMON = OmniVoiceDaemon()
    server_address = ('', port)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f"🚀 OmniVoice Daemon listening on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
