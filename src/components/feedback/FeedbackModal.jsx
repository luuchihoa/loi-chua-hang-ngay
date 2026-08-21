import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageCircleHeart, Send, X } from 'lucide-react';
import { FEEDBACK_CATEGORIES, submitFeedback } from '../../lib/feedbackService.js';

export default function FeedbackModal({ request, onClose }) {
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!request) return;
    setCategory(request.category || 'suggestion');
    setMessage('');
    setEmail('');
    setWebsite('');
    setStatus('idle');
    setError('');
  }, [request]);

  const context = useMemo(() => ({
    source: request?.source || 'general',
    reference: request?.reference || null,
    audio_position_seconds: request?.audioPositionSeconds ?? null,
    theme: document.documentElement.classList.contains('theme-sepia') ? 'sepia' : document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  }), [request]);

  if (!request) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (message.trim().length < 8) {
      setError('Xin viết ít nhất 8 ký tự để chúng tôi hiểu góp ý của bạn.');
      return;
    }
    setIsSending(true);
    setError('');
    try {
      await submitFeedback({
        category,
        message,
        email,
        website,
        pageUrl: window.location.href,
        context,
      });
      setStatus('success');
    } catch (submissionError) {
      setError('Chưa thể gửi phản hồi. Vui lòng thử lại sau ít phút.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div data-ui-layer="modal-root" className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-5">
      <button type="button" aria-label="Đóng biểu mẫu góp ý" onClick={onClose} data-ui-layer="modal-backdrop" className="absolute inset-0 bg-stone-950/55 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="feedback-title" data-ui-layer="modal-content" className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-stone-200 bg-[#fffdf8] p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        {status === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 id="feedback-title" className="mt-4 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">Cảm ơn bạn</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-600 dark:text-stone-300">Phản hồi của bạn đã được gửi đến ban quản trị để cải thiện việc đọc và nghe Lời Chúa.</p>
            <button type="button" onClick={onClose} className="mt-6 min-h-[44px] rounded-xl bg-amber-700 px-5 text-sm font-bold text-white transition-colors hover:bg-amber-800">Đóng</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><MessageCircleHeart size={18} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Góp ý</span></div>
                <h2 id="feedback-title" className="mt-1 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">Giúp chúng tôi phục vụ tốt hơn</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Đóng biểu mẫu góp ý" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"><X size={20} /></button>
            </div>

            {request.reference && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Ngữ cảnh: {request.reference}</p>}

            <fieldset className="mt-5">
              <legend className="text-sm font-bold text-stone-800 dark:text-stone-200">Bạn muốn góp ý về điều gì?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {FEEDBACK_CATEGORIES.map((item) => (
                  <button key={item.value} type="button" onClick={() => setCategory(item.value)} className={`min-h-[58px] rounded-xl border p-3 text-left transition-colors ${category === item.value ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600/30 dark:bg-amber-950/25' : 'border-stone-200 hover:border-amber-300 dark:border-stone-700'}`}>
                    <span className="block text-xs font-bold text-stone-900 dark:text-stone-100">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-stone-500 dark:text-stone-400">{item.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-bold text-stone-800 dark:text-stone-200">Nội dung góp ý
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} required rows={5} placeholder="Xin cho chúng tôi biết chi tiết để có thể cải thiện…" className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm font-normal text-stone-900 outline-none transition focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
              <span className="mt-1 block text-right text-[11px] font-normal text-stone-400">{message.length}/500</span>
            </label>

            <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">Email để chúng tôi có thể phản hồi <span className="font-normal text-stone-400">(tùy chọn)</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal text-stone-900 outline-none transition focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
            </label>
            <input tabIndex="-1" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="hidden" aria-hidden="true" />
            <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">Không gửi thông tin riêng tư hoặc nội dung xưng tội. Chúng tôi gửi trang hiện tại và ngữ cảnh kỹ thuật tối thiểu để xử lý lỗi.</p>
            {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
            <button disabled={isSending} type="submit" className="mt-5 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-bold text-white transition-colors hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"><Send size={16} />{isSending ? 'Đang gửi…' : 'Gửi góp ý'}</button>
          </form>
        )}
      </section>
    </div>
  );
}
