import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Only ever use this in API routes or backend
// Never import this in any component
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
