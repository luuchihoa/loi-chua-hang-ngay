import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseConfig.js';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig(import.meta.env);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
