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
  Coins, Users, Eye, Calendar, Loader2, Shield, Bookmark
} from 'lucide-react'
import { getGenreTagColor } from '@/lib/genres'

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [book, setBook] = useState<any>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [readBlocks, setReadBlocks] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchBook = async () => {
      const { data: bookData } = await supabase
        .from('books')
        .select('*, author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url, author_bio)')
        .eq('id', bookId)
        .single()

      if (!bookData) {
        router.push('/browse')
        return
      }
      setBook(bookData)
      setLikeCount(bookData.total_likes || 0)

      // Fetch blocks metadata
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('id, block_number, title, character_count, word_count, is_released, scheduled_date')
        .eq('book_id', bookId)
        .order('block_number')

      setBlocks(blocksData || [])

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
      }

      setLoading(false)
    }

    fetchBook()
  }, [bookId, user])

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

  if (!book) return null

  const authorName = book.author?.author_pseudonym || book.author?.name || 'Autore'
  const totalWords = blocks.reduce((sum: number, b: any) => sum + (b.word_count || 0), 0)
  const readingTimeMin = Math.ceil(totalWords / 200)
  const releasedBlocks = blocks.filter((b: any) => b.is_released).length

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
            href={`/autore/${book.author?.id}`}
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

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-sage-100 p-3 text-center">
              <Layers className="w-4 h-4 text-sage-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-sage-800">{book.total_blocks}</p>
              <p className="text-[11px] text-bark-400">Blocchi totali</p>
            </div>
            <div className="bg-white rounded-xl border border-sage-100 p-3 text-center">
              <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-sage-800">~{readingTimeMin} min</p>
              <p className="text-[11px] text-bark-400">Tempo lettura</p>
            </div>
            <div className="bg-white rounded-xl border border-sage-100 p-3 text-center">
              <Eye className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-sage-800">{book.total_reads || 0}</p>
              <p className="text-[11px] text-bark-400">Letture</p>
            </div>
            <div className="bg-white rounded-xl border border-sage-100 p-3 text-center">
              <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-sage-800">{likeCount}</p>
              <p className="text-[11px] text-bark-400">Like</p>
            </div>
          </div>

          {/* Progress bar lettura */}
          {user && readBlocks.size > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-sage-700">Il tuo avanzamento</span>
                <span className="text-xs text-bark-400">
                  {readBlocks.size}/{releasedBlocks} blocchi letti — {releasedBlocks > 0 ? Math.round((readBlocks.size / releasedBlocks) * 100) : 0}%
                </span>
              </div>
              <div className="h-2.5 bg-sage-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sage-400 to-sage-600 rounded-full transition-all duration-500"
                  style={{ width: `${releasedBlocks > 0 ? (readBlocks.size / releasedBlocks) * 100 : 0}%` }}
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

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Link
              href={`/reader/${book.id}/1`}
              className="flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              {book.first_block_free ? 'Inizia a leggere gratis' : 'Inizia a leggere'}
            </Link>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors border ${
                liked
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-sage-200 text-bark-500 hover:bg-sage-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              {likeCount}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors border ${
                saved
                  ? 'bg-sage-50 border-sage-300 text-sage-700'
                  : 'bg-white border-sage-200 text-bark-500 hover:bg-sage-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-sage-500 text-sage-500' : ''}`} />
              <span className="hidden sm:inline">{saved ? 'Salvato' : 'Salva'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trama */}
      {book.description && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-sage-900 mb-3">Trama</h2>
          <div className="bg-white rounded-2xl border border-sage-100 p-6">
            <p className="text-sm text-bark-600 leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
        </div>
      )}

      {/* Blocchi */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-sage-900 mb-3">
          Blocchi ({releasedBlocks}/{book.total_blocks} pubblicati)
        </h2>
        <div className="bg-white rounded-2xl border border-sage-100 divide-y divide-sage-50">
          {blocks.map((block: any) => {
            const wordCount = block.word_count || 0
            const readMin = Math.max(1, Math.ceil(wordCount / 225))
            const isRead = readBlocks.has(block.id)
            return (
              <div key={block.id} className={`flex items-center justify-between px-5 py-3.5 ${isRead ? 'bg-sage-50/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isRead
                      ? 'bg-sage-500 text-white'
                      : block.is_released
                        ? 'bg-sage-100 text-sage-700'
                        : 'bg-bark-100 text-bark-400'
                  }`}>
                    {isRead ? '✓' : block.block_number}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${block.is_released ? 'text-sage-800' : 'text-bark-400'}`}>
                      {block.is_released
                        ? (block.title ? `${block.block_number}. ${block.title}` : `Blocco ${block.block_number}`)
                        : `Blocco ${block.block_number}`
                      }
                    </p>
                    {block.is_released && (
                      <p className="text-xs text-bark-400">
                        ~{readMin} min di lettura
                        {isRead && <span className="ml-2 text-sage-500 font-medium">Letto</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {block.is_released ? (
                    <Link
                      href={`/reader/${bookId}/${block.block_number}`}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isRead
                          ? 'text-bark-400 hover:text-sage-600 hover:bg-sage-50'
                          : 'text-sage-600 hover:text-sage-700 hover:bg-sage-50 font-semibold'
                      }`}
                    >
                      {isRead ? 'Rileggi' : 'Leggi'}
                    </Link>
                  ) : (
                    <span className="text-xs text-bark-400 flex items-center gap-1">
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
          <div className="bg-white rounded-2xl border border-sage-100 p-6">
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
