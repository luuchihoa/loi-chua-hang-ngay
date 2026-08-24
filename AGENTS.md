# Hướng dẫn cho AI và người bảo trì

## Điểm vào và cấu trúc

- `src/main.jsx` khởi tạo ứng dụng; `src/App.jsx` ghép providers và layout; route nằm tại `src/app/AppRoutes.jsx`.
- `src/pages/` điều phối dữ liệu và state cấp route. UI tái sử dụng đặt ở `src/components/`; UI hoặc logic riêng nghiệp vụ đặt ở `src/features/<feature>/`.
- `src/context/` quản lý state dùng chung. `LiturgyContext` là chủ sở hữu duy nhất của class theme toàn ứng dụng (`dark`, `theme-sepia`).
- `src/lib/supabase.js` là cổng duy nhất để truy cập Supabase. Logic thuần dùng chung đặt ở `src/utils/`; hooks tái sử dụng đặt ở `src/hooks/`.

## Dữ liệu và audio

- Phụng vụ đọc từ Supabase; cache phía trình duyệt ở `src/utils/liturgyCache.js`.
- Audio phụng vụ được suy từ `ref` bằng `src/utils/audioNaming.js` và tra URL tại `src/utils/audioLookup.js`; không thêm manifest mới.
- R2 dùng `readings/r1.mp3`, `readings/r2.mp3`, `readings/<ref>.mp3`, `gospels/<ref>.mp3`; quy tắc chi tiết ở `docs/AUDIO_FILE_NAMING.md`.
- Playlist phụng vụ đầy đủ chèn tuần tự `music/liturgy_intro_v5.mp3`, `music/reading_transition_v5.mp3` và `music/liturgy_outro_v5.mp3`; không phát nhạc nền song song với giọng đọc.

## Quy tắc thay đổi

- Không để lại code bị comment-out, file thử nghiệm tạm, hoặc ghi chú chỉ lặp lại tên biến/JSX.
- Giữ ghi chú ngắn cho các bất biến khó thấy, nhất là quyền sở hữu theme, quy ước audio và quy tắc cache.
- Trong modal tuỳ chỉnh BiblePage chỉ có cỡ chữ và khoảng cách dòng; không thêm theme cục bộ hoặc tuỳ chọn tô màu lời Đức Giê-su.
- Route mới phải khai báo trong `src/app/AppRoutes.jsx`; page ngoài trang chủ nên lazy-load.
- Kiểm tra thay đổi bằng `npx vite build` và `npm test` khi phù hợp. Không dùng `npm run build` để kiểm tra cục bộ vì hook prebuild có tác vụ mạng.
