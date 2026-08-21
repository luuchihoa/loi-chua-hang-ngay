-- Public feedback intake plus private administrator review.
-- Run this migration in Supabase SQL Editor, then mark the admin user's
-- app_metadata.role as `feedback_admin` with the service-role API.

CREATE TABLE IF NOT EXISTS public.feedback_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('content', 'audio', 'usability', 'suggestion', 'thanks')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 8 AND 500),
  page_url text NOT NULL CHECK (char_length(page_url) <= 2048),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  email text CHECK (email IS NULL OR char_length(email) <= 254),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
