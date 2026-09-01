import React, { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, MessageSquareText, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import AdminAudioUploader from '../components/admin/AdminAudioUploader.jsx';
import { supabase } from '../lib/supabase.js';

const STATUS_LABELS = { new: 'Mới', reviewing: 'Đang xem', resolved: 'Đã xử lý', archived: 'Lưu trữ' };

function AdminLogin({ email, password, loginError, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="w-full rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900">
        <ShieldCheck className="text-amber-700" />
        <h1 className="mt-3 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">Trang quản trị</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Đăng nhập bằng tài khoản quản trị Supabase.</p>
        <label className="mt-5 block text-sm font-bold">
          Email
          <input type="email" required value={email} onChange={onEmailChange} className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-normal dark:border-stone-700 dark:bg-stone-800" />
        </label>
        <label className="mt-3 block text-sm font-bold">
          Mật khẩu
          <input type="password" required value={password} onChange={onPasswordChange} className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-normal dark:border-stone-700 dark:bg-stone-800" />
        </label>
        {loginError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{loginError}</p>}
        <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 text-sm font-bold text-white hover:bg-amber-800"><LogIn size={16} />Đăng nhập</button>
      </form>
    </section>
  );
}

function FeedbackList({ items, loading, error, onRefresh, onStatusChange }) {
  return (
    <div>
      <div className="flex justify-end">
        <button onClick={onRefresh} className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-bold dark:border-stone-700"><RefreshCw size={15} />Làm mới</button>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {loading ? <p className="p-6 text-sm text-stone-500">Đang tải…</p> : items.length === 0 ? <p className="p-6 text-sm text-stone-500">Chưa có phản hồi.</p> : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {items.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{item.category}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800 dark:text-stone-200">{item.message}</p>
                  </div>
                  <select aria-label="Trạng thái phản hồi" value={item.status} onChange={(event) => onStatusChange(item.id, event.target.value)} className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs font-bold dark:border-stone-700 dark:bg-stone-800">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
                  <span>{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                  {item.context?.reference && <span>{item.context.reference}</span>}
                  {item.email && <a className="text-amber-700 underline" href={`mailto:${item.email}`}>{item.email}</a>}
                  <span className="max-w-full truncate">{item.page_url}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('audio');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setDataError('');
    const { data, error } = await supabase.from('feedback_items').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) setDataError('Tài khoản này chưa có quyền xem phản hồi hoặc chưa chạy migration dữ liệu.');
    else setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && activeTab === 'feedback') loadFeedback();
  }, [session, activeTab, loadFeedback]);

  const signIn = async (event) => {
    event.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError('Không thể đăng nhập. Hãy kiểm tra email và mật khẩu.');
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('feedback_items').update({ status }).eq('id', id);
    if (error) {
      setDataError('Không thể cập nhật trạng thái.');
      return;
    }
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  };

  if (!authReady) return <div className="flex min-h-[70vh] items-center justify-center text-sm text-stone-500">Đang kiểm tra phiên đăng nhập…</div>;
  if (!session) return <AdminLogin email={email} password={password} loginError={loginError} onEmailChange={(event) => setEmail(event.target.value)} onPasswordChange={(event) => setPassword(event.target.value)} onSubmit={signIn} />;

  return (
    <section className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Quản trị</p>
          <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">Nội dung website</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-bold dark:border-stone-700"><LogOut size={15} />Đăng xuất</button>
      </div>

      <div className="mt-6 flex gap-2 border-b border-stone-200 dark:border-stone-800" role="tablist" aria-label="Công cụ quản trị">
        <button role="tab" aria-selected={activeTab === 'audio'} onClick={() => setActiveTab('audio')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === 'audio' ? 'border-amber-700 text-amber-800 dark:text-amber-300' : 'border-transparent text-stone-500'}`}><UploadCloud size={16} />Kho audio</button>
        <button role="tab" aria-selected={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === 'feedback' ? 'border-amber-700 text-amber-800 dark:text-amber-300' : 'border-transparent text-stone-500'}`}><MessageSquareText size={16} />Phản hồi</button>
      </div>

      <div className="mt-6">
        {activeTab === 'audio'
          ? <AdminAudioUploader session={session} />
          : <FeedbackList items={items} loading={loading} error={dataError} onRefresh={loadFeedback} onStatusChange={updateStatus} />}
      </div>
    </section>
  );
}
