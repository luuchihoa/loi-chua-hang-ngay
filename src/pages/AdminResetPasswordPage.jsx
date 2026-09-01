import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/seo/SEO.jsx';
import { supabase } from '../lib/supabase.js';
import { getRecoveryLinkError, validateNewAdminPassword } from '../utils/adminPasswordRecovery.js';

export default function AdminResetPasswordPage() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [linkError] = useState(() => getRecoveryLinkError(window.location.hash));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setSession(nextSession);
      }
      setAuthReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (event) => {
    event.preventDefault();
    const validationError = validateNewAdminPassword(password, confirmation);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError('Không thể đổi mật khẩu. Liên kết có thể đã hết hạn; hãy yêu cầu một email mới.');
      setSaving(false);
      return;
    }

    await supabase.auth.signOut({ scope: 'global' });
    navigate('/admin?password=updated', { replace: true });
  };

  const unavailable = linkError || (authReady && !session);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8">
      <SEO title="Đặt lại mật khẩu quản trị" description="Trang bảo mật dành cho quản trị viên." robots="noindex, nofollow, noarchive" />
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900">
        {unavailable ? (
          <>
            <KeyRound className="text-rose-600" />
            <h1 className="mt-3 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">Không thể dùng liên kết này</h1>
            <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{linkError || 'Phiên đặt lại mật khẩu không tồn tại hoặc đã hết hạn.'}</p>
            <Link to="/admin?forgot=1" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 text-sm font-bold text-white hover:bg-amber-800"><ArrowLeft size={16} />Yêu cầu email mới</Link>
          </>
        ) : !authReady ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={18} />Đang xác minh liên kết…</div>
        ) : (
          <form onSubmit={updatePassword}>
            <CheckCircle2 className="text-emerald-600" />
            <h1 className="mt-3 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">Tạo mật khẩu mới</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Dùng ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
            <label className="mt-5 block text-sm font-bold">
              Mật khẩu mới
              <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-normal dark:border-stone-700 dark:bg-stone-800" />
            </label>
            <label className="mt-3 block text-sm font-bold">
              Nhập lại mật khẩu
              <input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-normal dark:border-stone-700 dark:bg-stone-800" />
            </label>
            {formError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{formError}</p>}
            <button disabled={saving} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />}{saving ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}</button>
          </form>
        )}
      </div>
    </section>
  );
}
