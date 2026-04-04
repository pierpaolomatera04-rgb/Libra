'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { createNotification } from '@/lib/notifications'
import {
  ChevronLeft, ChevronRight, Heart, Bookmark, MessageCircle,
  Lock, Coins, Sun, Moon, Type, Loader2,
  ArrowLeft, Send, Flame, Sparkles, CheckCircle2
} from 'lucide-react'

export default function ReaderPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.bookId as string
  const blockNumber = parseInt(params.blockId as string)
  const { user, profile, refreshProfile, totalTokens } = useAuth()
  const supabase = createClient()

  const [book, setBook] = useState<any>(null)
  const [block, setBlock] = useState<any>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [planExpired, setPlanExpired] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [blueLightFilter, setBlueLightFilter] = useState(false)
  const [readStartTime, setReadStartTime] = useState<number>(Date.now())
  const [completionData, setCompletionData] = useState<{
    xpEarned: number; streak: number; streakBonus: number; totalXp: number; isNewStreak: boolean
  } | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)

  // Fetch book & block
  const fetchData = useCallback(async () => {
    setLoading(true)
    setReadStartTime(Date.now())

    // Fetch book
    const { data: bookData } = await supabase
      .from('books')
      .select('*, author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)')
      .eq('id', bookId)
      .single()

    if (!bookData) {
      toast.error('Libro non trovato')
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

    // Fetch current block
    const { data: blockData } = await supabase
      .from('blocks')
      .select('*')
      .eq('book_id', bookId)
      .eq('block_number', blockNumber)
      .single()

    if (!blockData) {
      toast.error('Blocco non trovato')
      return
    }

    setBlock(blockData)

    // Check if locked
    if (user && blockData.is_released) {
      const isFreeBlock = blockNumber === 1 && bookData.first_block_free
      if (!isFreeBlock) {
        const { data: unlock } = await supabase
          .from('block_unlocks')
          .select('id')
          .eq('user_id', user.id)
          .eq('block_id', blockData.id)
          .single()

        setIsLocked(!unlock)

        // Check if user has this book via PLAN but plan is expired
        if (!unlock) {
          const { data: libEntry } = await supabase
            .from('library' as any)
            .select('ownership_type')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .single()

          if (libEntry?.ownership_type === 'PLAN') {
            const { data: profileData } = await (supabase.rpc as any)('get_user_plan', { user_id_param: user.id })
            const prof = Array.isArray(profileData) ? profileData[0] : profileData
            const expiresAt = prof?.plan_expires_at
            if (expiresAt && new Date(expiresAt) < new Date()) {
              setPlanExpired(true)
            }
          }
        }
      } else {
        setIsLocked(false)
      }
    } else if (!blockData.is_released) {
      setIsLocked(true)
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

    // Fetch comments
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, user:profiles!comments_user_id_fkey(id, name, author_pseudonym, avatar_url)')
      .eq('block_id', blockData.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setComments(commentsData || [])

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

          // Motivational toasts per milestone
          if (result.streak === 2) {
            toast('🔥 2° giorno di lettura continua!', {
              description: 'Sei sulla strada giusta per creare una grande abitudine.',
              duration: 6000,
            })
          } else if (result.streak === 7) {
            toast('🎉 Una settimana di lettura!', {
              description: 'Incredibile! 7 giorni consecutivi. Continua cosi!',
              duration: 6000,
            })
          } else if (result.streak === 30) {
            toast('🏆 Un mese di streak!', {
              description: 'Sei un vero lettore. 30 giorni consecutivi!',
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

  // Unlock block
  const handleUnlock = async () => {
    if (!user || !block) return

    const price = block.token_price || book?.token_price_per_block || 5

    if (totalTokens < price) {
      toast.error('Token insufficienti', {
        action: { label: 'Acquista', onClick: () => router.push('/wallet') },
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
      await supabase.from('block_unlocks').insert({
        user_id: user.id,
        block_id: block.id,
        book_id: bookId,
        tokens_spent: price,
        token_type: bonusUsed > 0 && premiumUsed > 0 ? 'mixed' : bonusUsed > 0 ? 'bonus' : 'premium',
      })

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

  // Comment
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
      })
      .select('*, user:profiles!comments_user_id_fkey(id, name, author_pseudonym, avatar_url)')
      .single()

    if (comment) {
      setComments(prev => [comment, ...prev])
      setNewComment('')
      toast.success('Commento pubblicato')

      // Notifica all'autore
      if (book?.author_id) {
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
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <Loader2 className="w-8 h-8 text-sage-500 animate-spin" />
      </div>
    )
  }

  const _authorName = book?.author?.author_pseudonym || book?.author?.name || 'Autore'

  return (
    <div className={`min-h-screen bg-cream-50 ${blueLightFilter ? 'blue-light-filter' : ''}`}>
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-cream-50/95 backdrop-blur-sm border-b border-sage-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-bark-500 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-sage-800 line-clamp-1">{book?.title}</p>
            <p className="text-xs text-bark-400">Blocco {blockNumber} di {blocks.length}</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setBlueLightFilter(!blueLightFilter)} className="p-2 text-bark-400 hover:text-sage-600">
              {blueLightFilter ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setFontSize(prev => prev === 20 ? 14 : prev + 2)}
              className="p-2 text-bark-400 hover:text-sage-600"
            >
              <Type className="w-4 h-4" />
            </button>
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
            <div className="w-20 h-20 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-sage-400" />
            </div>

            {!block?.is_released ? (
              <>
                <h2 className="text-xl font-bold text-sage-900 mb-2">Blocco non ancora disponibile</h2>
                <p className="text-bark-500 mb-2">
                  Questo blocco sarà disponibile il{' '}
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
                    className="px-6 py-3 bg-white border border-sage-300 text-sage-700 rounded-xl font-medium hover:bg-sage-50 transition-colors flex items-center gap-2 justify-center"
                  >
                    <Coins className="w-4 h-4" />
                    Acquista per {block?.token_price || book?.token_price_per_block || 5} token
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-sage-900 mb-2">Sblocca questo blocco</h2>
                <p className="text-bark-500 mb-2">
                  Servono <strong>{block?.token_price || book?.token_price_per_block || 5} token</strong> per continuare a leggere
                </p>
                <p className="text-sm text-bark-400 mb-6">
                  Hai <strong>{totalTokens} token</strong> disponibili
                </p>
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="px-8 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                >
                  {unlocking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Coins className="w-4 h-4" />
                  )}
                  Sblocca per {block?.token_price || book?.token_price_per_block || 5} token
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Block title */}
            {block?.title && (
              <h2 className="text-xl font-bold text-sage-900 mb-6 text-center">{block.title}</h2>
            )}

            {/* Reading content */}
            <article
              className="reading-text text-bark-700 mb-12 animate-fade-in whitespace-pre-wrap"
              style={{ fontSize: `${fontSize}px` }}
            >
              {block?.content}
            </article>

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
            </div>

            {/* Completion feedback */}
            {showCompletion && completionData && (
              <div className="my-6 p-5 bg-gradient-to-r from-sage-50 to-green-50 border border-sage-200 rounded-2xl animate-fade-in">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-bold text-sage-900">Blocco completato!</h3>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-sage-200">
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

            {/* Navigation */}
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
                  className="flex items-center gap-2 px-6 py-3 text-sm bg-sage-500 text-white rounded-xl hover:bg-sage-600 font-medium shadow-sm hover:shadow-md transition-all"
                >
                  Prossimo blocco
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-sage-600 font-medium">Hai letto tutti i blocchi disponibili!</p>
                  <Link
                    href={`/libro/${bookId}`}
                    className="text-xs text-sage-500 hover:text-sage-700 mt-1 inline-block"
                  >
                    Torna alla pagina del libro
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* Comments section */}
        {showComments && (
          <div className="mt-6 animate-slide-up">
            <h3 className="text-lg font-bold text-sage-900 mb-4">Commenti ({comments.length})</h3>

            {user && (
              <div className="flex items-start gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center text-xs font-bold text-sage-700">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Scrivi un commento..."
                    rows={2}
                    className="w-full px-3 py-2 border border-sage-200 rounded-xl text-sm focus:border-sage-400 outline-none resize-none"
                  />
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

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-600">
                    {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-sage-800">
                        {comment.user?.author_pseudonym || comment.user?.name || 'Anonimo'}
                      </p>
                      {comment.is_author_reply && (
                        <span className="text-xs bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded">Autore</span>
                      )}
                      <span className="text-xs text-bark-400">
                        {new Date(comment.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <p className="text-sm text-bark-600 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-center text-sm text-bark-400 py-8">Nessun commento ancora. Sii il primo!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
