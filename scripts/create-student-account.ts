import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Hàm chuyển đổi username thành email giả
const toFakeEmail = (username: string) => `${username.toLowerCase()}@giaoly.local`;

async function generatePasswordForAllStudents() {
  console.log("🔄 Đang lấy danh sách học sinh chưa có tài khoản auth...");

  // 1. Lấy tất cả học sinh mà auth_id đang bị trống (null)
  const { data: users, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("username")
    .is("auth_id", null); // Chỉ lấy những người chưa được tạo tài khoản

  if (fetchError) {
    console.error("❌ Lỗi khi lấy danh sách học sinh:", fetchError);
    return;
  }

  if (!users || users.length === 0) {
    console.log("🎉 Tất cả học sinh đều đã có tài khoản!");
    return;
  }

  console.log(`🚀 Tìm thấy ${users.length} học sinh cần tạo tài khoản.`);

  // 2. Duyệt qua từng học sinh để tạo tài khoản
  for (const user of users) {
    const username = user.username;
    const email = toFakeEmail(username);
    
    // Tạo mật khẩu mặc định (Ví dụ: tên_đăng_nhập + "123" hoặc một mật khẩu chung)
    const defaultPassword = "bangiaoly"; 

    try {
      // Tạo user trong hệ thống Auth của Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Cập nhật ngược lại auth_id vào bảng users
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ auth_id: authData.user.id })
        .eq("username", username);

      if (updateError) throw updateError;

      console.log(`✅ Đã tạo xong cho: ${username} | Pass: ${defaultPassword}`);
    } catch (err) {
      console.error(`❌ Thất bại khi tạo tài khoản cho ${username}:`, err);
    }
  }

  console.log("🏁 Hoàn thành tiến trình tạo tài khoản!");
}

// Chạy hàm
generatePasswordForAllStudents();