import { toast } from 'sonner'
import { XP_VALUES, getRewardForLevel } from './badges'

export type XpResult = {
  success: boolean
  xp_added: number
  old_level: number
  new_level: number
  new_total_xp: number
  level_up: boolean
  token_reward: number
  special_reward: string | null
}

/**
 * Assegna XP all'utente tramite RPC e mostra feedback.
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

    // Feedback "+X XP" animato
    if (showToast && amount > 0) {
      if (result.level_up) {
        // Il level-up verrà gestito dal componente LevelUpModal
        // qui mostriamo solo un toast breve
        toast.success(`+${amount} XP — Livello ${result.new_level}!`, {
          duration: 3000,
        })
      } else {
        toast(`+${amount} XP`, {
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

/**
 * Determina l'XP da dare per una mancia in base all'importo.
 */
export function getXpForTip(amount: number): number {
  return amount >= 10 ? XP_VALUES.TIP_BIG : XP_VALUES.TIP_SMALL
}
