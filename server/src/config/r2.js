import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    realtime: { transport: ws },
  }
);

export const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME;
export const SUPABASE_URL = process.env.SUPABASE_URL;

export default supabase;
