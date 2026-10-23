import { supabase } from '@/lib/supabase/client'
import type { Enums } from '@/types/supabase'

export async function getLawyerProfile(userId: string) {
  const { data, error } = await supabase
    .from('lawyer_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateLawyerProfile(userId: string, updates: {
  full_name?: string
  phone?: string
  bar_council_id?: string
  enrollment_number?: string
  state_bar_council?: string
  enrollment_year?: number
  practice_state?: string
  practice_district?: string
  court_types?: string[]
  specialisations?: Enums<'legal_domain'>[]
  experience_years?: number
  bio?: string
  languages?: string[]
  fee_min?: number
  fee_max?: number
  profile_photo_url?: string
  is_available?: boolean
}) {
  const { data, error } = await supabase
    .from('lawyer_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export async function searchLawyers({
  domain,
  state,
  district,
  budget_min,
  budget_max,
  limit = 10,
  offset = 0
}: {
  domain?: Enums<'legal_domain'>
  state?: string
  district?: string
  budget_min?: number
  budget_max?: number
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('lawyer_profiles')
    .select('*')
    .eq('is_active', true)
    .eq('is_available', true)
    .gte('completeness_score', 60)
    .order('avg_rating', { ascending: false })
    .order('completeness_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (domain) {
    query = query.contains('specialisations', [domain])
  }
  if (state) {
    query = query.eq('practice_state', state)
  }
  if (district) {
    query = query.eq('practice_district', district)
  }
  if (budget_min !== undefined) {
    query = query.gte('fee_max', budget_min)
  }
  if (budget_max !== undefined) {
    query = query.lte('fee_min', budget_max)
  }

  const { data, error } = await query
  return { data, error }
}

export async function getLawyerPublicProfile(lawyerId: string) {
  const { data, error } = await supabase
    .from('lawyer_profiles')
    .select(`
      *,
      lawyer_reviews (
        rating,
        review_text,
        outcome,
        created_at
      ),
      lawyer_case_history (
        domain,
        court_type,
        outcome,
        year,
        description
      )
    `)
    .eq('id', lawyerId)
    .single()
  return { data, error }
}

export async function getLawyerCompleteness(userId: string) {
  const { data, error } = await supabase
    .from('lawyer_profiles')
    .select('completeness_score')
    .eq('id', userId)
    .single()
  return { data, error }
}
