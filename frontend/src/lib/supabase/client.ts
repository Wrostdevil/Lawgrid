import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// A placeholder keeps the app renderable when Supabase is not configured.
// Protected actions will fail with a normal auth error until real values are
// supplied in frontend/.env.local.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)
