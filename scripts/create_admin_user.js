import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_SERVICE_ROLE_KEY trong .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin(email, password) {
  if (!email || !password) {
    console.log("👉 Sử dụng cú pháp: node scripts/create_admin_user.js <email> <password>");
    console.log("Ví dụ: node scripts/create_admin_user.js admin@loichua.vn MatKhauManh123@");
    process.exit(1);
  }

  console.log(`👤 Đang tạo tài khoản Quản trị viên: ${email}...`);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Tự động xác thực email ngay lập tức
    app_metadata: {
      role: 'feedback_admin' // Gán quyền feedback_admin để truy cập trang quản trị
    }
  });

  if (error) {
    console.error("❌ Lỗi khi tạo tài khoản:", error.message);
    process.exit(1);
  }

  console.log("===============================================================");
  console.log("🎉 TẠO TÀI KHOẢN QUẢN TRỊ VIÊN THÀNH CÔNG!");
  console.log(`- Email:    ${data.user.email}`);
  console.log(`- User ID:  ${data.user.id}`);
  console.log(`- Quyền:    feedback_admin (Đã xác thực email)`);
  console.log("===============================================================");
  console.log("👉 Bây giờ bạn có thể đăng nhập ngay tại trang Quản trị (/admin/feedback)");
}

const [,, emailArg, passwordArg] = process.argv;
createAdmin(emailArg, passwordArg);
