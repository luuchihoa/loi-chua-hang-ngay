# Audio Gateway: R2 private và URL ký số

## Mục đích

Chỉ Cloudflare Worker được đọc bucket R2. Trình duyệt nhận URL stream mã hoá, hết hạn tối đa 5 phút; không nhận URL object R2.

## Cấu hình Cloudflare

Tài khoản sở hữu website và tài khoản lưu R2 có thể khác nhau. Không chuyển bucket: deploy Worker tại **tài khoản sở hữu zone `loichuamoingay.org`** để gắn `audio.loichuamoingay.org`; Worker gọi R2 S3 API của tài khoản lưu trữ bằng token chỉ-đọc.

1. Ở **tài khoản R2**, tạo R2 API token mới, giới hạn bucket `audio` và quyền **Object Read**. Lưu Access Key ID và Secret Access Key ở trình quản lý mật khẩu; secret chỉ hiện một lần.
2. Ở **tài khoản website**, tạo KV namespace `AUDIO_RATE_LIMITS`, rồi thay ID trong `workers/audio-gateway/wrangler.toml`.
3. Ở **tài khoản website**, đặt secrets qua Wrangler hoặc Dashboard:
   - `AUDIO_TOKEN_ENCRYPTION_KEY`: 32 byte ngẫu nhiên ở dạng base64url.
   - `AUDIO_SESSION_SIGNING_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự.
   - `R2_STORAGE_ACCOUNT_ID`: Account ID của tài khoản lưu R2.
   - `R2_BUCKET_NAME`: `audio`.
   - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: cặp token chỉ-đọc của bước 1.
   - `TURNSTILE_SECRET`: secret của Turnstile invisible.
   - `ALLOWED_ORIGINS`: danh sách domain web, phân cách bằng dấu phẩy.
4. Deploy Worker từ **tài khoản website**. `[[routes]]` sẽ tạo custom domain `audio.loichuamoingay.org` trong zone cùng tài khoản.
5. Tạo Turnstile invisible, đặt site key vào `VITE_TURNSTILE_SITE_KEY` và secret vào Worker.
6. Thêm WAF rate limiting cho `/v1/session`, `/v1/ticket`, `/v1/stream` theo ngưỡng tương ứng 6, 12 và 40 request/phút/IP.

Ví dụ tạo secrets:

```bash
cd workers/audio-gateway
openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' | npx wrangler secret put AUDIO_TOKEN_ENCRYPTION_KEY
npx wrangler secret put AUDIO_SESSION_SIGNING_SECRET
npx wrangler secret put R2_STORAGE_ACCOUNT_ID
npx wrangler secret put R2_BUCKET_NAME
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put ALLOWED_ORIGINS
```

## Rollout an toàn

1. Deploy Worker khi R2 vẫn public và đặt `VITE_AUDIO_GATEWAY_BASE` trên staging.
2. Kiểm tra bài đọc, Tin Mừng, lời dẫn, nhạc cue, Bible audio, pause/seek/range và mạng yếu.
3. Kiểm tra URL object R2 trực tiếp vẫn hoạt động trong giai đoạn staging, nhưng frontend production không còn gọi URL đó.
4. Deploy frontend production với `VITE_AUDIO_GATEWAY_BASE` và `VITE_TURNSTILE_SITE_KEY`.
5. Xác minh phát audio từ Worker, theo dõi 401/403/429 ít nhất 24 giờ.
6. Tắt public development URL và custom domain trỏ trực tiếp bucket R2. Không xoá object.
7. Dùng Search Console URL Inspection cho trang chủ, ngày thường và ngày lễ để bảo đảm văn bản/SEO vẫn render đầy đủ.

## Quy tắc vận hành

- Không thêm fallback production từ Worker sang URL R2 public.
- Không đặt signed URL trong sitemap, canonical hoặc HTML prerender.
- Không cache public stream URL; Worker xử lý `Range` và trả `Cache-Control: private, no-store`.
- Khi audio gateway lỗi, UI phải fallback TTS hoặc báo không tải được audio; nội dung Lời Chúa vẫn hiển thị.
