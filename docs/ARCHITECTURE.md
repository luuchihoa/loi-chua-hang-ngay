# Kiến trúc dự án

## Nguyên tắc

- `pages/` chỉ điều phối dữ liệu, state cấp trang và ghép các khối UI.
- `features/<feature>/components/` chứa component chỉ thuộc một nghiệp vụ.
- `features/<feature>/utils/` chứa logic thuần, không phụ thuộc React.
- `components/` dành cho UI dùng chung giữa nhiều feature.
- `hooks/` chứa stateful logic có thể tái sử dụng.
- `lib/` là cổng truy cập dịch vụ ngoài; các module khác import từ facade như `lib/supabase.js`.
- `config/` là nguồn cấu hình dùng chung như tên và logo thương hiệu.
- `app/` quản lý route và composition cấp ứng dụng.

## Cấu trúc chính

```text
src/
├── app/                    # Route và composition
├── components/             # UI dùng chung
│   ├── audio/
│   ├── layout/
│   ├── reader/
│   └── utils/
├── config/                 # Cấu hình ứng dụng
├── context/                # Global React context
├── features/
│   ├── bible/              # Điều hướng và logic Kinh Thánh
│   └── liturgy/            # Component phụng vụ
├── hooks/                  # Reusable hooks
├── lib/                    # External service facades
├── pages/                  # Route-level pages
└── utils/                  # Logic dùng chung toàn ứng dụng
```

## Quy ước mở rộng

1. Component chỉ dùng trong một page/feature phải đặt trong feature tương ứng.
2. Logic phân tích/chuyển đổi dữ liệu nên là hàm thuần trong `utils/`, không đặt trong JSX.
3. Không import trực tiếp `supabaseClient.js`; luôn dùng `lib/supabase.js`.
4. Route mới được khai báo tại `app/AppRoutes.jsx`.
5. Studio AI là công cụ local-only: route và navigation chỉ tồn tại khi `import.meta.env.DEV` là `true`.
6. Page không phải trang chủ nên lazy-load để không làm phình bundle khởi đầu.

## Lệnh kiểm tra

```bash
npm run dev
npm run build
```

Production build phải không chứa `studio-audio`, `Studio AI` hoặc `AudioStudioPage`.
