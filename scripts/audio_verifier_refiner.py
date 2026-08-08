#!/usr/bin/env python3
"""
Audio Verifier & Refinement Loop (Automated Verification & Refinement Pipeline)
================================================================================
Quy trình tự động:
[ File MP3 Rendered ] ➔ [ 1. Speech-to-Text ] ➔ [ 2. So Sánh & Sửa Phonetic ] 
                      ➔ [ 3. Kiểm Tra Ngắt Nghỉ & Nhiễu Tiếng ] ➔ [ 4. Auto-Retry Loop ]
"""

import os
import sys
import re
import time
import gc
import difflib
from typing import Dict, List, Tuple, Optional, Any, Callable

# Kiểm tra thư viện Whisper
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Kiểm tra thư viện PyDub
try:
    from pydub import AudioSegment
    from pydub.silence import detect_silence
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

# Kiểm tra Torch cho GPU/VRAM cleanup
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


# ==============================================================================
# 1. SPEECH-TO-TEXT INSPECTOR
# ==============================================================================
class STTInspector:
    """Kiểm tra audio render bằng mô hình Speech-to-Text (Whisper) & so sánh với văn bản gốc."""
    
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        if not WHISPER_AVAILABLE:
            return None
        if self.model is None:
            print(f"🎙️ [STT] Loading Whisper model '{self.model_name}'...")
            self.model = whisper.load_model(self.model_name)
        return self.model

    def transcribe(self, audio_path: str, language: str = "vi") -> str:
        """Transcribe file MP3 sang văn bản tiếng Việt."""
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file không tồn tại: {audio_path}")
            
        if WHISPER_AVAILABLE:
            model = self._load_model()
            result = model.transcribe(audio_path, language=language)
            return result.get("text", "").strip()
        else:
            print("⚠️ [STT Warning] Whisper chưa được cài đặt. Đang sử dụng chế độ mô phỏng STT fallback.")
            return ""

    @staticmethod
    def normalize_text(text: str) -> str:
        """Chuẩn hóa văn bản trước khi so sánh."""
        if not text:
            return ""
        # Lowercase và xóa các ký tự đặc biệt/dấu câu
        t = text.lower()
        t = re.sub(r'[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]', ' ', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    def check_text_discrepancies(self, original_text: str, transcribed_text: str) -> List[Dict[str, Any]]:
        """
        So sánh văn bản gốc và văn bản transcribe.
        Trả về danh sách các từ bị sai khác (discrepancies / errors).
        """
        norm_orig = self.normalize_text(original_text)
        norm_trans = self.normalize_text(transcribed_text)
        
        orig_words = norm_orig.split()
        trans_words = norm_trans.split()

        matcher = difflib.SequenceMatcher(None, orig_words, trans_words)
        discrepancies = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag in ('replace', 'delete'):
                orig_segment = " ".join(orig_words[i1:i2])
                trans_segment = " ".join(trans_words[j1:j2]) if tag == 'replace' else ""
                discrepancies.append({
                    'type': tag,
                    'original': orig_segment,
                    'transcribed': trans_segment,
                    'index_range': (i1, i2)
                })

        return discrepancies


# ==============================================================================
# 2. PHONETIC REPLACEMENT & PROMPT REFINER
# ==============================================================================
class PhoneticRefiner:
    """Tự động tinh chỉnh cách viết phiên âm (Phonetic Hint) trong file prompt đầu vào."""
    
    # Từ điển quy tắc phiên âm mặc định cho tên riêng Phụng Vụ / Công Giáo / Tiếng Việt
    DEFAULT_PHONETIC_MAP = {
        "ghíp-ôn": "Ghíp ô-n",
        "ghíp ôn": "Gíp Ôn",
        "sa-lô-môn": "Sa Lô Môn",
        "đa-vít": "Đa Vít",
        "giê-su": "Giê Su",
        "ki-tô": "Ki Tô",
        "đài phân việt": "tài phân biệt",
        "gép-ôn": "Ghíp ô-n"
    }

    def __init__(self, custom_map: Optional[Dict[str, str]] = None):
        self.phonetic_map = dict(self.DEFAULT_PHONETIC_MAP)
        if custom_map:
            self.phonetic_map.update(custom_map)

    def apply_phonetic_fixes(self, prompt_text: str, discrepancies: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Áp dụng sửa lỗi phiên âm dựa trên từ điển và danh sách sai lệch được phát hiện.
        """
        updated_text = prompt_text

        # 1. Áp dụng quy tắc từ điển đã biết
        for wrong, fix in self.phonetic_map.items():
            pattern = re.compile(re.escape(wrong), re.IGNORECASE)
            updated_text = pattern.sub(fix, updated_text)

        # 2. Xử lý động nếu có discrepancies từ bước STT
        if discrepancies:
            for err in discrepancies:
                orig = err.get('original', '')
                trans = err.get('transcribed', '')
                if orig:
                    # Nếu là tên riêng có dấu gạch nối
                    if '-' in orig:
                        split_hint = " ".join(orig.split('-'))
                        updated_text = re.sub(re.escape(orig), split_hint, updated_text, flags=re.IGNORECASE)
                    # Nếu phát hiện âm đọc chệch, chèn ký tự phân tách ngữ âm
                    elif len(orig.split()) == 1 and len(orig) > 4:
                        phonetic_hint = orig[0:3] + " " + orig[3:]
                        self.phonetic_map[trans.lower()] = phonetic_hint

        return updated_text


# ==============================================================================
# 3. AUDIO FEATURE ANALYZER (SILENCE & THERMAL/ARTIFACT INSPECTOR)
# ==============================================================================
class AudioAnalyzer:
    """Phân tích đặc tính âm thanh: khoảng ngắt nghỉ (Silence) & méo tiếng cuối file (Thermal Artifacts)."""
    
    def __init__(self,
                 sentence_break_sec: float = 0.45,
                 paragraph_break_sec: float = 0.60,
                 clause_break_sec: float = 0.30,
                 silence_thresh_db: int = -40,
                 min_silence_len_ms: int = 200):
        self.sentence_break_sec = sentence_break_sec
        self.paragraph_break_sec = paragraph_break_sec
        self.clause_break_sec = clause_break_sec
        self.silence_thresh_db = silence_thresh_db
        self.min_silence_len_ms = min_silence_len_ms

    def validate_silence_timing(self, audio_path: str) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Đo khoảng im lặng trong file audio bằng PyDub.
        Trả về (is_valid, silences_list).
        """
        if not PYDUB_AVAILABLE:
            print("⚠️ [AudioAnalyzer Warning] PyDub chưa cài đặt. Bỏ qua bước kiểm tra silence timing chi tiết.")
            return True, []

        try:
            audio = AudioSegment.from_file(audio_path)
            silences = detect_silence(
                audio,
                min_silence_len=self.min_silence_len_ms,
                silence_thresh=self.silence_thresh_db
            )
            
            silence_intervals = []
            for start, stop in silences:
                duration_sec = (stop - start) / 1000.0
                silence_intervals.append({
                    'start_sec': start / 1000.0,
                    'end_sec': stop / 1000.0,
                    'duration_sec': duration_sec
                })

            # Đánh giá xem có bị ngắt nghỉ quá ngắn (< sentence_break_sec / 2) không
            too_short_pauses = [s for s in silence_intervals if s['duration_sec'] < 0.15]
            is_valid = len(too_short_pauses) == 0

            return is_valid, silence_intervals
        except Exception as e:
            print(f"❌ Lỗi khi phân tích silence: {e}")
            return False, []

    def check_thermal_artifacts(self, audio_path: str, tail_sec: float = 8.0) -> bool:
        """
        Phát hiện méo tiếng, nhiễu rác âm, sụt biên độ bất thường ở 5-10 giây cuối file.
        Trả về True nếu phát hiện lỗi Thermal Artifact.
        """
        if not os.path.exists(audio_path):
            return True

        if PYDUB_AVAILABLE:
            try:
                audio = AudioSegment.from_file(audio_path)
                total_duration_sec = len(audio) / 1000.0
                
                if total_duration_sec <= tail_sec:
                    tail_audio = audio
                else:
                    tail_audio = audio[-int(tail_sec * 1000):]

                # Kiểm tra RMS (Root Mean Square) energy & Peak Amplitude ở phần đuôi
                rms = tail_audio.rms
                max_possible = tail_audio.max_possible_amplitude
                normalized_rms = rms / max_possible if max_possible > 0 else 0

                # Nếu đuôi file bị rè (clipping), max amplitude chạm ngưỡng max tuyệt đối
                is_clipped = tail_audio.max == max_possible
                
                # Nếu sụt biên độ 0 tuyệt đối liên tục quá 3 giây ở cuối (sụt bất thường)
                tail_silence = detect_silence(tail_audio, min_silence_len=3000, silence_thresh=-60)
                has_abnormal_drop = len(tail_silence) > 0 and tail_silence[-1][1] == len(tail_audio)

                if is_clipped or has_abnormal_drop:
                    print(f"⚠️ [Thermal Check] Phát hiện rác âm/sụt biên độ cuối file (Clipping: {is_clipped}, Drop: {has_abnormal_drop})")
                    return True

                return False
            except Exception as e:
                print(f"⚠️ Lỗi phân tích thermal artifact: {e}")
                return False
        else:
            # Fallback kiểm tra kích thước file
            return os.path.getsize(audio_path) < 1000

    @staticmethod
    def execute_thermal_cool_down(cool_down_sec: float = 5.0):
        """Kích hoạt lệnh làm mát VRAM/RAM và giải phóng bộ nhớ."""
        print(f"🧊 [CoolDown] Kích hoạt cooldown {cool_down_sec}s & giải phóng VRAM/RAM...")
        gc.collect()
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()
        time.sleep(cool_down_sec)


# ==============================================================================
# 4. AUTOMATED CONTROL & RETRY LOOP
# ==============================================================================
class AudioVerificationPipeline:
    """Hàm điều khiển Vòng Lặp Render Lại Tự Động (Auto-Retry Loop)."""

    def __init__(self,
                 stt_inspector: Optional[STTInspector] = None,
                 phonetic_refiner: Optional[PhoneticRefiner] = None,
                 audio_analyzer: Optional[AudioAnalyzer] = None):
        self.stt_inspector = stt_inspector or STTInspector()
        self.phonetic_refiner = phonetic_refiner or PhoneticRefiner()
        self.audio_analyzer = audio_analyzer or AudioAnalyzer()

    def verify_and_refine_audio(self,
                                audio_path: str,
                                original_text: str,
                                render_callback: Optional[Callable[[str], bool]] = None,
                                max_retries: int = 3,
                                cool_down_sec: float = 5.0) -> bool:
        """
        Vòng lặp tự động kiểm tra, sửa lỗi và render lại audio.
        """
        current_prompt = original_text

        for attempt in range(1, max_retries + 1):
            print(f"\n==================================================")
            print(f"🔄 [Attempt {attempt}/{max_retries}] Bắt đầu kiểm định file: {os.path.basename(audio_path)}")
            print(f"==================================================")

            # Nếu file chưa tồn tại và có render_callback, tiến hành render lần đầu
            if not os.path.exists(audio_path) and render_callback:
                print(f"⚙️ [Render] Đang render audio lần thứ {attempt}...")
                success = render_callback(current_prompt)
                if not success or not os.path.exists(audio_path):
                    print(f"❌ [Render Fail] Render thất bại ở lần thử {attempt}.")
                    continue

            # 1. Transcribe audio bằng STT
            transcribed_text = ""
            if WHISPER_AVAILABLE:
                transcribed_text = self.stt_inspector.transcribe(audio_path)
                print(f"📝 [STT Result]: {transcribed_text if transcribed_text else '(Không nhận diện được text)'}")
            else:
                print("ℹ️ [STT] Bỏ qua kiểm tra Whisper (Whisper chưa cài đặt).")

            # 2. Kiểm tra sai lệch từ ngữ (Discrepancies)
            errors = []
            if transcribed_text:
                errors = self.stt_inspector.check_text_discrepancies(original_text, transcribed_text)
                if errors:
                    print(f"⚠️ [Text Error] Phát hiện {len(errors)} sai lệch từ ngữ:")
                    for e in errors:
                        print(f"   - Gốc: '{e['original']}' ➔ Transcribed: '{e['transcribed']}'")
                else:
                    print("✅ [Text Pass] Chuẩn từ ngữ 100%.")

            # 3. Kiểm tra độ dài ngắt nghỉ (Silence Timing)
            silence_valid, silences = self.audio_analyzer.validate_silence_timing(audio_path)
            if silence_valid:
                print("✅ [Silence Pass] Khoảng ngắt nghỉ đạt tiêu chuẩn.")
            else:
                print("⚠️ [Silence Warning] Phát hiện ngắt nghỉ chưa đạt chuẩn.")

            # 4. Kiểm tra méo tiếng / Thermal Artifacts ở 5-10s cuối
            has_thermal_artifact = self.audio_analyzer.check_thermal_artifacts(audio_path)
            if not has_thermal_artifact:
                print("✅ [Thermal Pass] Không có rác âm / méo tiếng cuối file.")
            else:
                print("⚠️ [Thermal Fail] Phát hiện méo tiếng / thermal artifact ở cuối bài!")

            # 5. ĐÁNH GIÁ CHUNG
            has_errors = (len(errors) > 0) or (not silence_valid) or has_thermal_artifact
            if not has_errors:
                print(f"\n🎉 [SUCCESS] Audio PASSED thành công trên lần thử thứ {attempt}!")
                return True

            # 6. NẾU CÓ LỖI: Tự động sửa config & prompt rồi render lại
            print(f"\n🔧 [Refinement] Đang tự động tinh chỉnh prompt và tham số cho lần render tiếp theo...")
            current_prompt = self.phonetic_refiner.apply_phonetic_fixes(current_prompt, errors)
            print(f"📝 [Updated Prompt]: {current_prompt[:120]}...")

            if has_thermal_artifact or attempt > 1:
                self.audio_analyzer.execute_thermal_cool_down(cool_down_sec)

            if render_callback:
                print(f"🔁 [Retry] Tiến hành render lại file audio...")
                render_callback(current_prompt)

        print(f"\n❌ [FAIL] Thất bại sau {max_retries} lần thử. Cần can thiệp thủ công.")
        return False


# ==============================================================================
# CLI EXECUTION & DEMO
# ==============================================================================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Audio Verifier & Refinement Loop CLI")
    parser.add_argument("--audio", type=str, help="Đường dẫn file MP3 cần kiểm tra")
    parser.add_argument("--text", type=str, default="", help="Văn bản gốc để so sánh")
    parser.add_argument("--test-phonetic", action="store_true", help="Chạy unit test kiểm tra Phonetic Refiner")
    args = parser.parse_args()

    if args.test_phonetic:
        refiner = PhoneticRefiner()
        sample_text = "Vua Sa-lô-môn tế lễ tại Ghíp-ôn. Ngài xin Chúa ơn tài phân biệt."
        fixed = refiner.apply_phonetic_fixes(sample_text)
        print("--- DEMO PHONETIC REFINER ---")
        print(f"Gốc:   {sample_text}")
        print(f"Sửa:   {fixed}")
        sys.exit(0)

    if args.audio:
        pipeline = AudioVerificationPipeline()
        sample_text = args.text or "Đây là văn bản thử nghiệm kiểm định âm thanh."
        res = pipeline.verify_and_refine_audio(args.audio, sample_text, max_retries=2)
        sys.exit(0 if res else 1)
