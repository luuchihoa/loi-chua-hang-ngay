-- =========================================================================
-- TOÀN BỘ CẤU TRÚC DATABASE (FULL DDL SCHEMA) CHO SUPABASE MỚI
-- Hướng dẫn: Copy toàn bộ nội dung file này và paste vào SQL Editor của Supabase mới, sau đó nhấn Run.
-- =========================================================================

-- 1. BẢNG BẢN DỊCH KINH THÁNH (translations)
CREATE TABLE IF NOT EXISTS public.translations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'vi',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép tất cả mọi người đọc bản dịch" ON public.translations FOR SELECT USING (true);

-- 2. BẢNG DANH SÁCH 73 CUỐN SÁCH KINH THÁNH (books)
CREATE TABLE IF NOT EXISTS public.books (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    testament VARCHAR(10) NOT NULL CHECK (testament IN ('old', 'new')),
    total_chapters INTEGER NOT NULL,
    book_order INTEGER NOT NULL
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép tất cả mọi người đọc danh sách sách" ON public.books FOR SELECT USING (true);

-- 3. BẢNG LƯU TRỮ TRỌN VẸN CÁC CHƯƠNG KINH THÁNH (chapters)
CREATE TABLE IF NOT EXISTS public.chapters (
    id SERIAL PRIMARY KEY,
    translation_id INTEGER REFERENCES public.translations(id) ON DELETE CASCADE DEFAULT 1,
    book_id VARCHAR(10) REFERENCES public.books(id) ON DELETE CASCADE,
    chapter INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(translation_id, book_id, chapter)
);

CREATE INDEX IF NOT EXISTS idx_chapters_book_chap ON public.chapters(book_id, chapter);
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép tất cả mọi người đọc các chương Kinh Thánh" ON public.chapters FOR SELECT USING (true);

-- 4. BẢNG NỘI DUNG LỜI CHÚA / BÀI ĐỌC PHỤNG VỤ (liturgy_contents)
CREATE TABLE IF NOT EXISTS public.liturgy_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liturgy_key TEXT NOT NULL,
    cycle TEXT DEFAULT 'all',
    title TEXT,
    quote TEXT,
    r1_ref TEXT,
    r1_quote TEXT,
    r1_intro TEXT,
    r1_content TEXT,
    psalm_ref TEXT,
    psalm_content TEXT,
    r2_ref TEXT,
    r2_quote TEXT,
    r2_intro TEXT,
    r2_content TEXT,
    gospel_ref TEXT,
    gospel_alleluia TEXT,
    gospel_intro TEXT,
    gospel_content TEXT,
    reflection TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    extra_readings JSONB,
    mass_title TEXT,
    UNIQUE(liturgy_key, cycle)
);

CREATE INDEX IF NOT EXISTS idx_liturgy_contents_key_cycle ON public.liturgy_contents(liturgy_key, cycle);
ALTER TABLE public.liturgy_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép tất cả mọi người đọc bài đọc Phụng Vụ" ON public.liturgy_contents FOR SELECT USING (true);

-- 5. BẢNG HÒM THƯ PHẢN HỒI Ý KIẾN ĐỘC GIẢ (feedback_items)
CREATE TABLE IF NOT EXISTS public.feedback_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('content', 'audio', 'usability', 'suggestion', 'thanks')),
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 8 AND 500),
    page_url TEXT NOT NULL CHECK (char_length(page_url) <= 2048),
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_items_created_at_idx ON public.feedback_items (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_items_status_idx ON public.feedback_items (status, created_at DESC);

ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_feedback_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'feedback_admin';
$$;

CREATE POLICY "Feedback admins can read all feedback"
  ON public.feedback_items FOR SELECT TO authenticated
  USING (public.is_feedback_admin());

CREATE POLICY "Feedback admins can update feedback"
  ON public.feedback_items FOR UPDATE TO authenticated
  USING (public.is_feedback_admin()) WITH CHECK (public.is_feedback_admin());

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_category text,
  p_message text,
  p_page_url text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_category NOT IN ('content', 'audio', 'usability', 'suggestion', 'thanks')
     OR char_length(trim(coalesce(p_message, ''))) NOT BETWEEN 8 AND 500
     OR char_length(coalesce(p_page_url, '')) > 2048
     OR octet_length(coalesce(p_context, '{}'::jsonb)::text) > 4096
     OR char_length(coalesce(p_email, '')) > 254 THEN
    RAISE EXCEPTION 'Invalid feedback payload';
  END IF;
  INSERT INTO public.feedback_items (category, message, page_url, context, email)
  VALUES (p_category, trim(p_message), p_page_url, coalesce(p_context, '{}'::jsonb), nullif(trim(p_email), ''));
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text, text, text, jsonb, text) TO anon, authenticated;
