-- ==========================================
-- BIBLE DATABASE SCHEMA FOR SUPABASE
-- ==========================================

-- 1. Bảng lưu trữ các bản dịch Kinh Thánh (VD: CGKPV, Bản Truyền Thống)
CREATE TABLE translations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,            -- Tên bản dịch (VD: Lời Chúa Cho Mọi Người)
    short_name VARCHAR(50) NOT NULL UNIQUE,-- Tên viết tắt (VD: CGKPV)
    language VARCHAR(10) DEFAULT 'vi',     -- Ngôn ngữ (VD: vi, en)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Bảng lưu trữ thông tin các Sách trong Kinh Thánh
CREATE TABLE books (
    id VARCHAR(10) PRIMARY KEY,            -- Mã sách chuẩn (VD: 'mat', 'gen', 'ga')
    name VARCHAR(255) NOT NULL,            -- Tên sách (VD: 'Tin Mừng Theo Thánh Mat-thêu')
    short_name VARCHAR(50) NOT NULL,       -- Viết tắt (VD: 'Mt', 'Ga')
    testament VARCHAR(10) NOT NULL CHECK (testament IN ('old', 'new')), -- Cựu Ước / Tân Ước
    total_chapters INTEGER NOT NULL,       -- Tổng số chương
    book_order INTEGER NOT NULL            -- Số thứ tự của sách trong Kinh Thánh (1-73)
);

-- 3. Bảng lưu trữ từng Câu Kinh Thánh (Dữ liệu lớn nhất)
CREATE TABLE verses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_id INTEGER REFERENCES translations(id) ON DELETE CASCADE,
    book_id VARCHAR(10) REFERENCES books(id) ON DELETE CASCADE,
    chapter INTEGER NOT NULL,
    verse_num INTEGER NOT NULL,
    verse_text TEXT NOT NULL,              -- Nội dung câu Kinh Thánh
    speaker VARCHAR(50) DEFAULT NULL,      -- Người nói (VD: 'jesus', 'god', null)
    footnotes JSONB DEFAULT NULL,          -- Chú thích dưới dạng mảng JSON: [{"marker": "a", "text": "..."}]
    part_title VARCHAR(255) DEFAULT NULL,   -- Tiêu đề phần lớn (VD: 'I. PHẦN MỞ ĐẦU...')
    section_title VARCHAR(255) DEFAULT NULL,-- Tiêu đề tiểu mục (VD: 'Người khôn tránh bạn xấu')
    
    -- Ràng buộc: Mỗi câu chỉ xuất hiện 1 lần trong 1 bản dịch + 1 sách + 1 chương
    UNIQUE(translation_id, book_id, chapter, verse_num)
);

-- ==========================================
-- CẤU HÌNH TÌM KIẾM TOÀN VĂN (FULL-TEXT SEARCH) CHO SUPABASE
-- Giúp tìm kiếm cực nhanh trên hàng ngàn câu Kinh Thánh
-- ==========================================

-- Tạo một cột ẩn (generated column) tự động phân tích verse_text để phục vụ tìm kiếm
ALTER TABLE verses ADD COLUMN fts_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(verse_text, '')), 'A')
) STORED;

-- Tạo Index trên cột fts_vector giúp tăng tốc độ tìm kiếm lên hàng chục lần
CREATE INDEX verses_fts_idx ON verses USING GIN (fts_vector);

-- 4. Bảng lưu trữ trọn vẹn từng Chương Kinh Thánh (Full Chapter Storage)
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    translation_id INTEGER REFERENCES translations(id) ON DELETE CASCADE DEFAULT 1,
    book_id VARCHAR(10) REFERENCES books(id) ON DELETE CASCADE,
    chapter INTEGER NOT NULL,
    content TEXT NOT NULL,              -- Toàn bộ nội dung chương chứa [PART], [SECTION], (1)...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    
    UNIQUE(translation_id, book_id, chapter)
);

CREATE INDEX idx_chapters_book_chap ON chapters(book_id, chapter);

-- ==========================================
-- BẢO MẬT & ROW LEVEL SECURITY (RLS)
-- Đảm bảo an toàn dữ liệu trên Supabase
-- ==========================================

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Cho phép mọi người (public) được quyền ĐỌC dữ liệu
CREATE POLICY "Cho phép tất cả mọi người đọc bản dịch" ON translations FOR SELECT USING (true);
CREATE POLICY "Cho phép tất cả mọi người đọc danh sách sách" ON books FOR SELECT USING (true);
CREATE POLICY "Cho phép tất cả mọi người đọc các câu Kinh Thánh" ON verses FOR SELECT USING (true);
CREATE POLICY "Cho phép tất cả mọi người đọc các chương Kinh Thánh" ON chapters FOR SELECT USING (true);

-- Chỉ những user có quyền admin mới được Thêm/Sửa/Xóa (Cấu hình sau trên Supabase)

-- ==========================================
-- DỮ LIỆU MẪU (BẢN DỊCH VÀ SÁCH)
-- Chạy đoạn này để có sẵn khung dữ liệu
-- ==========================================

INSERT INTO translations (name, short_name, language) 
VALUES ('Các Giờ Kinh Phụng Vụ 2011', 'CGKPV', 'vi') 
ON CONFLICT (short_name) DO NOTHING;

-- Mẫu insert 1 cuốn sách
INSERT INTO books (id, name, short_name, testament, total_chapters, book_order)
VALUES 
    ('mat', 'Tin Mừng Theo Thánh Mat-thêu', 'Mt', 'new', 28, 47),
    ('ga', 'Tin Mừng Theo Thánh Gio-an', 'Ga', 'new', 21, 50)
ON CONFLICT (id) DO NOTHING;

-- Mẫu insert dữ liệu câu Kinh Thánh
-- Lưu ý: Lấy ID của bản dịch vừa chèn (giả sử là 1)
INSERT INTO verses (translation_id, book_id, chapter, verse_num, verse_text, speaker)
VALUES 
    (1, 'mat', 15, 24, 'Ngài đáp: “Thầy chỉ được sai đến với những con cừu lạc nhà I-xa-ren mà thôi.”', 'jesus'),
    (1, 'mat', 15, 26, 'Ngài đáp: “Không nên lấy bánh của con cái mà ném cho chó con.”', 'jesus')
ON CONFLICT DO NOTHING;
