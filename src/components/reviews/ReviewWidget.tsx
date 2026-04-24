'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from './StarRating'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

type Variant = 'inline' | 'modal' | 'section'

interface Props {
  bookId: string
  variant?: Variant
  /** Mostra il campo testo (default: solo su modal/section) */
  withText?: boolean
  /** Visibile solo quando true (per variante modal) */
  open?: boolean
  onClose?: () => void
  /** Titolo custom */
  title?: string
  onSaved?: (stars: number) => void
}

/**
 * Widget per inserire o aggiornare una recensione.
 * - inline:  compatto, solo stelle (fine blocco)
 * - section: stelle + textarea (dettaglio libro)
 * - modal:   stelle + textarea in overlay (fine libro)
 */
export default function ReviewWidget({
  bookId,
  variant = 'inline',
  withText,
  open = true,
  onClose,
  title,
  onSaved,
}: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const showText = withText ?? variant !== 'inline'

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, stars, text')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!active) return
      if (data) {
        setExistingId(data.id)
        setStars(data.stars)
        setText(data.text || '')
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [user, bookId, supabase])

  const save = async (overrideStars?: number) => {
    if (!user) return
    const finalStars = overrideStars ?? stars
    if (!finalStars) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      book_id: bookId,
      stars: finalStars,
      text: text.trim() ? text.trim() : null,
    }
    const { data, error } = await supabase
      .from('reviews')
      .upsert(payload, { onConflict: 'user_id,book_id' })
      .select('id')
      .single()
    setSaving(false)
    if (error) {
      toast.error('Errore nel salvataggio della recensione')
      return
    }
    if (data) setExistingId(data.id)
    toast.success(existingId ? 'Recensione aggiornata' : 'Grazie per la tua recensione!')
    onSaved?.(finalStars)
  }

  if (!user) return null
  if (loading) return null

  // ===== INLINE (fine blocco) =====
  if (variant === 'inline') {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <span className="text-xs text-bark-500 dark:text-sage-400">
          {existingId ? 'Il tuo voto:' : 'Ti sta piacendo?'}
        </span>
        <StarRating
          value={stars}
          size={22}
          onChange={(v) => {
            setStars(v)
            // salva immediato: niente frizione
            void save(v)
          }}
        />
      </div>
    )
  }

  // ===== MODAL (fine libro) =====
  if (variant === 'modal') {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-[#1e221c] rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-sage-100 dark:hover:bg-sage-800">
            <X className="w-5 h-5 text-bark-400" />
          </button>
          <h3 className="text-lg font-bold text-sage-900 dark:text-sage-100 mb-1">
            {title || 'Come valuteresti questo libro?'}
          </h3>
          <p className="text-xs text-bark-400 dark:text-sage-500 mb-4">
            La tua recensione aiuta altri lettori a scoprire nuove storie.
          </p>
          <div className="flex justify-center py-2">
            <StarRating value={stars} onChange={setStars} size={32} />
          </div>
          {showText && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Racconta la tua esperienza (opzionale)…"
              rows={4}
              maxLength={2000}
              className="w-full mt-3 px-3 py-2 rounded-xl border border-sage-200 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/40 text-sage-900 dark:text-sage-100 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
            />
          )}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800"
            >
              Più tardi
            </button>
            <button
              onClick={async () => { await save(); onClose?.() }}
              disabled={!stars || saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {existingId ? 'Aggiorna' : 'Pubblica'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== SECTION (dettaglio libro) =====
  return (
    <div className="p-4 rounded-2xl border border-sage-200 dark:border-sage-700 bg-white dark:bg-[#1e221c]">
      <h3 className="text-sm font-bold text-sage-900 dark:text-sage-100 mb-2">
        {title || (existingId ? 'La tua recensione' : 'Lascia una recensione')}
      </h3>
      <StarRating value={stars} onChange={setStars} size={26} />
      {showText && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="La tua opinione (opzionale)…"
          rows={3}
          maxLength={2000}
          className="w-full mt-3 px-3 py-2 rounded-xl border border-sage-200 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/40 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
        />
      )}
      <button
        onClick={() => save()}
        disabled={!stars || saving}
        className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {existingId ? 'Aggiorna recensione' : 'Pubblica recensione'}
      </button>
    </div>
  )
}
