'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type CitationComment = {
  id: string
  user_id: string
  text: string
  created_at: string
  user?: {
    name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  highlightId: string
  open: boolean
  /** Chiamato dopo insert/delete — il parent aggiorna il contatore UI */
  onCountChange?: (delta: number) => void
}

export default function CitationComments({ highlightId, open, onCountChange }: Props) {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [comments, setComments] = useState<CitationComment[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const loadedRef = useRef(false)

  // Fetch lazy quando si apre la prima volta
  useEffect(() => {
    if (!open || loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('citation_comments')
        .select('id, user_id, text, created_at, user:profiles!citation_comments_user_id_fkey(name, username, avatar_url)')
        .eq('highlight_id', highlightId)
        .order('created_at', { ascending: true })
      setComments((data as any) || [])
      setLoading(false)
    })()
  }, [open, highlightId, supabase])

  const submit = async () => {
    const text = draft.trim()
    if (!text || !user || submitting) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('citation_comments')
      .insert({ highlight_id: highlightId, user_id: user.id, text })
      .select('id, user_id, text, created_at')
      .single()
    setSubmitting(false)
    if (error || !data) return
    const newComment: CitationComment = {
      ...(data as any),
      user: {
        name: profile?.name || null,
        username: (profile as any)?.username || null,
        avatar_url: profile?.avatar_url || null,
      },
    }
    setComments((prev) => [...(prev || []), newComment])
    setDraft('')
    onCountChange?.(1)
  }

  const remove = async (commentId: string) => {
    if (!user) return
    const { error } = await supabase.from('citation_comments').delete().eq('id', commentId).eq('user_id', user.id)
    if (error) return
    setComments((prev) => (prev || []).filter((c) => c.id !== commentId))
    onCountChange?.(-1)
  }

  const formatWhen = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'ora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}g`
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  return (
    <div
      className={`grid transition-all duration-300 ease-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-t border-sage-100 dark:border-sage-800 bg-white dark:bg-[#1e221c]">
          {/* Lista commenti */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-sage-400" />
            </div>
          ) : (comments || []).length === 0 ? (
            <p className="text-xs text-bark-400 dark:text-sage-500 text-center py-3">
              Nessun commento ancora. Scrivi il primo!
            </p>
          ) : (
            <ul className="space-y-3 mb-3">
              {(comments || []).map((c) => {
                const name = c.user?.name || c.user?.username || 'Utente'
                const isMine = user?.id === c.user_id
                const profileHref = c.user?.username ? `/profile/${c.user.username}` : null
                return (
                  <li key={c.id} className="flex gap-2.5">
                    {c.user?.avatar_url ? (
                      <img src={c.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-sage-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {profileHref ? (
                          <Link href={profileHref} className="text-xs font-semibold text-sage-800 dark:text-sage-200 hover:underline">
                            {name}
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-sage-800 dark:text-sage-200">{name}</span>
                        )}
                        <span className="text-[10px] text-bark-400">{formatWhen(c.created_at)}</span>
                        {isMine && (
                          <button
                            onClick={() => remove(c.id)}
                            className="ml-auto text-bark-300 hover:text-red-500"
                            title="Elimina commento"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-bark-700 dark:text-sage-300 mt-0.5 break-words">{c.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Input */}
          {user ? (
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="Scrivi un commento…"
                rows={1}
                maxLength={1000}
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-sage-200 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/40 text-sage-900 dark:text-sage-100 placeholder:text-bark-300 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
              <button
                onClick={submit}
                disabled={!draft.trim() || submitting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sage-500 text-white text-xs font-semibold hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Invia
              </button>
            </div>
          ) : (
            <p className="text-xs text-bark-400 dark:text-sage-500 text-center">
              <Link href="/login" className="text-sage-600 font-semibold hover:underline">
                Accedi
              </Link>{' '}
              per commentare
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
