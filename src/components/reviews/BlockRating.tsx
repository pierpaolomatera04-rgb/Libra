'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Props {
  bookId: string
  blockId: string
  size?: number
  className?: string
}

/**
 * Voto stelle rapido di fine blocco — inline nella barra azioni.
 * Upsert su block_ratings (user_id, block_id) univoci.
 */
export default function BlockRating({ bookId, blockId, size = 16, className = '' }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('block_ratings')
        .select('stars')
        .eq('block_id', blockId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!active) return
      if (data) setStars(data.stars)
      setLoading(false)
    })()
    return () => { active = false }
  }, [user, blockId, supabase])

  const save = async (n: number) => {
    if (!user || saving) return
    const prev = stars
    setStars(n) // ottimistico
    setSaving(true)
    const { error } = await supabase
      .from('block_ratings')
      .upsert(
        { user_id: user.id, book_id: bookId, block_id: blockId, stars: n },
        { onConflict: 'user_id,block_id' }
      )
    setSaving(false)
    if (error) {
      setStars(prev)
      toast.error('Impossibile salvare il voto')
    }
  }

  if (!user || loading) return null

  const display = hover ?? stars

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label="Vota il blocco">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => save(n)}
            aria-label={`${n} stelle`}
            className="cursor-pointer hover:scale-110 transition-transform p-0.5"
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? 'text-amber-400 fill-amber-400' : 'text-sage-300 dark:text-sage-600'}
            />
          </button>
        )
      })}
    </div>
  )
}
