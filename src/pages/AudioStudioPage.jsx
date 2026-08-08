import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Mic, 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Clock, 
  Settings, 
  RefreshCw,
  Folder,
  Layers,
  Info,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Sparkles,
  Volume2,
  Square,
  Terminal,
  VolumeX,
  Music2,
  SlidersHorizontal,
  ChevronDown,
  Music,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  FileAudio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanScriptureTextOnUI, cleanScriptureTextForTTS } from '../utils/scriptureCleaner.js';
import { fetchAudioAccessStreamUrl } from '../utils/bibleService.js';

// ─── Preset Prosody ─────────────────────────────────────────────────────────
const PAUSE_PRESETS = [
  {
    id: 'liturgy',
    label: 'Phụng Vụ',
    emoji: '🕊️',
    description: 'Bài đọc thông thường, trang nghiêm',
    voice: 'hao',
    voiceLabel: 'Giọng Hảo (Nam)',
    color: 'amber',
    paragraph: 0.60,
    sentence: 0.45,
    major: 0.30,
    medium: 0.25,
  },
  {
    id: 'gospel',
    label: 'Tin Mừng',
    emoji: '✝️',
    description: 'Ấm áp, nhấn vào lời thoại',
    voice: 'trieu_duong',
    voiceLabel: 'Giọng Triều Dương (Nam)',
    color: 'emerald',
    paragraph: 0.75,
    sentence: 0.50,
    major: 0.35,
    medium: 0.22,
  },
  {
    id: 'dramatic',
    label: 'Kịch Tính',
    emoji: '⚔️',
    description: 'Tiên tri, khải huyền, dồn dập',
    voice: 'trieu_duong',
    voiceLabel: 'Giọng Triều Dương (Nam)',
    color: 'rose',
    paragraph: 1.00,
    sentence: 0.70,
    major: 0.50,
    medium: 0.20,
  },
  {
    id: 'psalm',
    label: 'Thi Thiên',
    emoji: '🎵',
    description: 'Thơ, ca ngợi, nhịp nhàng',
    voice: 'giang_clean',
    voiceLabel: 'Giang Clean (Nữ)',
    color: 'violet',
    paragraph: 0.80,
    sentence: 0.60,
    major: 0.40,
    medium: 0.25,
  },
];

const PRESET_COLORS = {
  amber:   { ring: 'ring-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-400/60',   text: 'text-amber-700 dark:text-amber-300',   badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  emerald: { ring: 'ring-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-400/60', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  rose:    { ring: 'ring-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-400/60',    text: 'text-rose-700 dark:text-rose-300',    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
  violet:  { ring: 'ring-violet-500',  bg: 'bg-violet-500/10',  border: 'border-violet-400/60',  text: 'text-violet-700 dark:text-violet-300',  badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
};

const playSuccessBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Hàm tạo 1 tiếng chuông nhỏ
    const playNote = (freq, startTime, duration, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Chỉnh âm lượng (tăng lên so với bản cũ)
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Tiếng chuông đôi (Double Beep) vui tai: Mi (E6) -> Sol (G6)
    playNote(1318.51, ctx.currentTime, 0.15, 0.3);       // E6
    playNote(1567.98, ctx.currentTime + 0.15, 0.4, 0.4); // G6
  } catch(e) {
    console.warn('AudioContext not supported or blocked', e);
  }
};

export default function AudioStudioPage() {
  const [ref, setRef] = useState("1 V 3,5.7-12");
  const [intro, setIntro] = useState("Bài trích sách các Vua quyển thứ nhất.");
  const [content, setContent] = useState(
    "Hồi ấy, tại Ghíp-ôn, đang đêm Đức Chúa hiện ra báo mộng cho vua Sa-lô-môn, Thiên Chúa phán : “Ngươi cứ xin đi, Ta sẽ ban cho.” Vua Sa-lô-môn thưa : “Lạy Đức Chúa là Thiên Chúa của con, chính Chúa đã đặt tôi tớ Chúa đây lên ngôi kế vị Đa-vít, thân phụ con...”"
  );
  const [section, setSection] = useState("r1"); // "r1", "r2", "gospel"
  const [voice, setVoice] = useState("hao"); // "hao", "giang", "trieu_duong", "custom"
  const [sectionLabel, setSectionLabel] = useState("Bài đọc một.");
  const [customVoiceTrackId, setCustomVoiceTrackId] = useState(null);
  const [customVoiceName, setCustomVoiceName] = useState("");
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const fileInputRef = useRef(null);

  const getAudioApiBase = useCallback(() => {
    const base = import.meta.env.VITE_AUDIO_API_BASE || (import.meta.env.DEV ? 'http://localhost:5005' : '');
    return base.replace(/\/+$/, '');
  }, []);

  // Thời gian ngắt nghỉ Phụng vụ (giây)
  const [paragraphPause, setParagraphPause] = useState(0.60);
  const [sentencePause, setSentencePause] = useState(0.45);
  const [majorPause, setMajorPause] = useState(0.30);
  const [mediumPause, setMediumPause] = useState(0.25);
  const [activePreset, setActivePreset] = useState('liturgy');

  const applyPreset = useCallback((preset) => {
    setActivePreset(preset.id);
    setParagraphPause(preset.paragraph);
    setSentencePause(preset.sentence);
    setMajorPause(preset.major);
    setMediumPause(preset.medium);
    setVoice(preset.voice);
  }, []);

  const resetPauses = () => {
    applyPreset(PAUSE_PRESETS[0]);
  };

  const [rendering, setRendering] = useState(false);
  const [resultAudioUrl, setResultAudioUrl] = useState(null);
  const [resultPath, setResultPath] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusNotice, setStatusNotice] = useState(null);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [existingAudioFiles, setExistingAudioFiles] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);

  // Fetch danh sách tất cả các file audio có sẵn trên đĩa khi mở trang
  const fetchExistingAudioList = useCallback(async () => {
    try {
      const apiBase = getAudioApiBase();
      const res = await fetch(`${apiBase}/api/list-audio`);
      const data = await res.json();
      if (data && data.files) {
        setExistingAudioFiles(data.files);
      }
    } catch (e) {}
  }, [getAudioApiBase]);

  useEffect(() => {
    fetchExistingAudioList();
  }, [fetchExistingAudioList]);

  // Tự động kiểm tra trực tiếp trên đĩa xem file audio đã có sẵn chưa
  useEffect(() => {
    if (!ref.trim()) {
      setStatusNotice(null);
      setResultAudioUrl(null);
      return;
    }

    const checkAudioOnDisk = async () => {
      try {
        const apiBase = getAudioApiBase();
        const response = await fetch(`${apiBase}/api/check-audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref, section })
        });
        const data = await response.json();
        if (data && data.exists && data.trackId) {
          const streamUrl = await fetchAudioAccessStreamUrl(data.trackId);
          setResultAudioUrl(streamUrl);
          setResultPath(`private/audio (Track ID: ${data.trackId})`);
          setStatusNotice(`⚡ Đã tìm thấy file audio trong kho private (${data.filename} - ${data.size_kb} KB)! Đã cấp signed token phát stream.`);
          return;
        } else {
          setResultAudioUrl(null);
          setResultPath(null);
          setStatusNotice(`ℹ️ Trích dẫn ${ref} chưa có file audio trong kho private. Bấm nút "Tiến Hành Render Audio AI Ngay" bên dưới để tạo mới.`);
          return;
        }
      } catch (err) {
        setResultAudioUrl(null);
        setResultPath(null);
        setStatusNotice(null);
      }
    };

    checkAudioOnDisk();
  }, [ref, section, getAudioApiBase]);

  // Upload file giọng mẫu tùy chỉnh lên server
  const handleCustomVoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingVoice(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('voice_file', file);

    try {
      const apiBase = getAudioApiBase();
      const response = await fetch(`${apiBase}/api/upload-voice`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Lỗi khi tải lên file giọng mẫu');
      }

      setCustomVoiceTrackId(data.trackId);
      setCustomVoiceName(data.filename);
      setVoice('custom');
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setUploadingVoice(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearCustomVoice = () => {
    setCustomVoiceTrackId(null);
    setCustomVoiceName('');
    // Quay về giọng mặc định theo loại bài
    setVoice(section === 'gospel' ? 'trieu_duong' : (section === 'r1' ? 'hao' : 'giang'));
  };

  // Tự động chuyển đổi sectionLabel & voice khi chọn loại bài
  const handleSectionChange = (newSec) => {
    setSection(newSec);
    if (newSec === "r1") {
      setSectionLabel("Bài đọc một.");
      setVoice("hao");
    } else if (newSec === "r2") {
      setSectionLabel("Bài đọc hai.");
      setVoice("giang");
    } else if (newSec === "gospel") {
      setSectionLabel("");
      setVoice("trieu_duong");
    }
  };

  // Preview văn bản đã làm sạch 6-Layer
  const cleanedPreview = useMemo(() => {
    const raw = `${sectionLabel ? sectionLabel + '\n' : ''}${intro}\n${content}`;
    return cleanScriptureTextOnUI(raw);
  }, [sectionLabel, intro, content]);

  // CLI Command cho user muốn copy chạy trực tiếp
  const cliCommand = useMemo(() => {
    if (voice === 'custom') {
      return '# CHÚ Ý: Giọng đọc tùy chỉnh (Custom Voice) cần thực thi trực tiếp qua Giao Diện Studio / API Server (POST /api/render-audio với custom_voice_track_id) để bảo mật kho private audio.';
    }

    const esc = (str) => `"${str.replace(/"/g, '\\"')}"`;
    const cleanRef = ref.trim().replace(/[\.,:;()\\/*?\"<>|]/g, '').replace(/\s*-\s*/g, '-').replace(/\s+/g, '_') || "custom_audio";
    const sub = section === "r2" ? "readings/r2" : (section === "gospel" ? "gospels" : "readings/r1");
    const pref = section === "r2" ? "r2" : (section === "gospel" ? "gospel" : "r1");
    const out = `/Users/tranthithuynhi/loi-chua-hang-ngay/private/audio/${sub}/${pref}_${cleanRef}.mp3`;
    const script = section === "gospel" ? "generate_single_gospel_mp3.py" : "generate_single_reading_mp3.py";
    const voiceArg = '""';

    const cleanedIntro = cleanScriptureTextForTTS(intro);
    const cleanedContent = cleanScriptureTextForTTS(content);
    const cleanedSecLabel = cleanScriptureTextForTTS(sectionLabel);

    return `/Users/tranthithuynhi/OmniVoice-Studio/.venv/bin/python /Users/tranthithuynhi/loi-chua-hang-ngay/scripts/${script} ${esc(ref)} ${esc(cleanedIntro)} ${esc(cleanedContent)} ${esc(out)} ${section !== "gospel" ? esc(cleanedSecLabel) + " " : ""}16 false true ${voiceArg} ${paragraphPause} ${sentencePause} ${majorPause} ${mediumPause}`;
  }, [ref, intro, content, section, sectionLabel, voice, paragraphPause, sentencePause, majorPause, mediumPause]);

  // Thực thi Render Audio qua API Server
  const handleRenderAudio = async () => {
    if (!content.trim()) {
      setErrorMessage("Vui lòng nhập nội dung bài đọc!");
      return;
    }

    setRendering(true);
    setErrorMessage(null);
    setResultAudioUrl(null);

    const cleanedIntro = cleanScriptureTextForTTS(intro);
    const cleanedContent = cleanScriptureTextForTTS(content);
    const cleanedSecLabel = cleanScriptureTextForTTS(sectionLabel);

    try {
      const apiBase = getAudioApiBase();
      const response = await fetch(`${apiBase}/api/render-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref,
          intro: cleanedIntro,
          content: cleanedContent,
          voice,
          section,
          section_label: cleanedSecLabel,
          overwrite: forceOverwrite,
          custom_voice_track_id: voice === 'custom' ? customVoiceTrackId : null,
          pause_config: {
            paragraph: paragraphPause,
            sentence: sentencePause,
            major: majorPause,
            medium: mediumPause
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Không thể kết nối đến Render Server API");
      }

      if (data.trackId) {
        const streamUrl = await fetchAudioAccessStreamUrl(data.trackId);
        setResultAudioUrl(streamUrl);
        setResultPath(`private/audio (Track ID: ${data.trackId})`);
      }

      if (data.existing) {
        setStatusNotice("⚡ File Audio đã có sẵn trong kho private! Đã tạo signed stream token.");
      } else {
        setStatusNotice("🎉 Đã Render Audio AI thành công và lưu vào kho private!");
        playSuccessBeep();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Lỗi khi kết nối Render API. Vui lòng kiểm tra lại server backend.");
    } finally {
      setRendering(false);
    }
  };

  const copyToClipboard = (text, type = "url") => {
    navigator.clipboard.writeText(text);
    if (type === "cli") {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePlayAudio = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (audioRef.current && resultAudioUrl) {
        audioRef.current.load();
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("Lỗi phát audio server, chuyển sang Web Speech TTS:", err);
            speakWebSpeechFallback();
          });
      } else {
        speakWebSpeechFallback();
      }
    }
  };

  const speakWebSpeechFallback = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = cleanedPreview.replace(/<[^>]*>/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative mb-8 p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white shadow-xl overflow-hidden border border-amber-500/30">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Mic size={280} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-100 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} className="animate-spin" /> Studio Tạo Audio Phụng Vụ AI Pro
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight mb-3">
            Trình Render Audio Bài Đọc Tùy Chỉnh
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            Nhập bất kỳ đoạn văn bản Kinh Thánh hoặc bài đọc Phụng vụ để sinh audio AI với giọng đọc chuẩn Nữ Bắc (Giang) & Nam (Triều Dương), tuân thủ 100% file cấu hình Master <code className="bg-black/30 px-2 py-0.5 rounded text-amber-200 font-mono text-xs">LITURGY_AUDIO_CONFIG.md</code>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cột trái: Form nhập liệu & Cấu hình */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-4">
              <FileText className="text-amber-600 dark:text-amber-400" size={20} />
              Thông Tin & Văn Bản Bài Đọc
            </h2>

            {/* Chọn Loại Bài Đọc */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Loại Bài Đọc & Tiền Tố Lưu Trữ
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSectionChange("r1")}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 ${
                    section === "r1"
                      ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-300"
                  }`}
                >
                  <Layers size={16} />
                  Bài Đọc 1 (r1_)
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionChange("r2")}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 ${
                    section === "r2"
                      ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-300"
                  }`}
                >
                  <Layers size={16} />
                  Bài Đọc 2 (r2_)
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionChange("gospel")}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 ${
                    section === "gospel"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-emerald-300"
                  }`}
                >
                  <Mic size={16} />
                  Tin Mừng (gospel_)
                </button>
              </div>
            </div>

            {/* Form Fields: Trích dẫn, Nhãn, Giọng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Trích Dẫn Kinh Thánh (`ref`)
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="Ví dụ: 1 V 3,5.7-12"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Nhãn Câu Mở Đầu (`section_label`)
                </label>
                <input
                  type="text"
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                  placeholder="Bài đọc một. / Bài đọc hai."
                  disabled={section === "gospel"}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Giọng Đọc Mẫu */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Giọng Đọc Mẫu OmniVoice AI
              </label>

              {/* Hàng 1: 3 giọng chính */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <label className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  voice === "hao"
                    ? "border-sky-600 bg-sky-50/60 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
                }`}>
                  <input type="radio" name="voice" value="hao" checked={voice === "hao"} onChange={() => setVoice("hao")} className="accent-sky-600" />
                  <div>
                    <div className="font-bold text-xs">Giọng Hảo</div>
                    <div className="text-[11px] opacity-75">Nam • Bài Đọc 1</div>
                  </div>
                </label>

                <label className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  voice === "giang"
                    ? "border-amber-600 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
                }`}>
                  <input type="radio" name="voice" value="giang" checked={voice === "giang"} onChange={() => setVoice("giang")} className="accent-amber-600" />
                  <div>
                    <div className="font-bold text-xs">Giang Gốc</div>
                    <div className="text-[11px] opacity-75">Nữ • Bài Đọc 2</div>
                  </div>
                </label>

                <label className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  voice === "trieu_duong"
                    ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
                }`}>
                  <input type="radio" name="voice" value="trieu_duong" checked={voice === "trieu_duong"} onChange={() => setVoice("trieu_duong")} className="accent-emerald-600" />
                  <div>
                    <div className="font-bold text-xs">Triều Dương</div>
                    <div className="text-[11px] opacity-75">Nam • Tin Mừng</div>
                  </div>
                </label>
              </div>

              {/* Hàng 2: Biến thể Giang đã xử lý */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                  voice === "giang_clean"
                    ? "border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 text-violet-950 dark:text-violet-100"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
                }`}>
                  <input type="radio" name="voice" value="giang_clean" checked={voice === "giang_clean"} onChange={() => setVoice("giang_clean")} className="accent-violet-600" />
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      Giang Clean
                      <span className="px-1 py-0.5 rounded text-[9px] bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-mono">3.7s</span>
                    </div>
                    <div className="text-[10px] opacity-75">Nữ • Đoạn liên tục, ít ngắt</div>
                  </div>
                </label>

                <label className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                  voice === "giang_enhanced"
                    ? "border-fuchsia-600 bg-fuchsia-50/60 dark:bg-fuchsia-950/30 text-fuchsia-950 dark:text-fuchsia-100"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
                }`}>
                  <input type="radio" name="voice" value="giang_enhanced" checked={voice === "giang_enhanced"} onChange={() => setVoice("giang_enhanced")} className="accent-fuchsia-600" />
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      Giang Enhanced
                      <span className="px-1 py-0.5 rounded text-[9px] bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300 font-mono">9s</span>
                    </div>
                    <div className="text-[10px] opacity-75">Nữ • Loudnorm -14dB</div>
                  </div>
                </label>
              </div>

              {/* Import giọng mẫu tùy chỉnh */}
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.m4a,.ogg"
                  onChange={handleCustomVoiceUpload}
                  className="hidden"
                  id="custom-voice-input"
                />

                {voice === 'custom' && customVoiceName ? (
                  <div className="flex items-center gap-2 p-3 rounded-2xl border border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100">
                    <input
                      type="radio"
                      name="voice"
                      value="custom"
                      checked={true}
                      readOnly
                      className="accent-violet-600"
                    />
                    <Volume2 size={16} className="text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">Giọng Tùy Chỉnh</div>
                      <div className="text-[11px] opacity-75 truncate">{customVoiceName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={clearCustomVoice}
                      className="p-1 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors cursor-pointer shrink-0"
                      title="Xóa giọng tùy chỉnh"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingVoice}
                    className="w-full p-3 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-violet-400 dark:hover:border-violet-600 text-stone-500 dark:text-stone-400 hover:text-violet-600 dark:hover:text-violet-300 transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {uploadingVoice ? (
                      <><RefreshCw size={14} className="animate-spin" /> Đang tải lên...</>
                    ) : (
                      <><Upload size={14} /> Import File Giọng Mẫu Tùy Chỉnh (.mp3, .wav)</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Câu mở đầu (Intro) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Câu Trích Phụng Vụ Mở Đầu (`intro`)
              </label>
              <input
                type="text"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Ví dụ: Bài trích sách các Vua quyển thứ nhất."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Thân bài nội dung (Content) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Nội Dung Thân Bài Đọc (`content`)
              </label>
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập hoặc dán bất kỳ văn bản bài đọc nào..."
                data-lenis-prevent
                className="w-full p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-serif overflow-y-auto resize-y min-h-[160px] max-h-[500px]"
              />
            </div>

            {/* Checkbox Tùy Chọn Ghi Đè File Audio */}
            <div className="flex items-center gap-2 px-1 py-1">
              <input
                type="checkbox"
                id="force-overwrite-check"
                checked={forceOverwrite}
                onChange={(e) => setForceOverwrite(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="force-overwrite-check" className="text-xs text-stone-600 dark:text-stone-400 font-medium cursor-pointer select-none">
                Ép buộc render lại từ đầu với AI (Ghi đè file audio cũ nếu đã tồn tại)
              </label>
            </div>

            {/* Action Render Button */}
            <button
              type="button"
              onClick={handleRenderAudio}
              disabled={rendering}
              className="w-full py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-amber-600/25 flex items-center justify-center gap-3 transition-all disabled:opacity-50 cursor-pointer"
            >
              {rendering ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  <span>Đang Render Audio AI (Tách cụm Phụng vụ & xả nhiệt GPU...)...</span>
                </>
              ) : (
                <>
                  <Mic size={20} />
                  <span>Tiến Hành Render Audio AI Ngay</span>
                </>
              )}
            </button>

            {statusNotice && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-xs ${
                statusNotice.startsWith("⚡") || statusNotice.startsWith("🎉")
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              }`}>
                {statusNotice.startsWith("⚡") || statusNotice.startsWith("🎉") ? (
                  <CheckCircle size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Info size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <span>{statusNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Preview Làm Sạch & Trình Phát Audio */}
        <div className="lg:col-span-5 space-y-6">
          {/* Panel Danh sách File Audio có sẵn trên đĩa */}
          {existingAudioFiles.length > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Folder className="text-amber-600 dark:text-amber-400" size={16} />
                  <span>File Audio Đã Có Sẵn Trên Đĩa ({existingAudioFiles.length} files)</span>
                </h3>
                <button type="button" onClick={fetchExistingAudioList} className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer">
                  Làm mới
                </button>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Bấm vào file bên dưới để chọn nhanh bài đọc và nghe audio có sẵn:
              </p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800">
                {existingAudioFiles.map((file) => (
                  <button
                    key={file.url}
                    type="button"
                    onClick={() => {
                      const cleanRefPart = file.filename.replace(/^(r1_|r2_|gospel_)/, '').replace(/\.mp3$/, '').replace(/_/g, ' ');
                      setRef(cleanRefPart);
                      const secType = file.prefix === 'gospel' ? 'gospel' : (file.prefix === 'r2' ? 'r2' : 'r1');
                      handleSectionChange(secType);
                      setResultAudioUrl(file.url);
                      setResultPath(`/Users/tranthithuynhi/loi-chua-hang-ngay/public${file.url}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-medium bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 text-stone-800 dark:text-stone-200 shadow-2xs transition-all cursor-pointer"
                  >
                    <Volume2 size={12} className="text-amber-600 shrink-0" />
                    <span className="font-semibold">{file.filename}</span>
                    <span className="text-[9px] text-stone-400">({file.size_kb} KB)</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Trình Phát Kết Quả Audio */}
          {resultAudioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-stone-900 to-stone-950 text-white shadow-xl border border-amber-500/40 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                  <CheckCircle2 size={14} /> Render Thành Công
                </span>
                <span className="text-xs text-stone-400 font-mono">{section.toUpperCase()}</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlayAudio}
                  className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-bold truncate text-amber-200">{ref}</div>
                  <div className="text-xs text-stone-400 font-mono truncate">{resultAudioUrl}</div>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={resultAudioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex gap-2 pt-2 border-t border-stone-800">
                <button
                  onClick={() => copyToClipboard(resultAudioUrl)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? "Đã copy đường dẫn!" : "Copy Audio URL"}</span>
                </button>

                <a
                  href={resultAudioUrl}
                  download
                  className="py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-amber-500/30"
                >
                  <Download size={14} />
                  <span>Tải File MP3</span>
                </a>
              </div>
            </motion.div>
          )}

          {/* Cấu Hình Ngắt Nghỉ Master (Preset) */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Zap className="text-amber-500" size={16} />
                Preset Giọng Đọc &amp; Nhịp Ngắt Nghỉ
              </h3>
              <button
                type="button"
                onClick={resetPauses}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Đặt lại mặc định
              </button>
            </div>

            {/* Preset Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {PAUSE_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                const c = PRESET_COLORS[preset.color];
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`relative p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer group ${
                      isActive
                        ? `${c.border} ${c.bg} ring-2 ${c.ring} ring-offset-1 dark:ring-offset-stone-900`
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50 dark:bg-stone-950'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2 right-2">
                        <CheckCircle2 size={14} className={c.text} />
                      </span>
                    )}
                    <div className="text-lg mb-1">{preset.emoji}</div>
                    <div className={`font-bold text-xs ${isActive ? c.text : 'text-stone-700 dark:text-stone-300'}`}>
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                      {preset.description}
                    </div>
                    {/* Pause summary */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${isActive ? c.badge : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                        ¶ {preset.paragraph}s
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${isActive ? c.badge : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                        . {preset.sentence}s
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${isActive ? c.badge : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                        ; {preset.major}s
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${isActive ? c.badge : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                        , {preset.medium}s
                      </span>
                    </div>
                    {/* Voice badge */}
                    <div className={`mt-1.5 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${isActive ? c.badge : 'bg-stone-100 dark:bg-stone-800 text-stone-400'}`}>
                      <Music2 size={9} />
                      {preset.voiceLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fine-tune sliders */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clock size={13} className="text-stone-400" />
                <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Tinh Chỉnh Thủ Công</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 block text-[10px] mb-1">¶ Đoạn văn (\n)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" step="0.05" min="0.05" max="5.0"
                      value={paragraphPause}
                      onChange={(e) => { setActivePreset(null); setParagraphPause(parseFloat(e.target.value) || 0); }}
                      className="w-16 px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                    />
                    <span className="text-stone-500 text-[11px]">s</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 block text-[10px] mb-1">. ! ? Hết câu</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" step="0.05" min="0.05" max="5.0"
                      value={sentencePause}
                      onChange={(e) => { setActivePreset(null); setSentencePause(parseFloat(e.target.value) || 0); }}
                      className="w-16 px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                    />
                    <span className="text-stone-500 text-[11px]">s</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 block text-[10px] mb-1">: ; Ngắt lớn</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" step="0.05" min="0.05" max="5.0"
                      value={majorPause}
                      onChange={(e) => { setActivePreset(null); setMajorPause(parseFloat(e.target.value) || 0); }}
                      className="w-16 px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                    />
                    <span className="text-stone-500 text-[11px]">s</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 block text-[10px] mb-1">, Dấu phẩy</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" step="0.02" min="0.02" max="5.0"
                      value={mediumPause}
                      onChange={(e) => { setActivePreset(null); setMediumPause(parseFloat(e.target.value) || 0); }}
                      className="w-16 px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                    />
                    <span className="text-stone-500 text-[11px]">s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview 6-Layer Scripture Cleaner */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sparkles className="text-amber-600 dark:text-amber-400" size={16} />
              Xem Trước Văn Bản Đã Làm Sạch (6-Layer Cleaner)
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              Tự động xóa số câu dính ngoặc `”7`, chỉ số superscript `¹²`, sửa địa danh `Ghíp-ôn` ➔ `Gíp Ôn`, `Sa-lô-môn` ➔ `Sa Lô Môn`, `ít-ra-en` ➔ `Ít Ra En` và bảo toàn 100% dấu chấm câu.
            </p>
            <div data-lenis-prevent className="p-4 rounded-2xl bg-amber-50/50 dark:bg-stone-950 border border-amber-200/60 dark:border-stone-800 text-xs font-serif leading-relaxed text-stone-800 dark:text-stone-200 max-h-56 overflow-y-auto whitespace-pre-wrap select-all">
              {cleanedPreview || "(Văn bản rỗng)"}
            </div>
          </div>

          {/* CLI Command Box */}
          <div className="bg-stone-900 text-stone-300 rounded-3xl p-6 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 font-mono">Terminal CLI Command</span>
              <button
                onClick={() => copyToClipboard(cliCommand, "cli")}
                className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedCli ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedCli ? "Đã copy!" : "Copy CLI"}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-black/50 text-[11px] font-mono text-stone-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-stone-800">
              {cliCommand}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
