import { supabase } from '@/lib/supabase/client'
import type { Enums, Json } from '@/types/supabase'

export async function saveResearch(lawyerId: string, payload: {
  case_id?: string
  query: string
  domain?: Enums<'legal_domain'>
  result: Json
  statutes?: Json
  case_law?: Json
  confidence?: number
}) {
  const { data, error } = await supabase
    .from('lawyer_saved_research')
    .insert({
      lawyer_id: lawyerId,
      ...payload
    })
    .select()
    .single()
  return { data, error }
}

export async function getSavedResearch(lawyerId: string, caseId?: string) {
  let query = supabase
    .from('lawyer_saved_research')
    .select('*')
    .eq('lawyer_id', lawyerId)
    .order('saved_at', { ascending: false })

  if (caseId) {
    query = query.eq('case_id', caseId)
  }

  const { data, error } = await query
  return { data, error }
}

export async function deleteResearch(researchId: string) {
  const { error } = await supabase
    .from('lawyer_saved_research')
    .delete()
    .eq('id', researchId)
  return { error }
}
