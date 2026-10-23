import { supabase } from '@/lib/supabase/client'

export async function getCitizenProfile(userId: string) {
  const { data, error } = await supabase
    .from('citizen_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateCitizenProfile(userId: string, updates: {
  full_name?: string
  phone?: string
  state?: string
  district?: string
  preferred_lang?: string
}) {
  const { data, error } = await supabase
    .from('citizen_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}
