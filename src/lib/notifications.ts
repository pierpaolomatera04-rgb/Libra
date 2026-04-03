import { SupabaseClient } from '@supabase/supabase-js'

type NotificationType = 'follow' | 'like' | 'save' | 'comment' | 'unlock' | 'tip'

interface CreateNotificationParams {
  supabase: SupabaseClient
  recipientId: string      // autore che riceve la notifica
  actorId: string           // utente che ha fatto l'azione
  actorName: string         // nome visibile dell'attore
  type: NotificationType
  title: string
  message?: string
  data?: Record<string, any>
}

export async function createNotification({
  supabase,
  recipientId,
  actorId,
  actorName,
  type,
  title,
  message,
  data,
}: CreateNotificationParams) {
  // Non notificare se stessi
  if (recipientId === actorId) return

  try {
    await supabase.from('notifications').insert({
      user_id: recipientId,
      actor_id: actorId,
      type,
      title,
      message,
      data: { ...data, actor_name: actorName },
    })
  } catch (err) {
    console.error('Errore creazione notifica:', err)
  }
}
