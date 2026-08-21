import { supabase } from './supabase.js';

export async function submitFeedback({ category, message, pageUrl, context, email, website }) {
  // Honeypot: real users never see this field. Do not send bot content onward.
  if (website) throw new Error('Không thể gửi phản hồi.');

  const { error } = await supabase.rpc('submit_feedback', {
    p_category: category,
    p_message: message.trim(),
    p_page_url: pageUrl,
    p_context: context || {},
    p_email: email.trim() || null,
  });

  if (error) throw error;
}

export const FEEDBACK_CATEGORIES = [
  { value: 'content', label: 'Nội dung', description: 'Sai trích dẫn, chính tả hoặc bản dịch' },
  { value: 'audio', label: 'Âm thanh', description: 'Không phát, âm lượng hoặc chất lượng thu' },
  { value: 'usability', label: 'Trải nghiệm', description: 'Khó đọc, khó tìm hoặc thao tác chưa thuận tiện' },
  { value: 'suggestion', label: 'Đề xuất', description: 'Ý tưởng giúp ứng dụng phục vụ tốt hơn' },
  { value: 'thanks', label: 'Lời cảm ơn', description: 'Chia sẻ điều bạn trân quý' },
];
