import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getPasswordRecoveryRedirect,
  getRecoveryLinkError,
  validateNewAdminPassword,
} from '../src/utils/adminPasswordRecovery.js';

test('Admin password recovery', async (t) => {
  await t.test('always redirects recovery email to the dedicated page', () => {
    assert.equal(getPasswordRecoveryRedirect('https://loichuamoingay.org/'), 'https://loichuamoingay.org/admin/reset-password');
  });

  await t.test('shows a safe message for expired or invalid links', () => {
    assert.match(getRecoveryLinkError('#error=access_denied&error_code=otp_expired'), /hết hạn/);
    assert.match(getRecoveryLinkError('#error=access_denied&error_code=bad_token'), /không hợp lệ/);
    assert.equal(getRecoveryLinkError('#access_token=token&type=recovery'), '');
  });

  await t.test('requires a strong matching password', () => {
    assert.match(validateNewAdminPassword('short', 'short'), /12 ký tự/);
    assert.match(validateNewAdminPassword('onlylowercase123', 'onlylowercase123'), /chữ thường/);
    assert.match(validateNewAdminPassword('StrongPassword1!', 'StrongPassword2!'), /chưa trùng khớp/);
    assert.equal(validateNewAdminPassword('StrongPassword1!', 'StrongPassword1!'), '');
  });

  await t.test('keeps the recovery page out of search indexes', () => {
    const source = fs.readFileSync(new URL('../src/pages/AdminResetPasswordPage.jsx', import.meta.url), 'utf8');
    assert.match(source, /noindex, nofollow, noarchive/);
    assert.match(source, /supabase\.auth\.updateUser/);
    assert.match(source, /scope: 'global'/);
  });
});
