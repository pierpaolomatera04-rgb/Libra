'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { createNotification } from '@/lib/notifications'
import {
  ChevronLeft, ChevronRight, Heart, Bookmark, MessageCircle,
  Lock, Coins, Sun, Moon, Loader2,
  ArrowLeft, Send, Flame, Sparkles, CheckCircle2, Trophy,
  Highlighter, Save, Share, X, Zap
} from 'lucide-react'
import { getBadgeById, XP_VALUES } from '@/lib/badges'
import { getMacroAreaByGenre } from '@/lib/genres'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { awardXp, type XpResult } from '@/lib/xp'
import LevelUpModal from '@/components/LevelUpModal'
import ReviewWidget from '@/components/reviews/ReviewWidget'

// Reazioni al commento:
// 1. REACTION_TYPES = reazioni statiche gratis (fuoco, cuore, penna) per chi risponde
// 2. PREMIUM_SIGNATURE_TYPES = firma animata a pagamento (1 token) per chi commenta
// 3. REACTION_EMOJIS = mappa completa per rendering dei tipi storici gia in db
const REACTION_EMOJIS: Record<string, string> = {
  fire: '🔥',
  heart: '❤️',
  star: '⭐',
  gem: '💎',
  crown: '👑',
  pen: '🖋️',
}

// Reazioni gratis, statiche, per chi risponde ai commenti
const REACTION_TYPES: { type: string; emoji: string; label: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'Fuoco' },
  { type: 'heart', emoji: '❤️', label: 'Cuore' },
  { type: 'pen', emoji: '🖋️', label: 'Penna' },
]

// Firma premium animata (costa 1 token), solo per l'autore del commento
const PREMIUM_SIGNATURE_TYPES: { type: string; emoji: string; label: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'Fuoco' },
  { type: 'heart', emoji: '❤️', label: 'Cuore' },
  { type: 'gem', emoji: '💎', label: 'Diamante' },
  { type: 'crown', emoji: '👑', label: 'Corona' },
  { type: 'pen', emoji: '🖋️', label: 'Penna' },
]

function ReactionBar({
  commentId,
  reactions,
  onReact,
  disabled,
  compact = false,
}: {
  commentId: string
  reactions: { type: string; count: number; reactedByMe: boolean }[]
  onReact: (commentId: string, type: string) => void
  disabled?: boolean
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const sizeText = compact ? 'text-[10px]' : 'text-xs'
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => {
        const emoji = REACTION_EMOJIS[r.type]
        if (!emoji) return null
        return (
          <button
            key={r.type}
            onClick={() => !disabled && !r.reactedByMe && onReact(commentId, r.type)}
            disabled={disabled || r.reactedByMe}
            title={r.reactedByMe ? 'Hai gia reagito' : 'Reagisci'}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border transition-colors ${sizeText} ${
              r.reactedByMe
                ? 'bg-sage-50 dark:bg-sage-800 border-sage-200 dark:border-sage-700 text-sage-700 dark:text-sage-300'
                : 'bg-white dark:bg-[#1e221c] border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-800'
            }`}
          >
            <span>{emoji}</span>
            <span className="font-semibold">{r.count}</span>
          </button>
        )
      })}
      <div className="relative">
        <button
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          title="Aggiungi reazione"
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-sage-300 dark:border-sage-700 text-bark-400 hover:text-sage-600 hover:border-sage-400 transition-colors ${sizeText}`}
        >
          +
        </button>
        {open && !disabled && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div className="absolute bottom-full left-0 mb-1 z-[70] flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-[#1e221c] border border-sage-200 dark:border-sage-700 rounded-full shadow-lg">
              {REACTION_TYPES.map((r) => (
                <button
                  key={r.type}
                  onClick={() => {
                    setOpen(false)
                    onReact(commentId, r.type)
                  }}
                  title={r.label}
                  className="text-base hover:scale-110 transition-transform"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ReaderPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.bookId as string
  const blockNumber = parseInt(params.blockId as string)
  const { user, profile, refreshProfile, totalTokens, loading: authLoading } = useAuth()
  const supabase = createClient()

  // ── Guest Block: gli utenti non autenticati NON possono accedere al reader.
  //    Li reindirizziamo alla pagina di signup preservando l'URL di origine
  //    così che dopo la registrazione tornino esattamente qui.
  useEffect(() => {
    if (!authLoading && !user) {
      const currentUrl = `/reader/${bookId}/${blockNumber}`
      router.replace(`/signup?redirect=${encodeURIComponent(currentUrl)}`)
    }
  }, [authLoading, user, bookId, blockNumber, router])

  const [book, setBook] = useState<any>(null)
  const [block, setBlock] = useState<any>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [planExpired, setPlanExpired] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  // Motivo del paywall dal check server-side: informa l'UI sul tier richiesto
  const [accessReason, setAccessReason] = useState<
    | 'GRANTED'
    | 'REQUIRES_TOKEN'
    | 'REQUIRES_PLAN'
    | 'LOCKED_NOT_RELEASED'
    | 'PLAN_BOOK_LIMIT'
    | null
  >(null)
  const [accessMessage, setAccessMessage] = useState<string>('')
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null)
  const [blueLightFilter, setBlueLightFilter] = useState(false)
  const [readStartTime, setReadStartTime] = useState<number>(Date.now())
  const [completionData, setCompletionData] = useState<{
    xpEarned: number; streak: number; streakBonus: number; totalXp: number; isNewStreak: boolean
  } | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [showCelebration, setShowCelebration] = useState<{ type: 'badge' | 'streak'; title: string; subtitle: string; emoji: string } | null>(null)
  const [levelUpResult, setLevelUpResult] = useState<XpResult | null>(null)
  // Review: modale fine libro
  const [showFinalReview, setShowFinalReview] = useState(false)

  // Highlight system
  const [highlights, setHighlights] = useState<any[]>([])
  const [selectionPopover, setSelectionPopover] = useState<{
    text: string; x: number; y: number
  } | null>(null)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [deepLinkHighlight, setDeepLinkHighlight] = useState<string | null>(null)

  // Tip prompt (shown on "next block" for open/free books)
  const [showTipPrompt, setShowTipPrompt] = useState(false)
  const [tipAmount, setTipAmount] = useState(5)
  const [sendingTip, setSendingTip] = useState(false)

  // Reactions (per commento) — gratis, nessun costo token
  const [commentReactions, setCommentReactions] = useState<Record<string, { type: string; count: number; reactedByMe: boolean }[]>>({})
  const [reactingTo, setReactingTo] = useState<string | null>(null)
  // Firma premium animata dell'autore del commento (comment_id -> reaction_type)
  const [ownerReactions, setOwnerReactions] = useState<Record<string, string>>({})
  // Firma premium selezionata prima di pubblicare il proprio commento (costa 1 token)
  const [selectedPremiumReaction, setSelectedPremiumReaction] = useState<string | null>(null)

  // Boost visibilita (nel reader, sulla actions bar)
  const [canBoost, setCanBoost] = useState(true)
  const [boosting, setBoosting] = useState(false)
  const [hoursUntilBoost, setHoursUntilBoost] = useState<number | null>(null)

  // ── Lettura: scroll verticale semplice fino a fine blocco ──
  // Accumulator parole (persistito per libro in localStorage): ogni 250 parole
  // scrollate (calcolate dalla frazione di scroll) incrementa
  // user_library.pages_read di 1, indipendente dalla dimensione testo.
  type TextSize = 'small' | 'medium' | 'large'
  const TEXT_SIZE_PX: Record<TextSize, number> = { small: 15, medium: 18, large: 22 }
  const [textSize, setTextSize] = useState<TextSize>('medium')
  const fontSize = TEXT_SIZE_PX[textSize]
  const pagerRef = useRef<HTMLDivElement | null>(null)
  const wordsAccumulatedRef = useRef<number>(0)
  const pendingIncrementRef = useRef<number>(0)
  // Frazione max di scroll raggiunta (0..1) per il blocco corrente — serve
  // per accreditare parole solo quando l'utente effettivamente prosegue.
  const maxScrollFractionRef = useRef<number>(0)

  // Hydrate accumulator parole dal localStorage per libro
  useEffect(() => {
    if (!bookId || typeof window === 'undefined') return
    const raw = window.localStorage.getItem(`reader:words:${bookId}`)
    wordsAccumulatedRef.current = raw ? Math.max(0, Number(raw) || 0) : 0
  }, [bookId])

  // Open book = free for everyone (still gated UI, but no token cost)
  const isOpenBook = book?.access_level === 'open' || book?.tier === 'free'

  // Fetch book & block
  const fetchData = useCallback(async () => {
    setLoading(true)
    setReadStartTime(Date.now())

    // Fetch book
    const { data: bookData } = await supabase
      .from('books')
      .select('*, author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)')
      .eq('id', bookId)
      .single()

    if (!bookData) {
      toast.error('Libro non trovato')
      router.push('/browse')
      return
    }

    // Draft protection: solo l'autore può accedere al reader di una bozza
    if (bookData.status === 'draft' && bookData.author_id !== user?.id) {
      toast.error('Questo libro non è ancora stato pubblicato')
      router.push('/browse')
      return
    }

    setBook(bookData)

    // Fetch all blocks (just metadata)
    const { data: blocksData } = await supabase
      .from('blocks')
      .select('id, block_number, title, is_released, scheduled_date')
      .eq('book_id', bookId)
      .order('block_number')

    setBlocks(blocksData || [])

    // Fetch current block — solo metadata (senza contenuto) finché non si verifica l'accesso.
    // Il contenuto verrà caricato solo dopo il check server-side autorizzativo.
    const { data: blockMeta } = await supabase
      .from('blocks')
      .select('id, block_number, title, is_released, scheduled_date, release_at, silver_release_at, gold_release_at, token_price, word_count, book_id')
      .eq('book_id', bookId)
      .eq('block_number', blockNumber)
      .single()

    if (!blockMeta) {
      toast.error('Blocco non trovato')
      return
    }

    // Provvisoriamente impostiamo i metadati — il content è vuoto finché non passa il check
    const blockData: any = { ...blockMeta, content: '' }
    setBlock(blockData)

    // ── ACCESSO BLOCCO: tutto il controllo è delegato all'API server-side
    //    /api/access/check (autoritativa, usa la sessione via cookie + RLS bypass admin)
    //    così Free users NON possono accedere a blocchi Silver/Gold anche
    //    cambiando l'URL manualmente.
    try {
      const resp = await fetch(`/api/access/check?bookId=${bookId}&block=${blockNumber}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const accessData = await resp.json()

      setAccessMessage(accessData?.message || '')

      if (accessData?.canRead) {
        setIsLocked(false)
        setPlanExpired(false)
        setAccessReason('GRANTED')
        // Carica il contenuto del blocco SOLO dopo che l'accesso è stato autorizzato
        const { data: fullBlock } = await supabase
          .from('blocks')
          .select('content')
          .eq('id', blockMeta.id)
          .single()
        if (fullBlock) {
          blockData.content = fullBlock.content
          setBlock({ ...blockData })
        }
      } else {
        setIsLocked(true)
        // Mappa i codici di accesso server → stato UI
        if (accessData?.access === 'REQUIRES_PLAN') {
          setAccessReason('REQUIRES_PLAN')
          // Se è già stato in libreria come PLAN, significa abbonamento scaduto
          if (accessData?.message?.toLowerCase()?.includes('scaduto')) {
            setPlanExpired(true)
          }
        } else if (accessData?.access === 'LOCKED_NOT_RELEASED') {
          setAccessReason('LOCKED_NOT_RELEASED')
        } else if (accessData?.access === 'PLAN_BOOK_LIMIT') {
          setAccessReason('PLAN_BOOK_LIMIT')
        } else {
          setAccessReason('REQUIRES_TOKEN')
        }
      }
    } catch (err) {
      // In caso di errore di rete, fallback conservativo: blocca tutto tranne il primo blocco
      const isFreeBlock = blockNumber === 1 && bookData.first_block_free
      setIsLocked(!isFreeBlock)
      setAccessReason(isFreeBlock ? 'GRANTED' : 'REQUIRES_TOKEN')
      console.warn('Errore verifica accesso:', err)
    }

    // Check boost status (anti-abuso 24h)
    if (user) {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentBoost } = await supabase
        .from('book_boosts')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (recentBoost) {
        setCanBoost(false)
        const elapsedMs = Date.now() - new Date(recentBoost.created_at).getTime()
        const remainingHours = Math.ceil((24 * 60 * 60 * 1000 - elapsedMs) / (60 * 60 * 1000))
        setHoursUntilBoost(remainingHours)
      } else {
        setCanBoost(true)
        setHoursUntilBoost(null)
      }
    }

    // Check like
    if (user) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single()
      setLiked(!!likeData)

      const { data: saveData } = await supabase
        .from('user_library')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single()
      setSaved(saveData?.status === 'saved')
    }

    // Fetch comments (con risposte)
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, user:profiles!comments_user_id_fkey(id, name, username, author_pseudonym, avatar_url, total_xp)')
      .eq('block_id', blockData.id)
      .order('created_at', { ascending: true })
      .limit(100)

    setComments(commentsData || [])

    // Fetch reazioni ai commenti del blocco
    // — static (gratis): fire/heart/pen da chi risponde
    // — premium signature (1 tk): reaction dell'autore sul proprio commento, renderizzata animata
    const commentIds = (commentsData || []).map((c: any) => c.id)
    if (commentIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('comment_reactions')
        .select('comment_id, reaction_type, user_id, created_at')
        .in('comment_id', commentIds)
        .order('created_at', { ascending: true })
      const grouped: Record<string, { type: string; count: number; reactedByMe: boolean }[]> = {}
      const owners: Record<string, string> = {}
      // Mappa commentId -> authorId per identificare la firma premium
      const commentAuthor: Record<string, string> = {}
      for (const c of (commentsData || [])) commentAuthor[c.id] = c.user_id
      for (const r of (reactionsData || [])) {
        if (!grouped[r.comment_id]) grouped[r.comment_id] = []
        const existing = grouped[r.comment_id].find(x => x.type === r.reaction_type)
        if (existing) {
          existing.count += 1
          if (user && r.user_id === user.id) existing.reactedByMe = true
        } else {
          grouped[r.comment_id].push({
            type: r.reaction_type,
            count: 1,
            reactedByMe: user ? r.user_id === user.id : false,
          })
        }
        // Se l'autore del commento ha reagito al proprio commento — firma premium animata
        if (!owners[r.comment_id] && r.user_id === commentAuthor[r.comment_id]) {
          owners[r.comment_id] = r.reaction_type
        }
      }
      setCommentReactions(grouped)
      setOwnerReactions(owners)
    }

    // Fetch highlights: user's own + any deep-linked public highlight from URL
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const targetHlId = urlParams.get('highlight')

      const allHls: any[] = []

      if (user) {
        const { data: hlData } = await supabase
          .from('highlights')
          .select('id, content, is_public, color')
          .eq('user_id', user.id)
          .eq('block_id', blockData.id)
        if (hlData) allHls.push(...hlData)
      }

      if (targetHlId) {
        const { data: targetHl } = await supabase
          .from('highlights')
          .select('id, content, is_public, color')
          .eq('id', targetHlId)
          .eq('is_public', true)
          .single()
        if (targetHl && !allHls.find(h => h.id === targetHl.id)) {
          allHls.push(targetHl)
        }
        setDeepLinkHighlight(targetHlId)
      }

      setHighlights(allHls)
    } catch { /* table may not exist */ }

    // Update library: mark as 'reading' when user opens any block
    if (user && blockData) {
      const { data: libEntry } = await supabase
        .from('user_library')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single()

      if (libEntry) {
        if (libEntry.status === 'saved') {
          await supabase
            .from('user_library')
            .update({ status: 'reading', last_read_block_id: blockData.id, updated_at: new Date().toISOString() })
            .eq('id', libEntry.id)
        } else if (libEntry.status === 'reading') {
          await supabase
            .from('user_library')
            .update({ last_read_block_id: blockData.id, updated_at: new Date().toISOString() })
            .eq('id', libEntry.id)
        }
      } else {
        await supabase.from('user_library').insert({
          user_id: user.id,
          book_id: bookId,
          status: 'reading',
          last_read_block_id: blockData.id,
        })
      }
    }

    setLoading(false)
  }, [bookId, blockNumber, user, supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset tracker scroll quando cambia blocco (nuova sessione di lettura)
  useEffect(() => {
    maxScrollFractionRef.current = 0
  }, [block?.id])

  // ── Tracker pagine lette basato sullo scroll della finestra ──
  // Monitora quanto l'utente ha scrollato attraverso il contenuto del blocco.
  // Ogni volta che la frazione massima di scroll raggiunta cresce, accredita
  // (wordCount * deltaFrazione) all'accumulatore parole; ogni 250 parole → +1
  // in user_library.pages_read. L'accumulatore persiste in localStorage, quindi
  // non si resetta tra sessioni diverse.
  useEffect(() => {
    if (!user || !block || isLocked) return
    const wordCount: number = Number(block.word_count) || 0
    if (wordCount <= 0) return

    let pending = 0
    const onScroll = () => {
      const el = pagerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Frazione di contenuto già passata: quanto del blocco è sopra la
      // metà inferiore della viewport. 0 = ancora tutto sotto, 1 = fine blocco.
      const total = Math.max(1, rect.height)
      const visibleEnd = Math.min(rect.bottom, vh) - rect.top
      const frac = Math.max(0, Math.min(1, visibleEnd / total))
      if (frac <= maxScrollFractionRef.current) return
      const delta = frac - maxScrollFractionRef.current
      maxScrollFractionRef.current = frac

      const prev = wordsAccumulatedRef.current
      const next = prev + wordCount * delta
      wordsAccumulatedRef.current = next
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`reader:words:${bookId}`, String(next))
      }
      const pagesDelta = Math.floor(next / 250) - Math.floor(prev / 250)
      pending += pagesDelta
      pendingIncrementRef.current = pending
      if (pending > 0) {
        const toSend = pending
        supabase.rpc('increment_library_pages_read', {
          p_book_id: bookId,
          p_delta: toSend,
        }).then((res: any) => {
          if (res?.error) {
            console.warn('increment_library_pages_read error', res.error.message)
          } else {
            pending -= toSend
            pendingIncrementRef.current = pending
          }
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // Trigger iniziale: se il blocco è corto, fire subito
    const t = setTimeout(onScroll, 500)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(t)
    }
  }, [user, block, isLocked, bookId, supabase])

  // Record read when leaving/navigating
  useEffect(() => {
    return () => {
      if (user && block && !isLocked) {
        const readTime = Math.floor((Date.now() - readStartTime) / 1000)
        supabase.from('block_reads').upsert({
          user_id: user.id,
          block_id: block.id,
          book_id: bookId,
          read_completed: readTime > 30,
          reading_time_seconds: readTime,
        }, { onConflict: 'user_id,block_id' })
      }
    }
  }, [user, block, isLocked, readStartTime, bookId, supabase])

  // Record block completion for XP/streak after 30 seconds of reading
  useEffect(() => {
    if (!user || !block || isLocked) return
    const timer = setTimeout(async () => {
      try {
        // Upsert block_reads with read_completed=true so the DB trigger
        // recomputes profiles.pages_read immediately
        await supabase.from('block_reads').upsert({
          user_id: user.id,
          block_id: block.id,
          book_id: bookId,
          read_completed: true,
          reading_time_seconds: 30,
        }, { onConflict: 'user_id,block_id' })

        const { data: result } = await supabase.rpc('record_block_completion', {
          p_user_id: user.id,
          p_book_id: bookId,
          p_block_id: block.id,
          p_block_number: blockNumber,
        })
        if (result && !result.already_read) {
          setCompletionData({
            xpEarned: result.xp_earned,
            streak: result.streak,
            streakBonus: result.streak_bonus,
            totalXp: result.total_xp,
            isNewStreak: result.streak > 1,
          })
          setShowCompletion(true)
          refreshProfile()

          // XP blocco letto (+5) già assegnato da record_block_completion,
          // che è idempotente via reading_progress.UNIQUE(user_id, block_id).
          // La notifica finale compare via setShowCompletion(true) (CompletionBanner).

          // Se e' l'ultimo blocco del libro → bonus "Libro Completato" (+50 XP)
          if (blocks.length > 0 && blockNumber === blocks.length) {
            const completeXp = await awardXp(
              supabase, user.id, XP_VALUES.BOOK_COMPLETE,
              `book_complete:${bookId}`, // idempotente per libro lato server
              true,
            )
            if (completeXp?.level_up) {
              setTimeout(() => setLevelUpResult(completeXp), 3500)
            }
          }

          // Check for new badges (niente XP aggiuntivo: fuori spec)
          try {
            const { data: badgeResults } = await supabase.rpc('check_and_award_badges', { p_user_id: user.id })
            if (badgeResults) {
              const newBadges = badgeResults.filter((b: any) => b.just_earned)
              if (newBadges.length > 0) {
                const badge = getBadgeById(newBadges[0].badge_id)
                if (badge) {
                  setTimeout(() => {
                    setShowCelebration({
                      type: 'badge',
                      title: `Badge sbloccato: ${badge.name}!`,
                      subtitle: badge.description,
                      emoji: badge.icon,
                    })
                  }, 1500)
                }
              }
            }
          } catch (err) {
            console.error('Errore check badge:', err)
          }

          // Streak milestones
          if (result.streak === 7) {
            setTimeout(() => {
              setShowCelebration({
                type: 'streak',
                title: 'Una settimana di lettura!',
                subtitle: '7 giorni consecutivi. Incredibile!',
                emoji: '🎉',
              })
            }, 2000)
          } else if (result.streak === 30) {
            setTimeout(() => {
              setShowCelebration({
                type: 'streak',
                title: 'Un mese di streak!',
                subtitle: '30 giorni consecutivi. Sei una leggenda!',
                emoji: '🏆',
              })
            }, 2000)
          } else if (result.streak === 2) {
            toast('🔥 2° giorno di lettura continua!', {
              description: 'Sei sulla strada giusta per creare una grande abitudine.',
              duration: 6000,
            })
          }
        }
      } catch (err) {
        console.error('Errore record completion:', err)
      }
    }, 30000) // 30 secondi
    return () => clearTimeout(timer)
  }, [user, block, isLocked, bookId, blockNumber, supabase, refreshProfile])

  // Handle "next block" click — for open books, optionally show tip prompt
  const handleNextBlock = (e: React.MouseEvent) => {
    if (
      isOpenBook &&
      user &&
      book?.author_id &&
      book.author_id !== user.id &&
      typeof window !== 'undefined' &&
      !sessionStorage.getItem(`tip_skipped_${bookId}`)
    ) {
      e.preventDefault()
      setShowTipPrompt(true)
    }
  }

  // Send tip from the prompt
  const handleSendTip = async () => {
    if (!book?.author_id || !user) return
    setSendingTip(true)
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: book.author_id, amount: tipAmount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Errore invio mancia')
      } else {
        toast.success(`Grazie! Mancia di ${tipAmount} token inviata`)
        sessionStorage.setItem(`tip_skipped_${bookId}`, '1')
        setShowTipPrompt(false)
        await refreshProfile()
        router.push(`/reader/${bookId}/${blockNumber + 1}`)
      }
    } catch {
      toast.error('Errore di rete')
    } finally {
      setSendingTip(false)
    }
  }

  const handleSkipTip = (remember: boolean) => {
    if (remember && typeof window !== 'undefined') {
      sessionStorage.setItem(`tip_skipped_${bookId}`, '1')
    }
    setShowTipPrompt(false)
    router.push(`/reader/${bookId}/${blockNumber + 1}`)
  }

  // Free unlock for "open" books (no tokens, just records the unlock)
  const handleFreeUnlock = async () => {
    if (!user || !block) return
    setUnlocking(true)
    try {
      const { error: unlockErr } = await supabase
        .from('block_unlocks')
        .upsert({
          user_id: user.id,
          block_id: block.id,
          book_id: bookId,
          tokens_spent: 0,
          token_type: 'free',
        }, { onConflict: 'user_id,block_id' })

      if (unlockErr) {
        console.error('block_unlocks upsert error:', unlockErr)
        toast.error(`Errore salvataggio sblocco: ${unlockErr.message}`)
        return
      }

      await supabase.from('user_library').upsert({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_read_block_id: block.id,
      }, { onConflict: 'user_id,book_id' })

      setIsLocked(false)
    } catch (err: any) {
      console.error('handleFreeUnlock exception:', err)
      toast.error('Errore nello sblocco')
    } finally {
      setUnlocking(false)
    }
  }

  // Unlock block
  const handleUnlock = async () => {
    if (!user || !block) return

    // Open/free books skip token charging
    if (isOpenBook) {
      return handleFreeUnlock()
    }

    const price = block.token_price || book?.token_price_per_block || 5

    if (totalTokens < price) {
      toast.error('Saldo insufficiente. Ricarica i tuoi Token per continuare.', {
        action: { label: 'Wallet', onClick: () => router.push('/wallet') },
        duration: 6000,
      })
      return
    }

    setUnlocking(true)
    try {
      // Deduct tokens (prefer bonus first)
      let bonusUsed = 0
      let premiumUsed = 0
      let remaining = price

      if (profile!.bonus_tokens > 0) {
        bonusUsed = Math.min(profile!.bonus_tokens, remaining)
        remaining -= bonusUsed
      }
      premiumUsed = remaining

      await supabase
        .from('profiles')
        .update({
          bonus_tokens: profile!.bonus_tokens - bonusUsed,
          premium_tokens: profile!.premium_tokens - premiumUsed,
        })
        .eq('id', user.id)

      // Record unlock
      const { error: unlockInsertErr } = await supabase
        .from('block_unlocks')
        .upsert({
          user_id: user.id,
          block_id: block.id,
          book_id: bookId,
          tokens_spent: price,
          token_type: bonusUsed > 0 && premiumUsed > 0 ? 'mixed' : bonusUsed > 0 ? 'bonus' : 'premium',
        }, { onConflict: 'user_id,block_id' })

      if (unlockInsertErr) {
        console.error('block_unlocks insert error:', unlockInsertErr)
        toast.error(`Errore registrazione sblocco: ${unlockInsertErr.message}`)
        // Rollback token deduction
        await supabase
          .from('profiles')
          .update({
            bonus_tokens: profile!.bonus_tokens,
            premium_tokens: profile!.premium_tokens,
          })
          .eq('id', user.id)
        await refreshProfile()
        return
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'unlock',
        amount: -price,
        block_id: block.id,
        book_id: bookId,
        description: `Sblocco blocco ${blockNumber} - ${book.title}`,
      })

      // Update library
      await supabase.from('user_library').upsert({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_read_block_id: block.id,
      }, { onConflict: 'user_id,book_id' })

      setIsLocked(false)
      await refreshProfile()
      toast.success(`Blocco sbloccato! -${price} token`)

      // Notifica all'autore
      if (book?.author_id) {
        const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
        createNotification({
          supabase,
          recipientId: book.author_id,
          actorId: user.id,
          actorName,
          type: 'unlock',
          title: 'Blocco sbloccato',
          message: `${actorName} ha sbloccato il blocco ${blockNumber} di "${book.title}" (${price} token)`,
          data: { book_id: bookId, book_title: book?.title, block_number: blockNumber, tokens_spent: price },
        })
      }
    } catch {
      toast.error('Errore nello sblocco')
    } finally {
      setUnlocking(false)
    }
  }

  // Like / Save
  const toggleLike = async () => {
    if (!user) { toast.error('Accedi per mettere like'); return }
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('book_id', bookId)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, book_id: bookId })

      // Notifica all'autore
      if (book?.author_id) {
        const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
        createNotification({
          supabase,
          recipientId: book.author_id,
          actorId: user.id,
          actorName,
          type: 'like',
          title: 'Nuovo like',
          message: `${actorName} ha messo like a "${book.title}"`,
          data: { book_id: bookId, book_title: book.title },
        })
      }
    }
    setLiked(!liked)
  }

  const toggleSave = async () => {
    if (!user) { toast.error('Accedi per salvare'); return }
    if (saved) {
      await supabase.from('user_library').update({ status: 'reading' }).eq('user_id', user.id).eq('book_id', bookId)
    } else {
      await supabase.from('user_library').upsert({
        user_id: user.id, book_id: bookId, status: 'saved', saved_at: new Date().toISOString(),
      }, { onConflict: 'user_id,book_id' })

      // Notifica all'autore
      if (book?.author_id) {
        const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
        createNotification({
          supabase,
          recipientId: book.author_id,
          actorId: user.id,
          actorName,
          type: 'save',
          title: 'Libro salvato',
          message: `${actorName} ha salvato "${book.title}" nella libreria`,
          data: { book_id: bookId, book_title: book.title },
        })
      }
    }
    setSaved(!saved)
    toast.success(saved ? 'Rimosso dai salvati' : 'Salvato in libreria')
  }

  // Boost Visibilita — 10 tk, 1 per utente/libro/24h
  const handleBoost = async () => {
    if (!user) { router.push('/login'); return }
    if (!canBoost || boosting) return
    setBoosting(true)
    try {
      const { data, error } = await (supabase.rpc as any)('boost_book', {
        p_user_id: user.id,
        p_book_id: bookId,
      })
      if (error) { toast.error('Errore boost', { description: error.message }); return }
      if (!data?.success) { toast.error('Boost non riuscito', { description: data?.error || 'Errore' }); return }
      toast.success('Boost attivato!', { description: `+${data.visibility_added} visibilita per "${book?.title}"` })
      setCanBoost(false)
      setHoursUntilBoost(24)
      refreshProfile?.()
      // +10 XP per boost
      const xpRes = await awardXp(supabase, user.id, XP_VALUES.BOOST, 'boost', true)
      if (xpRes?.level_up) setTimeout(() => setLevelUpResult(xpRes), 1500)
      if (book?.author_id) {
        const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
        createNotification({
          supabase,
          recipientId: book.author_id,
          actorId: user.id,
          actorName,
          type: 'like',
          title: 'Boost ricevuto',
          message: `${actorName} ha boostato "${book?.title}" (+10 visibilita)`,
          data: { book_id: bookId, book_title: book?.title },
        })
      }
    } catch (e: any) {
      toast.error('Errore boost', { description: e?.message || 'Riprova' })
    } finally {
      setBoosting(false)
    }
  }

  // Reazione al commento — gratis, semplice INSERT, nessun token speso
  const handleReact = async (commentId: string, reactionType: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    if (reactingTo) return
    // Se ho gia reagito con questo tipo, non fare nulla
    const existing = (commentReactions[commentId] || []).find((r) => r.type === reactionType)
    if (existing?.reactedByMe) return
    setReactingTo(commentId + ':' + reactionType)
    try {
      const { error } = await supabase.from('comment_reactions').insert({
        user_id: user.id,
        comment_id: commentId,
        reaction_type: reactionType,
        tokens_spent: 0,
      })
      if (error) {
        toast.error('Errore reazione', { description: error.message })
        return
      }
      // Aggiorna stato locale
      setCommentReactions(prev => {
        const next = { ...prev }
        const list = [...(next[commentId] || [])]
        const ex = list.find(x => x.type === reactionType)
        if (ex) {
          ex.count += 1
          ex.reactedByMe = true
        } else {
          list.push({ type: reactionType, count: 1, reactedByMe: true })
        }
        next[commentId] = list
        return next
      })
    } catch (e: any) {
      toast.error('Errore reazione', { description: e?.message || 'Riprova' })
    } finally {
      setReactingTo(null)
    }
  }

  // Delete comment (solo proprio)
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return
    if (!confirm('Eliminare questo commento? Verranno rimosse anche le risposte.')) return
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)
      if (error) {
        toast.error('Eliminazione fallita', { description: error.message })
        return
      }
      // Rimuovi commento e sue risposte dallo stato locale
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_comment_id !== commentId))
      // Pulisci reactions locali
      setCommentReactions(prev => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      setOwnerReactions(prev => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      toast.success('Commento eliminato')
    } catch (e: any) {
      toast.error('Errore', { description: e?.message || 'Riprova' })
    }
  }

  // Comment (con supporto risposte e @menzioni)
  const handleComment = async () => {
    if (!user || !newComment.trim() || !block) return
    const { data: comment } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        block_id: block.id,
        book_id: bookId,
        content: newComment.trim(),
        is_author_reply: user.id === book?.author_id,
        parent_comment_id: replyingTo?.id || null,
      })
      .select('*, user:profiles!comments_user_id_fkey(id, name, username, author_pseudonym, avatar_url, total_xp)')
      .single()

    if (comment) {
      setComments(prev => [...prev, comment])
      setNewComment('')
      setReplyingTo(null)

      // +1 XP per commento
      const commentXp = await awardXp(supabase, user.id, XP_VALUES.COMMENT, 'comment', true)
      if (commentXp?.level_up) setTimeout(() => setLevelUpResult(commentXp), 1500)

      // Se l'utente ha scelto una firma premium, spendi 1 token e attaccala al proprio commento
      if (selectedPremiumReaction) {
        const chosen = selectedPremiumReaction
        setSelectedPremiumReaction(null)
        try {
          const { data: rxData, error: rxErr } = await (supabase.rpc as any)('react_to_comment', {
            p_user_id: user.id,
            p_comment_id: comment.id,
            p_reaction_type: chosen,
          })
          if (rxErr || !rxData?.success) {
            toast.warning('Commento pubblicato, ma firma premium non applicata', {
              description: rxErr?.message || rxData?.error || 'Token insufficienti?',
            })
          } else {
            setOwnerReactions(prev => ({ ...prev, [comment.id]: chosen }))
            setCommentReactions(prev => ({
              ...prev,
              [comment.id]: [{ type: chosen, count: 1, reactedByMe: true }],
            }))
            toast.success('Commento con firma premium pubblicato')
            refreshProfile?.()
            // Nessun XP addizionale per firma premium (fuori spec).
          }
        } catch (e: any) {
          toast.warning('Firma premium non applicata', { description: e?.message || 'Riprova' })
        }
      } else {
        toast.success('Commento pubblicato')
      }

      // Notifica all'autore del libro
      if (book?.author_id && book.author_id !== user.id) {
        const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
        createNotification({
          supabase,
          recipientId: book.author_id,
          actorId: user.id,
          actorName,
          type: 'comment',
          title: 'Nuovo commento',
          message: `${actorName} ha commentato "${book.title}" (blocco ${blockNumber})`,
          data: { book_id: bookId, book_title: book?.title, block_number: blockNumber, comment_preview: newComment.trim().slice(0, 100) },
        })
      }

      // Notifica all'autore del commento a cui si risponde
      if (replyingTo?.id) {
        const parentComment = comments.find(c => c.id === replyingTo.id)
        if (parentComment && parentComment.user_id !== user.id) {
          const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
          createNotification({
            supabase,
            recipientId: parentComment.user_id,
            actorId: user.id,
            actorName,
            type: 'comment',
            title: 'Risposta al tuo commento',
            message: `${actorName} ha risposto al tuo commento su "${book?.title}"`,
            data: { book_id: bookId, book_title: book?.title, block_number: blockNumber },
          })
        }
      }

      // Notifica le @menzioni
      const mentions = newComment.match(/@(\w+)/g)
      if (mentions) {
        for (const mention of mentions) {
          const mentionUsername = mention.slice(1)
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', mentionUsername)
            .single()
          if (mentionedUser && mentionedUser.id !== user.id) {
            const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
            createNotification({
              supabase,
              recipientId: mentionedUser.id,
              actorId: user.id,
              actorName,
              type: 'comment',
              title: 'Ti hanno menzionato',
              message: `${actorName} ti ha menzionato in un commento su "${book?.title}"`,
              data: { book_id: bookId, book_title: book?.title, block_number: blockNumber },
            })
          }
        }
      }
    }
  }

  // Scroll & flash deep-linked highlight when block content is rendered
  useEffect(() => {
    if (!deepLinkHighlight || loading || isLocked) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-highlight-id="${deepLinkHighlight}"]`) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('animate-pulse')
        el.style.transition = 'all 0.4s ease'
        el.style.boxShadow = '0 0 0 4px rgba(251, 191, 36, 0.5)'
        setTimeout(() => {
          el.classList.remove('animate-pulse')
          el.style.boxShadow = ''
        }, 3000)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [deepLinkHighlight, loading, isLocked, highlights])

  // ── Highlight handlers ──
  const macroArea = getMacroAreaByGenre(book?.genre)
  const highlightColor = macroArea?.color?.bg?.replace('bg-', '') || 'sage-200'

  const handleTextSelect = () => {
    if (!user || isLocked) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionPopover(null)
      return
    }
    const text = selection.toString().trim()
    if (text.length < 5) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setSelectionPopover({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const saveHighlight = async (mode: 'private' | 'public') => {
    if (!user || !block || !selectionPopover) return
    setSavingHighlight(true)

    try {
      const { data, error } = await supabase
        .from('highlights')
        .insert({
          user_id: user.id,
          book_id: bookId,
          block_id: block.id,
          block_number: blockNumber,
          content: selectionPopover.text,
          color: highlightColor,
          is_public: mode === 'public',
        })
        .select('id, content, is_public, color')
        .single()

      if (error) throw error
      if (data) setHighlights(prev => [...prev, data])

      if (mode === 'public') {
        toast.success('Citazione pubblicata!')
        // +10 XP per condivisione frase (max 2/giorno — cap DB)
        const shareXp = await awardXp(supabase, user.id, XP_VALUES.SHARE_SENTENCE, 'share_sentence', true)
        if (shareXp?.level_up) setTimeout(() => setLevelUpResult(shareXp), 1500)
      } else {
        // Link al tab "Frasi Salvate" nel profilo utente
        const profileUrl = profile?.username
          ? `/profile/${profile.username}?tab=frasi`
          : `/profile/${user.id}?tab=frasi`
        toast.success('Frase salvata nel tuo profilo!', {
          action: {
            label: 'Vedi',
            onClick: () => router.push(profileUrl),
          },
          duration: 5000,
        })
      }

      window.getSelection()?.removeAllRanges()
      setSelectionPopover(null)
    } catch {
      toast.error('Errore nel salvataggio')
    }
    setSavingHighlight(false)
  }

  // Guest block: mostra spinner finché l'auth si risolve o il redirect verso /signup parte
  if (loading || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-[#161a14]">
        <Loader2 className="w-8 h-8 text-sage-500 animate-spin" />
      </div>
    )
  }

  const _authorName = book?.author?.author_pseudonym || book?.author?.name || 'Autore'

  return (
    <div className={`min-h-screen bg-cream-50 dark:bg-[#161a14] ${blueLightFilter ? 'blue-light-filter' : ''}`}>
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-cream-50/95 dark:bg-[#161a14]/90 backdrop-blur-sm border-b border-sage-100 dark:border-sage-800/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-bark-500 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </button>

          <Link
            href={`/libro/${bookId}`}
            className="text-center group min-w-0 px-3 hover:opacity-80 transition-opacity"
            title="Torna alla pagina del libro"
          >
            <p className="text-sm font-semibold text-sage-800 line-clamp-1 group-hover:text-sage-600 group-hover:underline underline-offset-2">
              {book?.title}
            </p>
            <p className="text-xs text-bark-400">Blocco {blockNumber} di {blocks.length}</p>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={() => setBlueLightFilter(!blueLightFilter)} className="p-2 text-bark-400 hover:text-sage-600">
              {blueLightFilter ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-0.5 bg-sage-50 dark:bg-sage-900/40 rounded-lg p-0.5">
              {(['small','medium','large'] as const).map(sz => (
                <button
                  key={sz}
                  onClick={() => setTextSize(sz)}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                    textSize === sz
                      ? 'bg-sage-600 text-white'
                      : 'text-bark-500 hover:text-sage-700'
                  }`}
                  aria-label={`Testo ${sz}`}
                  title={sz === 'small' ? 'Piccolo' : sz === 'medium' ? 'Medio' : 'Grande'}
                >
                  {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-sage-100">
          <div
            className="h-full bg-sage-500 transition-all"
            style={{ width: `${(blockNumber / blocks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {isLocked ? (
          <div className="text-center py-16 animate-fade-in">
            {/* Citation paywall preview */}
            {deepLinkHighlight && highlights.find(h => h.id === deepLinkHighlight) && (
              <div className="mb-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl max-w-lg mx-auto">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wide mb-2">Ti ha colpito questa frase?</p>
                <blockquote className="font-serif text-lg italic text-bark-800 dark:text-sage-200 leading-relaxed">
                  &ldquo;{highlights.find(h => h.id === deepLinkHighlight)?.content}&rdquo;
                </blockquote>
                <p className="text-xs text-bark-500 dark:text-sage-500 mt-3">
                  Sblocca il blocco per leggere il contesto completo.
                </p>
              </div>
            )}
            <div className="w-20 h-20 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-sage-400" />
            </div>

            {!block?.is_released && !(block?.scheduled_date && new Date(block.scheduled_date) <= new Date()) ? (
              <>
                <h2 className="text-xl font-bold text-sage-900 mb-2">Blocco non ancora disponibile</h2>
                <p className="text-bark-500 mb-2">
                  Questo blocco sar&agrave; disponibile il{' '}
                  {block?.scheduled_date
                    ? new Date(block.scheduled_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'presto'}
                </p>
              </>
            ) : !user ? (
              <>
                <h2 className="text-xl font-bold text-sage-900 mb-2">Accedi per continuare</h2>
                <p className="text-bark-500 mb-6">Crea un account gratuito per leggere questo blocco</p>
                <Link href="/signup" className="px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600">
                  Registrati gratis
                </Link>
              </>
            ) : planExpired ? (
              <>
                <h2 className="text-xl font-bold text-sage-900 mb-2">Abbonamento scaduto</h2>
                <p className="text-bark-500 mb-2">
                  Hai aggiunto questo libro con il tuo abbonamento, ma il piano è scaduto.
                </p>
                <p className="text-sm text-bark-400 mb-6">
                  Riabbonati per continuare a leggere, oppure acquista il libro con i token per accesso permanente.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/impostazioni"
                    className="px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 text-center"
                  >
                    Riabbonati
                  </Link>
                  <button
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="px-6 py-3 bg-white dark:bg-[#1e221c] border border-sage-300 dark:border-sage-700 text-sage-700 dark:text-sage-300 rounded-xl font-medium hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors flex items-center gap-2 justify-center"
                  >
                    <Coins className="w-4 h-4" />
                    Acquista per {block?.token_price || book?.token_price_per_block || 5} token
                  </button>
                </div>
              </>
            ) : isOpenBook ? (
              <>
                <h2 className="text-xl font-bold text-sage-900 mb-2">Continua a leggere</h2>
                <p className="text-bark-500 mb-2">
                  Questo libro è <strong>gratuito per tutti</strong>.
                </p>
                <p className="text-sm text-bark-400 mb-6">
                  Sblocca il blocco {blockNumber} senza spendere token.
                </p>
                <button
                  onClick={handleFreeUnlock}
                  disabled={unlocking}
                  className="px-8 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                >
                  {unlocking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Sblocca gratuitamente
                </button>
                {book?.author_id && user?.id !== book.author_id && (
                  <p className="text-xs text-bark-400 mt-4">
                    Vuoi supportare l&apos;autore? Potrai farlo dopo aver letto.
                  </p>
                )}
              </>
            ) : (
              (() => {
                // ── Upsell integrato stile Kindle: copertina sfocata + 2 CTA chiare
                const bookTier = (book?.tier || 'silver') as 'silver' | 'gold' | 'free'
                const isGoldBook = bookTier === 'gold' || book?.access_level === 'gold_exclusive'
                const price = block?.token_price || book?.token_price_per_block || 5
                const insufficientTokens = totalTokens < price
                const planPrice = isGoldBook ? '9,99€' : '4,99€'
                const planLabel = isGoldBook ? 'Gold' : 'Silver'
                const planBenefits = isGoldBook
                  ? [
                      'Libri illimitati ogni mese',
                      'Anteprima fino a 7 giorni prima',
                      '−25% sui token acquistati',
                      'Accesso a tutti i titoli esclusivi Gold',
                    ]
                  : [
                      '3 libri al mese inclusi',
                      'Anteprima 24h prima del rilascio',
                      '−15% sui token acquistati',
                      'Accesso a tutto il catalogo Silver',
                    ]

                return (
                  <div className="relative -mx-4 -my-8 min-h-[calc(100vh-120px)] overflow-hidden rounded-none animate-fade-in">
                    {/* Background: copertina sfocata */}
                    {book?.cover_image_url ? (
                      <div
                        aria-hidden
                        className="absolute inset-0 -z-10"
                        style={{
                          backgroundImage: `url(${book.cover_image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'blur(38px) saturate(1.1)',
                          transform: 'scale(1.15)',
                        }}
                      />
                    ) : (
                      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-sage-200 to-amber-200 dark:from-sage-900 dark:to-bark-900" />
                    )}
                    {/* Overlay per leggibilità */}
                    <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-cream-50/70 via-cream-50/85 to-cream-50/95 dark:from-[#161a14]/75 dark:via-[#161a14]/88 dark:to-[#161a14]/96" />

                    <div className="relative max-w-lg mx-auto px-5 pt-10 pb-12 text-center">
                      {/* Copertina piccola */}
                      {book?.cover_image_url && (
                        <img
                          src={book.cover_image_url}
                          alt=""
                          className="w-28 h-40 mx-auto rounded-xl shadow-2xl object-cover mb-5"
                        />
                      )}

                      <h2 className="text-2xl sm:text-3xl font-bold text-sage-900 dark:text-sage-100 mb-2 leading-tight">
                        Continua a leggere questo libro
                      </h2>
                      <p className="text-sm text-bark-500 dark:text-sage-400 mb-8">
                        Hai letto il primo capitolo. Scegli come andare avanti.
                      </p>

                      {/* Opzione 1 — Abbonamento */}
                      <Link
                        href="/impostazioni"
                        className={`block text-left p-5 rounded-2xl border-2 mb-3 transition-all hover:shadow-lg ${
                          isGoldBook
                            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 border-amber-300 dark:border-amber-700/60 hover:border-amber-400'
                            : 'bg-gradient-to-br from-slate-50 to-sage-50 dark:from-slate-900/40 dark:to-sage-900/20 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isGoldBook ? 'bg-amber-500' : 'bg-slate-500'
                            }`}>
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-bark-600 dark:text-sage-300">Consigliato</span>
                          </div>
                          <span className={`text-lg font-black ${
                            isGoldBook ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {planPrice}<span className="text-xs font-medium text-bark-400">/mese</span>
                          </span>
                        </div>
                        <p className="font-bold text-sage-900 dark:text-sage-100 text-base mb-2">
                          Abbonati a {planLabel}
                        </p>
                        <ul className="space-y-1">
                          {planBenefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-bark-600 dark:text-sage-400">
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                isGoldBook ? 'text-amber-500' : 'text-slate-500'
                              }`} />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </Link>

                      {/* Opzione 2 — Acquista singolo blocco */}
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking || insufficientTokens}
                        className="w-full text-left p-5 rounded-2xl border-2 border-sage-200 dark:border-sage-700 bg-white/80 dark:bg-[#1e221c]/80 backdrop-blur-sm hover:border-sage-400 transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-sage-500 flex items-center justify-center">
                              {unlocking ? (
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              ) : (
                                <Coins className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-bark-500 dark:text-sage-400">Una tantum</span>
                          </div>
                          <span className="text-lg font-black text-sage-700 dark:text-sage-200">
                            {price}<span className="text-xs font-medium text-bark-400"> tk</span>
                          </span>
                        </div>
                        <p className="font-bold text-sage-900 dark:text-sage-100 text-base">
                          Acquista questo blocco
                        </p>
                        <p className="text-xs text-bark-500 dark:text-sage-500 mt-1">
                          Hai {totalTokens} token disponibili
                        </p>
                      </button>

                      {insufficientTokens && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-left mb-4">
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            Ti mancano <strong>{price - totalTokens} token</strong>.{' '}
                            <Link href="/wallet" className="font-semibold underline">Ricarica il wallet</Link>.
                          </p>
                        </div>
                      )}

                      <Link
                        href="/cammino-lettore"
                        className="inline-block text-xs font-medium text-bark-500 dark:text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 underline underline-offset-2"
                      >
                        Scopri tutti i piani
                      </Link>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        ) : (
          <>
            {/* Block title */}
            {block?.title && (
              <h2 className="text-xl font-bold text-sage-900 mb-6 text-center">{block.title}</h2>
            )}

            {/* Reading content — paginazione orizzontale stile Kindle */}
            {(() => {
              const fullText = block?.content || ''
              // Segmenta il testo full applicando gli highlights
              const parts: { text: string; isHighlight: boolean; id?: string }[] = []
              if (highlights.length === 0) {
                parts.push({ text: fullText, isHighlight: false })
              } else {
                let remaining = fullText
                const sortedHls = [...highlights].sort((a, b) => b.content.length - a.content.length)
                while (remaining.length > 0) {
                  let earliestIdx = -1
                  let earliestHl: any = null
                  for (const hl of sortedHls) {
                    const idx = remaining.indexOf(hl.content)
                    if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
                      earliestIdx = idx
                      earliestHl = hl
                    }
                  }
                  if (earliestIdx === -1) {
                    parts.push({ text: remaining, isHighlight: false })
                    break
                  }
                  if (earliestIdx > 0) {
                    parts.push({ text: remaining.slice(0, earliestIdx), isHighlight: false })
                  }
                  parts.push({ text: earliestHl.content, isHighlight: true, id: earliestHl.id })
                  remaining = remaining.slice(earliestIdx + earliestHl.content.length)
                }
              }

              return (
                <div
                  ref={pagerRef}
                  id="reading-content"
                  onMouseUp={handleTextSelect}
                  onTouchEnd={handleTextSelect}
                  className="reading-text text-bark-700 dark:text-sage-200 whitespace-pre-wrap select-text mb-8 animate-fade-in"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {parts.map((p, j) =>
                    p.isHighlight ? (
                      <mark
                        key={j}
                        data-highlight-id={p.id}
                        className={`${macroArea?.color?.bgLight || 'bg-yellow-100'} ${macroArea?.color?.textLight || 'text-bark-800'} rounded px-0.5`}
                      >
                        {p.text}
                      </mark>
                    ) : (
                      <span key={j}>{p.text}</span>
                    )
                  )}
                </div>
              )
            })()}

            {/* Selection popover */}
            {selectionPopover && (
              <div
                className="fixed z-50 -translate-x-1/2 -translate-y-full bg-sage-900 dark:bg-sage-100 text-white dark:text-sage-900 rounded-xl shadow-xl flex items-center gap-1 p-1 animate-fade-in"
                style={{ left: selectionPopover.x, top: selectionPopover.y }}
              >
                <button
                  onClick={() => saveHighlight('private')}
                  disabled={savingHighlight}
                  className="flex items-center gap-1 px-3 py-2 hover:bg-sage-800 dark:hover:bg-sage-200 rounded-lg text-xs font-medium"
                  title="Sottolinea (privato)"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  Sottolinea
                </button>
                <button
                  onClick={() => saveHighlight('private')}
                  disabled={savingHighlight}
                  className="flex items-center gap-1 px-3 py-2 hover:bg-sage-800 dark:hover:bg-sage-200 rounded-lg text-xs font-medium"
                  title="Salva nella libreria"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salva
                </button>
                <button
                  onClick={() => saveHighlight('public')}
                  disabled={savingHighlight}
                  className="flex items-center gap-1 px-3 py-2 hover:bg-sage-800 dark:hover:bg-sage-200 rounded-lg text-xs font-medium"
                  title="Pubblica come citazione"
                >
                  <Share className="w-3.5 h-3.5" />
                  Pubblica
                </button>
                <button
                  onClick={() => { setSelectionPopover(null); window.getSelection()?.removeAllRanges() }}
                  className="px-2 py-2 hover:bg-sage-800 dark:hover:bg-sage-200 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center justify-center gap-4 py-6 border-t border-b border-sage-100">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors ${
                  liked ? 'bg-red-50 text-red-500' : 'bg-sage-50 text-bark-500 hover:bg-sage-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                {liked ? 'Piace' : 'Mi piace'}
              </button>
              <button
                onClick={toggleSave}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors ${
                  saved ? 'bg-sage-100 text-sage-700' : 'bg-sage-50 text-bark-500 hover:bg-sage-100'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                {saved ? 'Salvato' : 'Salva'}
              </button>
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-sage-50 text-bark-500 hover:bg-sage-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {comments.length}
              </button>
              <button
                onClick={handleBoost}
                disabled={!canBoost || boosting}
                title={canBoost ? 'Spendi 10 token per dare visibilita al libro' : `Hai gia boostato. Riprova tra ${hoursUntilBoost ?? 24}h`}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all ${
                  canBoost && !boosting
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 hover:from-amber-200 hover:to-yellow-200 border border-amber-300 shadow-sm'
                    : 'bg-sage-50 text-bark-400 cursor-not-allowed border border-transparent'
                }`}
              >
                {boosting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className={`w-4 h-4 ${canBoost ? 'fill-amber-300 text-amber-600' : ''}`} />
                )}
                {canBoost ? 'Boost 10tk' : `${hoursUntilBoost ?? 24}h`}
              </button>
            </div>

            {/* Completion feedback */}
            {showCompletion && completionData && (
              <div className="my-6 p-5 bg-gradient-to-r from-sage-50 to-green-50 border border-sage-200 rounded-2xl animate-fade-in">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-bold text-sage-900">Blocco completato!</h3>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1e221c] rounded-full border border-sage-200 dark:border-sage-700">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-sage-800">+{completionData.xpEarned} XP</span>
                  </div>
                  {completionData.isNewStreak && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-bold text-orange-600">
                        {completionData.streak} giorni consecutivi!
                      </span>
                    </div>
                  )}
                  {completionData.streakBonus > 0 && (
                    <div className="text-xs text-sage-600 font-medium">
                      +{completionData.streakBonus} XP bonus streak
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowCompletion(false)}
                  className="block mx-auto mt-3 text-xs text-bark-400 hover:text-bark-600"
                >
                  Chiudi
                </button>
              </div>
            )}

            {/* Navigation blocchi a fine contenuto */}
            <div className="flex items-center justify-between py-8">
              {blockNumber > 1 ? (
                <Link
                  href={`/reader/${bookId}/${blockNumber - 1}`}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-sage-600 hover:bg-sage-50 rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Blocco precedente
                </Link>
              ) : <div />}

              {blockNumber < blocks.length ? (
                <Link
                  href={`/reader/${bookId}/${blockNumber + 1}`}
                  onClick={handleNextBlock}
                  className="flex items-center gap-2 px-6 py-3 text-sm bg-sage-500 text-white rounded-xl hover:bg-sage-600 font-medium shadow-sm hover:shadow-md transition-all"
                >
                  Prossimo blocco
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-sage-600 font-medium">Hai letto tutti i blocchi disponibili!</p>
                  <button
                    onClick={() => setShowFinalReview(true)}
                    className="mt-2 inline-block px-4 py-2 rounded-xl text-sm font-semibold bg-sage-500 text-white hover:bg-sage-600"
                  >
                    Lascia la tua recensione
                  </button>
                  <Link
                    href={`/libro/${bookId}`}
                    className="text-xs text-sage-500 hover:text-sage-700 mt-2 block"
                  >
                    Torna alla pagina del libro
                  </Link>
                </div>
              )}
            </div>

            {/* Widget recensione leggero fine blocco */}
            {!isLocked && user && (
              <div className="flex justify-center -mt-4 mb-2">
                <ReviewWidget bookId={bookId} variant="inline" />
              </div>
            )}

            {/* Modale recensione fine libro */}
            <ReviewWidget
              bookId={bookId}
              variant="modal"
              open={showFinalReview}
              onClose={() => setShowFinalReview(false)}
              title="Come valuteresti questo libro?"
            />
          </>
        )}

        {/* Comments section */}
        {showComments && (
          <div className="mt-6 animate-slide-up">
            <h3 className="text-lg font-bold text-sage-900 dark:text-sage-100 mb-4">Commenti ({comments.length})</h3>

            {user && (
              <div className="flex items-start gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center text-xs font-bold text-sage-700">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  {replyingTo && (
                    <div className="flex items-center gap-2 mb-1 text-xs text-sage-600 dark:text-sage-400">
                      <span>Rispondendo a <strong>@{replyingTo.authorName}</strong></span>
                      <button onClick={() => setReplyingTo(null)} className="text-bark-400 hover:text-red-500">✕</button>
                    </div>
                  )}
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? `Rispondi a @${replyingTo.authorName}...` : 'Scrivi un commento... (usa @username per menzionare)'}
                    rows={2}
                    className="w-full px-3 py-2 border border-sage-200 dark:border-sage-700 rounded-xl text-sm focus:border-sage-400 outline-none resize-none bg-white dark:bg-[#1e221c] text-bark-700 dark:text-sage-200"
                  />
                  {/* Firma premium animata per il proprio commento (1 token) */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-bark-400 dark:text-sage-500">
                      Firma premium <span className="text-amber-600 font-medium">(1 tk)</span>:
                    </span>
                    {PREMIUM_SIGNATURE_TYPES.map((r) => (
                      <button
                        key={r.type}
                        type="button"
                        onClick={() => setSelectedPremiumReaction(selectedPremiumReaction === r.type ? null : r.type)}
                        title={`${r.label} — firma animata, spende 1 token, +5 XP`}
                        className={`text-lg transition-all hover:scale-125 ${
                          selectedPremiumReaction === r.type
                            ? 'scale-125 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse-slow'
                            : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        {r.emoji}
                      </button>
                    ))}
                    {selectedPremiumReaction && (
                      <button
                        type="button"
                        onClick={() => setSelectedPremiumReaction(null)}
                        className="text-[10px] text-bark-400 hover:text-red-500 underline"
                      >
                        rimuovi
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleComment}
                    disabled={!newComment.trim()}
                    className="mt-2 flex items-center gap-1 px-4 py-1.5 text-sm bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Pubblica
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {/* Root comments */}
              {comments.filter(c => !c.parent_comment_id).map((comment) => {
                const replies = comments.filter(c => c.parent_comment_id === comment.id)
                const commentAuthorName = comment.user?.username || comment.user?.name || 'anonimo'

                return (
                  <div key={comment.id}>
                    <div className="flex items-start gap-3 py-3">
                      <Link href={comment.user?.username ? `/profile/${comment.user.username}` : '#'}>
                        {comment.user?.avatar_url ? (
                          <img src={comment.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-sage-100 dark:bg-sage-800 flex items-center justify-center text-xs font-bold text-sage-600 dark:text-sage-400">
                            {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={comment.user?.username ? `/profile/${comment.user.username}` : '#'} className="text-sm font-medium text-sage-800 dark:text-sage-200 hover:underline">
                            {comment.user?.author_pseudonym || comment.user?.name || 'Anonimo'}
                          </Link>
                          <LevelBadge totalXp={comment.user?.total_xp} size="xs" />
                          {comment.is_author_reply && (
                            <span className="text-xs bg-sage-100 dark:bg-sage-800 text-sage-600 dark:text-sage-400 px-1.5 py-0.5 rounded">Autore</span>
                          )}
                          {ownerReactions[comment.id] && (
                            <span
                              title="Firma premium animata dell'autore del commento"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 border border-amber-400 shadow-sm animate-pulse-slow"
                            >
                              <span className="text-sm leading-none">
                                {REACTION_EMOJIS[ownerReactions[comment.id]]}
                              </span>
                            </span>
                          )}
                          <span className="text-xs text-bark-400 dark:text-sage-500">
                            {new Date(comment.created_at).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        <p className="text-sm text-bark-600 dark:text-sage-400 mt-1">
                          {comment.content.split(/(@\w+)/g).map((part: string, i: number) =>
                            part.startsWith('@') ? (
                              <Link key={i} href={`/profile/${part.slice(1)}`} className="text-sage-600 dark:text-sage-300 font-medium hover:underline">{part}</Link>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {user && (
                            <button
                              onClick={() => {
                                setReplyingTo({ id: comment.id, authorName: commentAuthorName })
                                setNewComment(`@${commentAuthorName} `)
                              }}
                              className="text-xs text-bark-400 dark:text-sage-500 hover:text-sage-600"
                            >
                              Rispondi
                            </button>
                          )}
                          {user && comment.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-bark-400 dark:text-sage-500 hover:text-red-500"
                              title="Elimina commento"
                            >
                              Elimina
                            </button>
                          )}
                          <ReactionBar
                            commentId={comment.id}
                            reactions={commentReactions[comment.id] || []}
                            onReact={handleReact}
                            disabled={!user || reactingTo !== null}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-11 border-l-2 border-sage-100 dark:border-sage-800 pl-4 space-y-1">
                        {replies.map(reply => {
                          const replyAuthorName = reply.user?.username || reply.user?.name || 'anonimo'
                          return (
                            <div key={reply.id} className="flex items-start gap-3 py-2">
                              <Link href={reply.user?.username ? `/profile/${reply.user.username}` : '#'}>
                                {reply.user?.avatar_url ? (
                                  <img src={reply.user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-sage-100 dark:bg-sage-800 flex items-center justify-center text-[10px] font-bold text-sage-600 dark:text-sage-400">
                                    {reply.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </Link>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link href={reply.user?.username ? `/profile/${reply.user.username}` : '#'} className="text-xs font-medium text-sage-800 dark:text-sage-200 hover:underline">
                                    {reply.user?.author_pseudonym || reply.user?.name || 'Anonimo'}
                                  </Link>
                                  <LevelBadge totalXp={reply.user?.total_xp} size="xs" />
                                  {reply.is_author_reply && (
                                    <span className="text-[10px] bg-sage-100 dark:bg-sage-800 text-sage-600 px-1 py-0.5 rounded">Autore</span>
                                  )}
                                  {ownerReactions[reply.id] && (
                                    <span
                                      title="Firma premium animata dell'autore del commento"
                                      className="inline-flex items-center px-1 py-0.5 rounded-full bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 border border-amber-400 shadow-sm animate-pulse-slow"
                                    >
                                      <span className="text-xs leading-none">
                                        {REACTION_EMOJIS[ownerReactions[reply.id]]}
                                      </span>
                                    </span>
                                  )}
                                  <span className="text-[10px] text-bark-400">
                                    {new Date(reply.created_at).toLocaleDateString('it-IT')}
                                  </span>
                                </div>
                                <p className="text-xs text-bark-600 dark:text-sage-400 mt-0.5">
                                  {reply.content.split(/(@\w+)/g).map((part: string, i: number) =>
                                    part.startsWith('@') ? (
                                      <Link key={i} href={`/profile/${part.slice(1)}`} className="text-sage-600 dark:text-sage-300 font-medium hover:underline">{part}</Link>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {user && (
                                    <button
                                      onClick={() => {
                                        setReplyingTo({ id: comment.id, authorName: replyAuthorName })
                                        setNewComment(`@${replyAuthorName} `)
                                      }}
                                      className="text-[10px] text-bark-400 hover:text-sage-600"
                                    >
                                      Rispondi
                                    </button>
                                  )}
                                  {user && reply.user_id === user.id && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-[10px] text-bark-400 hover:text-red-500"
                                      title="Elimina commento"
                                    >
                                      Elimina
                                    </button>
                                  )}
                                  <ReactionBar
                                    commentId={reply.id}
                                    reactions={commentReactions[reply.id] || []}
                                    onReact={handleReact}
                                    disabled={!user || reactingTo !== null}
                                    compact
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {comments.length === 0 && (
                <p className="text-center text-sm text-bark-400 dark:text-sage-500 py-8">Nessun commento ancora. Sii il primo!</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tip Prompt (open books only, before next block) */}
      {showTipPrompt && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setShowTipPrompt(false)}
        >
          <div
            className="bg-white dark:bg-[#1e221c] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3">
                <Coins className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-sage-900 dark:text-sage-100">
                Ti sta piacendo?
              </h3>
              <p className="text-sm text-bark-500 dark:text-sage-400 mt-1">
                Questo libro è gratuito. Sostieni l&apos;autore con una mancia (opzionale).
              </p>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {[1, 5, 10, 20].map((val) => (
                <button
                  key={val}
                  onClick={() => setTipAmount(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    tipAmount === val
                      ? 'bg-amber-500 text-white'
                      : 'bg-sage-50 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-sage-100'
                  }`}
                >
                  {val} tk
                </button>
              ))}
            </div>

            <div className="text-center text-xs text-bark-400 dark:text-sage-500 mb-4">
              Hai <strong>{totalTokens}</strong> token disponibili
            </div>

            <button
              onClick={handleSendTip}
              disabled={sendingTip || tipAmount > totalTokens}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-2"
            >
              {sendingTip ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
              Invia {tipAmount} token e continua
            </button>

            <button
              onClick={() => handleSkipTip(false)}
              className="w-full py-2 text-sm text-bark-500 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-200 font-medium"
            >
              Non ora, continua a leggere
            </button>
            <button
              onClick={() => handleSkipTip(true)}
              className="w-full py-1 text-xs text-bark-300 dark:text-sage-600 hover:text-bark-500"
            >
              Non chiedermelo più per questo libro
            </button>
          </div>
        </div>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCelebration(null)}
        >
          <div className="relative text-center p-10 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            {/* Animated particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'][i % 5],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random() * 2}s`,
                    opacity: 0.6 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>

            <div className="relative bg-white dark:bg-[#1e221c] rounded-3xl p-8 shadow-2xl border border-sage-100 dark:border-sage-800">
              <div className="text-6xl mb-4 animate-bounce">{showCelebration.emoji}</div>
              <h2 className="text-xl font-bold text-sage-900 dark:text-sage-100 mb-2">{showCelebration.title}</h2>
              <p className="text-sm text-bark-500 dark:text-sage-400 mb-6">{showCelebration.subtitle}</p>
              <button
                onClick={() => setShowCelebration(null)}
                className="px-6 py-2.5 bg-sage-500 text-white rounded-xl text-sm font-medium hover:bg-sage-600 transition-colors"
              >
                Continua a leggere
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {levelUpResult && (
        <LevelUpModal
          result={levelUpResult}
          onClose={() => { setLevelUpResult(null); refreshProfile?.() }}
        />
      )}
    </div>
  )
}
