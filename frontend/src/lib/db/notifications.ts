import { supabase } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/supabase'

type NotificationType = Database['public']['Enums']['notification_type']

export async function createNotification(payload: {
  user_id: string
  type: NotificationType
  title: string
  body?: string | null
  data?: Json | null
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('*')
    .single()
  return { data, error }
}

export async function getNotifications(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return { count, error }
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)
  return { error }
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false)
  return { error }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notification: Record<string, unknown>) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => callback(payload.new))
    .subscribe()
}
