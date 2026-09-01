export const getPasswordRecoveryRedirect = (origin) => `${origin.replace(/\/+$/, '')}/admin/reset-password`;

export const getRecoveryLinkError = (hash) => {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const code = params.get('error_code');
  if (!code) return '';
  if (code === 'otp_expired') return 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu một email mới.';
  return 'Liên kết đặt lại mật khẩu không hợp lệ. Hãy yêu cầu một email mới.';
};

export const validateNewAdminPassword = (password, confirmation) => {
  if (password.length < 12) return 'Mật khẩu cần có ít nhất 12 ký tự.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Mật khẩu cần có chữ thường, chữ hoa, số và ký tự đặc biệt.';
  }
  if (password !== confirmation) return 'Hai mật khẩu chưa trùng khớp.';
  return '';
};
