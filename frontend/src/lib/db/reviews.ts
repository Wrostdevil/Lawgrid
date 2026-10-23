import { supabase } from '@/lib/supabase/client'
import type { Enums } from '@/types/supabase'

export async function submitReview(payload: {
  lawyer_id: string
  citizen_id: string
  case_id: string
  pipeline_id: string
  rating: number
  review_text?: string
  outcome?: Enums<'case_outcome'>
}) {
  const { data, error } = await supabase
    .from('lawyer_reviews')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function getLawyerReviews(lawyerId: string) {
  const { data, error } = await supabase
    .from('lawyer_reviews')
    .select('*')
    .eq('lawyer_id', lawyerId)
    .order('created_at', { ascending: false })
  return { data, error }
}
