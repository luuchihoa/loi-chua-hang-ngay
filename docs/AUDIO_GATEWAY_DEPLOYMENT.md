# Audio Gateway: R2 private và URL ký số

## Mục đích

Chỉ Cloudflare Worker được đọc bucket R2. Trình duyệt nhận URL stream mã hoá, hết hạn tối đa 5 phút; không nhận URL object R2.

## Cấu hình Cloudflare

1. Tạo Worker từ `workers/audio-gateway/wrangler.toml` và bind bucket `audio` vào `AUDIO_BUCKET` với quyền đọc.
2. Tạo KV namespace, bind tên `AUDIO_RATE_LIMITS` để quota dùng chung giữa các Worker isolate.
3. Đặt secrets qua Wrangler hoặc Dashboard:
   - `AUDIO_TOKEN_ENCRYPTION_KEY`: 32 byte ngẫu nhiên ở dạng base64url.
   - `AUDIO_SESSION_SIGNING_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự.
   - `TURNSTILE_SECRET`: secret của Turnstile invisible.
   - `ALLOWED_ORIGINS`: danh sách domain web, phân cách bằng dấu phẩy.
4. Cấu hình route Worker ở cùng domain web hoặc một subdomain riêng; nếu dùng subdomain, thêm đúng URL đó vào `VITE_AUDIO_GATEWAY_BASE`.
5. Tạo Turnstile invisible, đặt site key vào `VITE_TURNSTILE_SITE_KEY` và secret vào Worker.
6. Thêm WAF rate limiting cho `/v1/session`, `/v1/ticket`, `/v1/stream` theo ngưỡng tương ứng 6, 12 và 40 request/phút/IP.

Ví dụ tạo secrets:

```bash
cd workers/audio-gateway
openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' | npx wrangler secret put AUDIO_TOKEN_ENCRYPTION_KEY
npx wrangler secret put AUDIO_SESSION_SIGNING_SECRET
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
