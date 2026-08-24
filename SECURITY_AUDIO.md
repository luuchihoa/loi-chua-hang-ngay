# 🛡️ Cấu Trúc Bảo Mật & Hạ Tầng Audio Production (SECURITY_AUDIO.md)

Tài liệu này mô tả kiến trúc bảo mật và các biện pháp hardening kho Audio Lời Chúa trên môi trường Production.

---

### 1. Tách Biệt Private Storage & Endpoint API Cấp Access Token
* **Private Audio Storage (`AUDIO_PRIVATE_ROOT`):** Lưu trữ toàn bộ file MP3/WAV/FLAC thu sẵn tại thư mục nội bộ (mặc định `<workspace>/private/audio`). Tuyệt đối không đọc/ghi hoặc phục vụ MP3 trực tiếp qua thư mục `public/`.
* **Public Read-Only API:** 
  - `GET /api/list-audio`: Phục vụ danh sách bài đọc phụng vụ phân trang (chỉ trả về `trackId` HMAC opaque, không lộ URL hay đường dẫn tệp).
  - `GET /api/bible-audio-availability?bookId=<id>`: Trả về các chương khả dụng và `trackId` của duy nhất một sách Kinh Thánh được yêu cầu (đối chiếu danh mục 73 sách).
  - `POST /api/audio-access`: Nhận body `{ trackId }`, kiểm tra quyền/rate-limit và sinh đường dẫn signed stream token có thời hạn ngắn (TTL 30 - 300s).
  - `GET/HEAD /api/audio-stream/:trackId?expires=&sig=`: Xác thực chữ ký HMAC-SHA256 bí mật, kiểm tra IP binding và hết hạn trước khi stream audio. Hỗ trợ HTTP 206 Partial Content (Range requests) và kiểm soát rate-limiting.
* **Studio Upload & Render Engine:**
  - `POST /api/upload-voice`: Lưu file giọng mẫu vào `private/audio/custom_voices/` và trả về `trackId`.
  - `POST /api/render-audio`: Nhận `custom_voice_track_id`, tự giải mã đường dẫn nội bộ an toàn trên server. Tuyệt đối không nhận đường dẫn tệp trực tiếp từ phía client.

---

### 2. Quản Lý Thư Mục Lưu Trữ & Private Buckets (Cloudflare R2 / Object Storage)
* **Bucket Riêng Tư (Private Bucket):** R2 production chỉ được đọc qua `workers/audio-gateway`; không dùng URL `.r2.dev` hoặc custom domain trỏ thẳng bucket.
* **Chặn Truy Cập Tĩnh Trực Tiếp:** Worker cấp URL stream AES-GCM hết hạn ngắn sau khi kiểm tra phiên; xem [hướng dẫn triển khai](docs/AUDIO_GATEWAY_DEPLOYMENT.md).

---

### 3. Cấp Phát Signed Stream URL Có Thời Hạn (Short TTL & IP Binding)
* **Trình Phát Audio:** Thay vì nhúng đường dẫn tĩnh `/audio/...mp3`, frontend gọi API `POST /api/audio-access` khi người dùng bấm **Phát**.
* **Signed Stream URL:** API kiểm tra và sinh đường dẫn có TTL ngắn (30-300s), kèm chữ ký HMAC-SHA256 kết hợp `trackId`, thời gian hết hạn `expires` và IP máy khách.

---

### 4. Hỗ Trợ HTTP Range Requests & Rate Limiting
* Máy chủ backend/CDN hỗ trợ tiêu chuẩn `HTTP 206 Partial Content` và header `Range: bytes=0-`.
* Áp dụng Rate Limiting riêng biệt cho từng bucket API (`list`, `access`, `stream`, `bible-availability`, `render`).
* Bucket `stream` kiểm soát tối đa 120 range requests/phút/IP để ngăn chặn spam vô hạn.

---

### 5. Biến Môi Trường Bảo Mật Production
* **`AUDIO_SIGNING_SECRET`**: Khóa bí mật dùng cho chữ ký HMAC-SHA256 (tối thiểu 32 ký tự). Server ở `NODE_ENV=production` sẽ từ chối khởi động nếu thiếu secret.
* **`AUDIO_PRIVATE_ROOT`**: Đường dẫn tuyệt đối tới thư mục private MP3 (mặc định `<workspace>/private/audio`).
* **`AUDIO_STREAM_TOKEN_TTL_SECONDS`**: Thời gian sống tối đa của Signed Stream Token (mặc định 120s, clamp min 30s, max 300s).
* **`AUDIO_TRUST_PROXY`**: Cấu hình `true` khi server đứng sau Reverse Proxy/Nginx để đọc chính xác header `X-Forwarded-For`.
* **`AUDIO_ALLOWED_ORIGINS`**: Danh sách Origin cho phép truy cập API (phân cách bằng dấu phẩy).
