import { supabase } from '@/lib/supabase/client'

export async function sendMessage(payload: {
  case_id: string
  pipeline_id?: string
  sender_id: string
  sender_role: 'citizen' | 'lawyer'
  content: string
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function getCaseMessages(caseId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function markMessagesRead(caseId: string, userId: string) {
  const { error } = await supabase
    .from('messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('case_id', caseId)
    .neq('sender_id', userId)
    .eq('is_read', false)
  return { error }
}

export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .eq('is_read', false)
  return { count, error }
}

export function subscribeToMessages(
  caseId: string,
  callback: (message: Record<string, unknown>) => void
) {
  return supabase
    .channel(`messages:${caseId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `case_id=eq.${caseId}`
    }, (payload) => callback(payload.new))
    .subscribe()
}
