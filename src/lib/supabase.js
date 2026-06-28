import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgvjlykedwahxknkyhra.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nKJ1AQ0YRzogBz4HbKvXPA_GBTRsNyt';

export const supabase = createClient(supabaseUrl, supabaseKey);
