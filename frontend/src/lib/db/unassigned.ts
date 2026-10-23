import { supabase } from '@/lib/supabase/client'

export async function getUnassignedQueue(filters?: {
  domain?: string
  state?: string
  limit?: number
  offset?: number
}) {
  const limit = filters?.limit ?? 20
  const offset = filters?.offset ?? 0

  let query = supabase
    .from('unassigned_escalations')
    .select(`
      *,
      cases (
        id,
        title,
        domain,
        state,
        district,
        incident_description,
        budget_min,
        budget_max,
        created_at
      )
    `)
    .eq('is_resolved', false)
    .order('hours_since_posted', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error } = await query
  return { data, error }
}
