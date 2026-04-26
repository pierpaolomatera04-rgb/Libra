'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { createNotification } from '@/lib/notifications'
import {
  BookOpen, Heart, Clock, Layers, ArrowLeft, Play,
  Coins, Users, Eye, Calendar, Loader2, Shield, Bookmark,
  Lock, LockOpen, Zap, Sparkles, MessageCircle, Star, Check
} from 'lucide-react'
import { getGenreTagColor } from '@/lib/genres'
import { awardXp } from '@/lib/xp'
import { XP_VALUES } from '@/lib/badges'
import CompactReviewBar from '@/components/reviews/CompactReviewBar'

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [book, setBook] = useState<any>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Flag specifico per bozza non accessibile (gli utenti non-autore ricevono 404)
  const [notPublished, setNotPublished] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [readBlocks, setReadBlocks] = useState<Set<string>>(new Set())
  const [unlockedBlocks, setUnlockedBlocks] = useState<Set<string>>(new Set())
  const [blockStats, setBlockStats] = useState<Record<string, { readers: number; comments: number; avgRating: number }>>({})
  const [boosting, setBoosting] = useState(false)
  const [canBoost, setCanBoost] = useState(true)
  const [hoursUntilBoost, setHoursUntilBoost] = useState<number | null>(null)

  useEffect(() => {
    const fetchBook = async () => {
      const { data: bookData } = await supabase
        .from('books')
        .select('*, author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url, author_bio)')
        .eq('id', bookId)
        .single()

      if (!bookData) {
        router.push('/browse')
        return
      }

      // ── Draft protection: se il libro è in bozza, l'accesso è consentito
      //    SOLO all'autore stesso. Altrimenti mostriamo un 404 grafico.
      if (bookData.status === 'draft' && bookData.author_id !== user?.id) {
        setNotPublished(true)
        setLoading(false)
        return
      }

      setBook(bookData)
      setLikeCount(bookData.total_likes || 0)

      // Fetch blocks metadata
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('id, block_number, title, character_count, word_count, is_released, scheduled_date, is_extra, token_price')
        .eq('book_id', bookId)
        .order('block_number')

      setBlocks(blocksData || [])

      // Statistiche per blocco (lettori unici · commenti · voto medio)
      const blockIds = (blocksData || []).map((b: any) => b.id)
      if (blockIds.length > 0) {
        const [readsRes, commentsRes, ratingsRes] = await Promise.all([
          supabase.from('block_reads').select('block_id, user_id').in('block_id', blockIds),
          supabase.from('comments').select('block_id').in('block_id', blockIds),
          supabase.from('block_ratings').select('block_id, stars').in('block_id', blockIds),
        ])

        const stats: Record<string, { readers: number; comments: number; avgRating: number }> = {}
        const uniqReaders: Record<string, Set<string>> = {}
        ;(readsRes.data || []).forEach((r: any) => {
          if (!uniqReaders[r.block_id]) uniqReaders[r.block_id] = new Set()
          uniqReaders[r.block_id].add(r.user_id)
        })
        const commentCounts: Record<string, number> = {}
        ;(commentsRes.data || []).forEach((c: any) => {
          commentCounts[c.block_id] = (commentCounts[c.block_id] || 0) + 1
        })
        const ratingsAgg: Record<string, { sum: number; n: number }> = {}
        ;(ratingsRes.data || []).forEach((r: any) => {
          if (!ratingsAgg[r.block_id]) ratingsAgg[r.block_id] = { sum: 0, n: 0 }
          ratingsAgg[r.block_id].sum += Number(r.stars)
          ratingsAgg[r.block_id].n += 1
        })
        blockIds.forEach((id: string) => {
          const agg = ratingsAgg[id]
          stats[id] = {
            readers: uniqReaders[id]?.size || 0,
            comments: commentCounts[id] || 0,
            avgRating: agg && agg.n > 0 ? agg.sum / agg.n : 0,
          }
        })
        setBlockStats(stats)
      }

      // Check if user liked
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('book_id', bookId)
          .eq('user_id', user.id)
          .single()
        setLiked(!!likeData)

        // Check if user saved
        const { data: saveData } = await supabase
          .from('user_library')
          .select('id')
          .eq('book_id', bookId)
          .eq('user_id', user.id)
          .single()
        setSaved(!!saveData)

        // Fetch reading progress
        const { data: progressData } = await supabase
          .from('reading_progress')
          .select('block_id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
        if (progressData) {
          setReadBlocks(new Set(progressData.map((p: any) => p.block_id)))
        }

        // Fetch block unlocks (blocchi gia acquistati / sbloccati)
        const { data: unlocksData } = await supabase
          .from('block_unlocks')
          .select('block_id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
        if (unlocksData) {
          setUnlockedBlocks(new Set(unlocksData.map((u: any) => u.block_id)))
        }

        // Verifica se l'utente ha gia boostato negli ultimi 24h
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

      setLoading(false)
    }

    fetchBook()
  }, [bookId, user])

  // Refetch unlocks/reads quando l'utente torna sulla pagina (es. dopo aver sbloccato un blocco nel reader)
  useEffect(() => {
    if (!user) return
    const refetchProgress = async () => {
      const [{ data: progressData }, { data: unlocksData }] = await Promise.all([
        supabase.from('reading_progress').select('block_id').eq('user_id', user.id).eq('book_id', bookId),
        supabase.from('block_unlocks').select('block_id').eq('user_id', user.id).eq('book_id', bookId),
      ])
      if (progressData) setReadBlocks(new Set(progressData.map((p: any) => p.block_id)))
      if (unlocksData) setUnlockedBlocks(new Set(unlocksData.map((u: any) => u.block_id)))
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetchProgress()
    }
    window.addEventListener('focus', refetchProgress)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refetchProgress)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [bookId, user, supabase])

  const handleLike = async () => {
    if (!user) return router.push('/login')

    if (liked) {
      await supabase.from('likes').delete().eq('book_id', bookId).eq('user_id', user.id)
      setLiked(false)
      setLikeCount(prev => prev - 1)
    } else {
      await supabase.from('likes').insert({ book_id: bookId, user_id: user.id })
      setLiked(true)
      setLikeCount(prev => prev + 1)

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
  }

  const handleBoost = async () => {
    if (!user) return router.push('/login')
    if (!canBoost || boosting) return

    setBoosting(true)
    try {
      const { data, error } = await (supabase.rpc as any)('boost_book', {
        p_user_id: user.id,
        p_book_id: bookId,
      })
      if (error) {
        toast.error('Errore boost', { description: error.message })
        return
      }
      if (!data?.success) {
        toast.error('Boost non riuscito', { description: data?.error || 'Errore sconosciuto' })
        return
      }
      toast.success('Boost attivato!', {
        description: `+${data.visibility_added} visibilita per "${book.title}"`,
      })
      setCanBoost(false)
      setHoursUntilBoost(24)
      // +10 XP per boost
      awardXp(supabase, user.id, XP_VALUES.BOOST, 'boost', true)
      // Notifica all'autore
      if (book?.author_id) {
        const actorName = profile?.author_pseudonym || profile?.name || 'Un lettore'
        createNotification({
          supabase,
          recipientId: book.author_id,
          actorId: user.id,
          actorName,
          type: 'like',
          title: 'Boost ricevuto',
          message: `${actorName} ha boostato "${book.title}" (+10 visibilita)`,
          data: { book_id: bookId, book_title: book.title },
        })
      }
    } catch (e: any) {
      toast.error('Errore boost', { description: e?.message || 'Riprova' })
    } finally {
      setBoosting(false)
    }
  }

  const handleSave = async () => {
    if (!user) return router.push('/login')

    if (saved) {
      await supabase.from('user_library').delete().eq('book_id', bookId).eq('user_id', user.id)
      setSaved(false)
      toast.success('Libro rimosso dalla libreria')
    } else {
      await supabase.from('user_library').insert({
        user_id: user.id,
        book_id: bookId,
        status: 'saved',
      })
      setSaved(true)
      toast.success('Libro aggiunto alla tua libreria')

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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  // Libro in bozza non ancora pubblicato (visualizzato come 404 elegante)
  if (notPublished) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-sage-100 dark:bg-sage-800 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-sage-400" />
        </div>
        <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100 mb-3">
          Questo libro non è ancora stato pubblicato
        </h1>
        <p className="text-bark-500 dark:text-sage-400 mb-8">
          L&apos;autore sta ancora preparando questa opera. Torna presto a sfogliare il catalogo!
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna al catalogo
        </Link>
      </div>
    )
  }

  if (!book) return null

  const authorName = book.author?.author_pseudonym || book.author?.name || 'Autore'
  const totalWords = blocks.reduce((sum: number, b: any) => sum + (b.word_count || 0), 0)
  const readingTimeMin = Math.ceil(totalWords / 200)
  const now = new Date()
  const isBlockAvailable = (b: any) => b.is_released || (b.scheduled_date && new Date(b.scheduled_date) <= now)
  const releasedBlocks = blocks.filter((b: any) => isBlockAvailable(b)).length
  const isOpenBook = book.access_level === 'open' || book.tier === 'free'
  // Un blocco e' "sbloccato" se: e' il primo (gratuito), il libro e' open/free, o l'utente lo ha acquistato
  const isBlockUnlocked = (b: any) =>
    (b.block_number === 1 && book.first_block_free !== false) ||
    isOpenBook ||
    unlockedBlocks.has(b.id)

  const accessLabel = book.access_level === 'gold_exclusive'
    ? 'Solo Gold'
    : book.access_level === 'silver_choice'
      ? 'Silver e Gold'
      : 'Tutti'

  const accessColor = book.access_level === 'gold_exclusive'
    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : book.access_level === 'silver_choice'
      ? 'bg-gray-100 text-gray-700 border-gray-300'
      : 'bg-sage-100 text-sage-700 border-sage-300'

  const statusLabel = book.status === 'ongoing' ? 'In corso' : book.status === 'completed' ? 'Completato' : book.status

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-bark-500 hover:text-sage-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna indietro
      </button>

      {/* Hero section */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              className="w-48 h-64 md:w-56 md:h-80 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-48 h-64 md:w-56 md:h-80 rounded-2xl bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center shadow-lg">
              <BookOpen className="w-16 h-16 text-sage-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${accessColor}`}>
              <Shield className="w-3 h-3 inline mr-1" />
              {accessLabel}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sage-50 text-sage-700 border border-sage-200">
              {statusLabel}
            </span>
            {book.genre && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getGenreTagColor(book.genre)}`}>
                {book.genre}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-sage-900 mb-2">{book.title}</h1>

          {/* Author */}
          <Link
            href={book.author?.username ? `/profile/${book.author.username}` : `/autore/${book.author?.id}`}
            className="flex items-center gap-3 mb-5 group"
          >
            {book.author?.avatar_url ? (
              <img src={book.author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sage-300 flex items-center justify-center text-white font-bold">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-sage-800 group-hover:text-sage-600 transition-colors">{authorName}</p>
              <p className="text-xs text-bark-400">Autore</p>
            </div>
          </Link>

          {/* Stats compatte: una riga sola, niente like (sono nel bottone azione) */}
          <div className="flex items-center gap-2 mb-6 text-xs text-bark-400 dark:text-sage-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {book.total_blocks} {book.total_blocks === 1 ? 'blocco' : 'blocchi'}
            </span>
            <span className="text-bark-300 dark:text-sage-600">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{readingTimeMin} min
            </span>
            <span className="text-bark-300 dark:text-sage-600">·</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {book.total_reads || 0} {(book.total_reads || 0) === 1 ? 'lettura' : 'letture'}
            </span>
          </div>

          {/* Progress bar lettura */}
          {user && readBlocks.size > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-sage-700">Il tuo avanzamento</span>
                <span className="text-xs text-bark-400">
                  {readBlocks.size}/{book.total_blocks} blocchi letti — {book.total_blocks > 0 ? Math.round((readBlocks.size / book.total_blocks) * 100) : 0}%
                </span>
              </div>
              <div className="h-2.5 bg-sage-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sage-400 to-sage-600 rounded-full transition-all duration-500"
                  style={{ width: `${book.total_blocks > 0 ? (readBlocks.size / book.total_blocks) * 100 : 0}%` }}
                />
              </div>
              {readBlocks.size === releasedBlocks && releasedBlocks > 0 && (
                <p className="text-xs text-sage-600 font-medium mt-1">Hai letto tutti i blocchi disponibili!</p>
              )}
            </div>
          )}

          {/* Prezzo */}
          <div className="flex items-center gap-2 mb-6 text-sm text-bark-500">
            <Coins className="w-4 h-4 text-sage-500" />
            <span>
              {book.first_block_free ? 'Primo blocco gratis • ' : ''}
              {book.token_price_per_block} token/blocco ({'\u20AC'}{(book.token_price_per_block * 0.10).toFixed(2)})
            </span>
          </div>

          {/* Action buttons — compatti 40px h, 14px font, px-3 */}
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href={`/reader/${book.id}/1`}
                className="flex items-center gap-2 h-10 px-3 bg-sage-500 text-white rounded-xl text-sm font-medium hover:bg-sage-600 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                Inizia a leggere
              </Link>
            ) : (
              <Link
                href={`/signup?redirect=${encodeURIComponent(`/reader/${book.id}/1`)}`}
                className="flex items-center gap-2 h-10 px-3 bg-sage-500 text-white rounded-xl text-sm font-medium hover:bg-sage-600 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                Registrati per leggere
              </Link>
            )}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors border ${
                liked
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white dark:bg-[#1e221c] border-sage-200 dark:border-sage-700 text-bark-500 hover:bg-sage-50 dark:hover:bg-sage-800'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              {likeCount}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors border ${
                saved
                  ? 'bg-sage-50 border-sage-300 text-sage-700'
                  : 'bg-white dark:bg-[#1e221c] border-sage-200 dark:border-sage-700 text-bark-500 hover:bg-sage-50 dark:hover:bg-sage-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-sage-500 text-sage-500' : ''}`} />
              <span className="hidden sm:inline">{saved ? 'Salvato' : 'Salva'}</span>
            </button>
            <button
              onClick={handleBoost}
              disabled={!canBoost || boosting}
              title={canBoost ? 'Spendi 10 token per dare visibilita al libro' : `Hai gia boostato. Riprova tra ${hoursUntilBoost ?? 24}h`}
              className={`flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                canBoost && !boosting
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'bg-bark-50 border-bark-200 text-bark-400 cursor-not-allowed'
              }`}
            >
              {boosting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className={`w-4 h-4 ${canBoost ? 'fill-amber-300 text-amber-600' : ''}`} />
              )}
              <span className="hidden sm:inline whitespace-nowrap">
                {canBoost ? 'Boost (10 tk)' : `Tra ${hoursUntilBoost ?? 24}h`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Recensioni — barra compatta con accordion */}
      <div className="mt-8">
        <CompactReviewBar
          bookId={bookId}
          averageRating={Number(book.average_rating) || 0}
          totalReviews={book.total_reviews || 0}
          totalBlocks={book.total_blocks || 0}
          readBlocksCount={readBlocks.size}
        />
      </div>

      {/* Trama */}
      {book.description && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-sage-900 mb-3">Trama</h2>
          <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6">
            <p className="text-sm text-bark-600 dark:text-sage-300 leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
        </div>
      )}

      {/* Blocchi */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-sage-900 mb-3">
          Blocchi ({releasedBlocks}/{book.total_blocks} pubblicati)
        </h2>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-sage-100 dark:border-neutral-700 divide-y divide-sage-50 dark:divide-neutral-700">
          {blocks.map((block: any) => {
            const wordCount = block.word_count || 0
            const readMin = Math.max(1, Math.ceil(wordCount / 225))
            const isRead = readBlocks.has(block.id)
            const available = isBlockAvailable(block)
            const unlocked = isBlockUnlocked(block)
            return (
              <div
                key={block.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isRead
                      ? 'bg-sage-500 text-white'
                      : available
                        ? 'bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-200'
                        : 'bg-bark-100 dark:bg-neutral-800 text-bark-400 dark:text-neutral-400'
                  }`}>
                    {isRead ? '✓' : block.block_number}
                  </div>

                  {/* Icona stato accesso */}
                  {available && (
                    unlocked ? (
                      <span
                        title="Blocco sbloccato"
                        aria-label="Blocco sbloccato"
                        className="flex-shrink-0 text-emerald-500 dark:text-emerald-400"
                      >
                        <LockOpen className="w-4 h-4" strokeWidth={2.2} />
                      </span>
                    ) : (
                      <span
                        title="Sblocca questo blocco per continuare la lettura"
                        aria-label="Sblocca questo blocco per continuare la lettura"
                        className="flex-shrink-0 text-amber-500 dark:text-amber-400 cursor-help"
                      >
                        <Lock className="w-4 h-4" strokeWidth={2.2} />
                      </span>
                    )
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${
                        available
                          ? 'text-sage-800 block-title'
                          : 'text-bark-400 block-title-locked'
                      }`}>
                        {available
                          ? (block.title ? `${block.block_number}. ${block.title}` : `Blocco ${block.block_number}`)
                          : `Blocco ${block.block_number}`
                        }
                      </p>
                      {block.is_extra && (
                        <span
                          title="Blocco EXTRA — non incluso negli abbonamenti, sblocco solo con token reali"
                          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Extra
                        </span>
                      )}
                      {isRead && (
                        <span
                          title="Hai gia letto questo blocco"
                          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm"
                        >
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          Letto
                        </span>
                      )}
                    </div>
                    {available ? (
                      <p className="text-xs text-bark-400 block-meta">
                        ~{readMin} min di lettura
                        {!isRead && !unlocked && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                            {block.token_price || book.token_price_per_block || 5} token
                            {block.is_extra && <span className="ml-1 text-[10px]">(reali)</span>}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-bark-400 block-meta flex items-center gap-1 block-scheduled">
                        <Calendar className="w-3 h-3" />
                        {block.scheduled_date ? (
                          <>
                            Esce il <span className="font-semibold text-amber-600 dark:text-amber-400 ml-0.5">
                              {new Date(block.scheduled_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </>
                        ) : (
                          'Data di uscita non ancora definita'
                        )}
                      </p>
                    )}

                    {/* Stats per blocco — visibili sempre, anche su blocchi bloccati */}
                    {(() => {
                      const s = blockStats[block.id]
                      if (!s) return null
                      return (
                        <div className="flex items-center gap-2 mt-1 text-[12px] text-bark-400 block-stats">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> {s.readers}
                          </span>
                          <span className="text-bark-300 block-stats-sep">·</span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" /> {s.comments}
                          </span>
                          <span className="text-bark-300 block-stats-sep">·</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{s.avgRating > 0 ? s.avgRating.toFixed(1) : '—'}</span>
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div>
                  {available ? (
                    <Link
                      // Guest Block: se l'utente non è loggato, indirizza al signup con
                      // redirect di ritorno al blocco corrente.
                      href={
                        user
                          ? `/reader/${bookId}/${block.block_number}`
                          : `/signup?redirect=${encodeURIComponent(`/reader/${bookId}/${block.block_number}`)}`
                      }
                      className={
                        isRead
                          // "Rileggi" — azione secondaria: solo testo grigio, peso normale, niente sfondo evidente
                          ? 'text-xs px-2 py-1 rounded transition-colors text-bark-400 hover:text-sage-600 hover:underline block-action-read'
                          // "Leggi" — azione principale: verde bold ben visibile in entrambe le mode
                          : 'text-xs font-bold px-3 py-1.5 rounded-lg transition-colors text-sage-600 hover:text-sage-700 hover:bg-sage-50 block-action-leggi'
                      }
                    >
                      {user ? (isRead ? 'Rileggi' : 'Leggi') : 'Registrati'}
                    </Link>
                  ) : (
                    <span className="text-xs text-bark-400 block-scheduled flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {block.scheduled_date
                        ? new Date(block.scheduled_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                        : 'In arrivo'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info autore */}
      {book.author?.author_bio && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-sage-900 mb-3">L&apos;autore</h2>
          <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              {book.author?.avatar_url ? (
                <img src={book.author.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-sage-300 flex items-center justify-center text-white font-bold text-lg">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-sage-800">{authorName}</p>
              </div>
            </div>
            <p className="text-sm text-bark-500 leading-relaxed">{book.author.author_bio}</p>
          </div>
        </div>
      )}
    </div>
  )
}
