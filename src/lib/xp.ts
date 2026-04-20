import { toast } from 'sonner'

export type XpResult = {
  success: boolean
  xp_added: number
  old_level: number
  new_level: number
  new_total_xp: number
  level_up: boolean
  // Premi accreditati ai cambi di rank (Argento/Oro/Diamante)
  reward_tokens: number
  granted_gold_month: boolean
  granted_exclusive_badge: boolean
  special_reward: string | null
  // Capping: se l'XP è stato negato per cap raggiunto
  capped?: boolean
  cap_reason?: string
}

/**
 * Assegna XP all'utente tramite RPC e mostra feedback.
 * I cap (max/giorno, una tantum, 1/settimana) sono applicati lato server.
 * Restituisce il risultato per gestire level-up nel componente.
 */
export async function awardXp(
  supabase: any,
  userId: string,
  amount: number,
  reason: string = 'activity',
  showToast: boolean = true,
): Promise<XpResult | null> {
  try {
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    })

    if (error || !data?.success) {
      console.error('award_xp error:', error || data)
      return null
    }

    const result = data as XpResult

    // Se è stato cappato, niente toast (silenzioso)
    if (result.capped) return result

    // Feedback "+X XP" animato
    if (showToast && result.xp_added > 0) {
      if (result.level_up) {
        toast.success(`+${result.xp_added} XP — Livello ${result.new_level}!`, {
          duration: 3000,
        })
      } else {
        toast(`+${result.xp_added} XP`, {
          duration: 2000,
          className: 'xp-toast',
        })
      }
    }

    return result
  } catch (err) {
    console.error('awardXp failed:', err)
    return null
  }
}
