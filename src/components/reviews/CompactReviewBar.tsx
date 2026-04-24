'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from './StarRating'
import { toast } from 'sonner'

interface Review {
  id: string
  stars: number
  text: string | null
  created_at: string
  user: {
    id: string
    name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  bookId: string
  averageRating: number
  totalReviews: number
  totalBlocks: number
  readBlocksCount: number
}

/**
 * Barra recensioni ultra-compatta.
 * Chiusa: singola riga piatta (no card/border) <48px: ⭐ 4.2 · 12 recensioni  ›
 * Aperta: accordion con stelle (textarea appare solo dopo aver votato,
 * bottone salva solo se dirty) + ultime 3 recensioni.
 */
export default function CompactReviewBar({
  bookId,
  averageRating,
  totalReviews,
  totalBlocks,
  readBlocksCount,
}: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const [initialStars, setInitialStars] = useState(0)
  const [initialText, setInitialText] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [latest, setLatest] = useState<Review[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const requiredBlocks = Math.min(3, Math.max(1, totalBlocks || 1))
  const unlocked = readBlocksCount >= requiredBlocks
  const blocksLeft = Math.max(0, requiredBlocks - readBlocksCount)

  const dirty = stars !== initialStars || text.trim() !== (initialText || '').trim()

  useEffect(() => {
    if (!open || !user) return
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, stars, text')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!active || !data) return
      setExistingId(data.id)
      setStars(data.stars)
      setInitialStars(data.stars)
      setText(data.text || '')
      setInitialText(data.text || '')
    })()
    return () => { active = false }
  }, [open, user, bookId, supabase])

  useEffect(() => {
    if (!open) return
    let active = true
    setLoadingList(true)
    ;(async () => {
      const { data } = await supabase
        .from('reviews')
        .select(`
          id, stars, text, created_at,
          user:profiles!reviews_user_id_fkey(id, name, username, avatar_url)
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })
        .limit(3)
      if (!active) return
      setLatest((data as any) || [])
      setLoadingList(false)
    })()
    return () => { active = false }
  }, [open, bookId, supabase])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const save = async () => {
    if (!user || !stars) return
    setSaving(true)
    const cleanText = text.trim() ? text.trim() : null
    const { data, error } = await supabase
      .from('reviews')
      .upsert(
        { user_id: user.id, book_id: bookId, stars, text: cleanText },
        { onConflict: 'user_id,book_id' }
      )
      .select('id')
      .single()
    setSaving(false)
    if (error) {
      toast.error('Errore nel salvataggio')
      return
    }
    if (data) setExistingId(data.id)
    setInitialStars(stars)
    setInitialText(cleanText || '')
    toast.success(existingId ? 'Recensione aggiornata' : 'Grazie per la recensione!')
  }

  const avg = averageRating || 0

  return (
    <div ref={rootRef}>
      {/* Riga compatta piatta, nessun border/card */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-2 text-left hover:opacity-80 transition-opacity"
        aria-expanded={open}
        style={{ minHeight: 40 }}
      >
        <div className="flex items-center gap-2 text-sm">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="font-bold text-sage-900 dark:text-sage-100">
            {avg > 0 ? avg.toFixed(1) : '—'}
          </span>
          <span className="text-bark-400 dark:text-sage-500">·</span>
          <span className="text-bark-500 dark:text-sage-400">
            {totalReviews} {totalReviews === 1 ? 'recensione' : 'recensioni'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-bark-400 dark:text-sage-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Accordion */}
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] mt-2' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="pt-3 pb-1 border-t border-sage-100 dark:border-sage-800">
            {/* Recensioni della community — sempre visibili a tutti */}
            <div>
              <p className="text-xs font-medium text-bark-500 dark:text-sage-400 mb-2">
                Recensioni della community
              </p>
              {loadingList ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 bg-sage-100 dark:bg-sage-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : latest.length === 0 ? (
                <p className="text-xs text-bark-400 dark:text-sage-500">
                  Ancora nessuna recensione. Sii il primo!
                </p>
              ) : (
                <div className="space-y-2">
                  {latest.map((r) => (
                    <div key={r.id} className="flex items-start gap-2 p-2 rounded-lg bg-sage-50 dark:bg-sage-900/40">
                      {r.user?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.user.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-sage-300 dark:bg-sage-700 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-sage-900 dark:text-sage-100 truncate">
                            {r.user?.name || r.user?.username || 'Anonimo'}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {r.stars}
                          </span>
                        </div>
                        {r.text && (
                          <p className="text-xs text-bark-600 dark:text-sage-300 line-clamp-2 mt-0.5">
                            {r.text}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalReviews > 3 && (
                <Link
                  href={`/libro/${bookId}/recensioni`}
                  className="text-xs font-semibold text-sage-600 dark:text-sage-400 mt-2 inline-block hover:underline"
                >
                  Vedi tutte le recensioni →
                </Link>
              )}
            </div>

            {/* Lascia la tua recensione — solo per utenti loggati */}
            {user && (
              <div className="mt-5 pt-4 border-t border-sage-100 dark:border-sage-800">
                <p className="text-xs font-medium text-bark-500 dark:text-sage-400 mb-1.5">
                  {existingId ? 'La tua recensione' : 'Lascia la tua recensione'}
                </p>
                {unlocked ? (
                  <>
                    <StarRating value={stars} onChange={setStars} size={26} />
                    {stars > 0 && (
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="La tua opinione (opzionale)…"
                        rows={2}
                        maxLength={2000}
                        className="w-full mt-2 px-3 py-2 rounded-xl border border-sage-200 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/40 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
                      />
                    )}
                    {dirty && stars > 0 && (
                      <button
                        onClick={save}
                        disabled={saving}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {existingId ? 'Aggiorna recensione' : 'Pubblica recensione'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sage-50 dark:bg-sage-900/40 text-xs text-bark-500 dark:text-sage-400">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      Leggi almeno {requiredBlocks} {requiredBlocks === 1 ? 'blocco' : 'blocchi'} per poter lasciare la tua recensione
                      {blocksLeft > 0 && ` (ne mancano ${blocksLeft})`}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
