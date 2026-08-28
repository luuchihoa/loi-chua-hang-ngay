const fallbackUrl = 'https://avrnbefzxtznpodugacz.supabase.co';
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cm5iZWZ6eHR6bnBvZHVnYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTU3MzksImV4cCI6MjA5OTE5MTczOX0._wZp4bK1b2XGSYYUWzQTw2mkyCyKvwOi6iyIIuauRKI';

export const getSupabaseConfig = (env = {}) => ({
  url: env.VITE_SUPABASE_URL || fallbackUrl,
  anonKey: env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey,
});
