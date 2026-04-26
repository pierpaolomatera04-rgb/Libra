'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, Bookmark, TrendingUp, Flame, Star, Users, MessageCircle } from 'lucide-react'
import { getGenreTagColor } from '@/lib/genres'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface BookCardProps {
  book: {
    id: string
    title: string
    description: string | null
    cover_image_url: string | null
    genre: string | null
    total_blocks: number
    total_likes: number
    total_reads: number
    total_saves?: number
    total_comments?: number
    total_reviews?: number
    average_rating?: number | string | null
    unique_readers?: number
    trending_score: number
    access_level: string
    first_block_free: boolean
    status: string
    published_at: string | null
    author: {
      id: string
      name: string | null
      username?: string | null
      author_pseudonym: string | null
      avatar_url: string | null
    }
  }
  showTrending?: boolean
  trendingPosition?: number
}

function formatCompact(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export default function BookCard({ book, showTrending = false, trendingPosition }: BookCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [saved, setSaved] = useState<boolean>(false)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [savingBookmark, setSavingBookmark] = useState(false)

  const authorName = book.author?.author_pseudonym || book.author?.name || 'Autore'
  const isNew = book.published_at && (Date.now() - new Date(book.published_at).getTime()) < 48 * 60 * 60 * 1000

  const accessLabel = book.access_level === 'gold_exclusive'
    ? 'Gold'
    : book.access_level === 'silver_choice'
      ? 'Silver+'
      : 'Free'

  // Badge tier più sottile ed elegante
  const accessStyle = book.access_level === 'gold_exclusive'
    ? 'bg-amber-100/95 text-amber-800 border-amber-300/60 dark:bg-amber-900/70 dark:text-amber-200'
    : book.access_level === 'silver_choice'
      ? 'bg-slate-100/95 text-slate-700 border-slate-300/60 dark:bg-slate-800/80 dark:text-slate-200'
      : 'bg-emerald-50/95 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/70 dark:text-emerald-200'

  // Carica stato bookmark corrente
  useEffect(() => {
    if (!user) { setSavedLoaded(true); return }
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('user_library')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .maybeSingle()
      if (!alive) return
      if (data && (data.status === 'saved' || data.status === 'reading')) {
        setSaved(true)
      }
      setSavedLoaded(true)
    })()
    return () => { alive = false }
  }, [user, book.id, supabase])

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast.error('Accedi per salvare i libri')
      return
    }
    if (savingBookmark) return
    setSavingBookmark(true)
    const next = !saved
    setSaved(next)
    if (next) {
      await supabase.from('user_library').upsert(
        { user_id: user.id, book_id: book.id, status: 'saved' },
        { onConflict: 'user_id,book_id' }
      )
      toast.success('Salvato nella tua libreria')
    } else {
      // Se era solo "saved" → rimuovi. Se l'utente stava "reading" non lo tolgo per sicurezza.
      const { data: existing } = await supabase
        .from('user_library')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .maybeSingle()
      if (existing?.status === 'saved') {
        await supabase.from('user_library').delete().eq('id', existing.id)
      } else if (existing?.status === 'reading') {
        // Riporto a "reading" nello stato UI
        setSaved(true)
        toast.info('Il libro è in lettura — rimuovilo dalla libreria se vuoi toglierlo')
      }
    }
    setSavingBookmark(false)
  }

  // Statistiche
  const avg = typeof book.average_rating === 'string' ? parseFloat(book.average_rating) : (book.average_rating || 0)
  const hasReviews = (book.total_reviews || 0) > 0 && avg > 0
  const readers = book.unique_readers ?? book.total_reads ?? 0
  const comments = book.total_comments ?? 0

  return (
    <Link href={`/libro/${book.id}`} className="group block h-full">
      <div className="h-full flex flex-col transition-transform duration-200 ease-out md:group-hover:-translate-y-1 md:group-hover:scale-[1.03]">
        {/* Cover 3D */}
        <div className="relative flex justify-center py-3 px-2">
          {/* Ombra sotto */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-3 bg-black/15 rounded-full blur-md transition-all duration-200 md:group-hover:w-[80%] md:group-hover:h-5 md:group-hover:bottom-[-6px] md:group-hover:blur-xl md:group-hover:bg-black/25" />

          <div
            className="relative md:group-hover:[transform:rotateY(-6deg)_translateX(-2px)] transition-transform duration-200"
            style={{
              perspective: '600px',
              transformStyle: 'preserve-3d',
              transform: 'rotateY(-3deg)',
            }}
          >
            {/* Cover container — responsive: 110px mobile, 140px tablet, 130px desktop */}
            <div
              className="relative w-[110px] sm:w-[140px] lg:w-[130px] rounded-r-md rounded-l-[2px] overflow-hidden"
              style={{
                aspectRatio: '2/3',
                boxShadow: '2px 3px 12px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.1)',
              }}
            >
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-200 to-sage-300">
                  <BookOpen className="w-10 h-10 text-sage-500" />
                </div>
              )}

              {/* Riflesso luce */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(120deg, rgba(255,255,255,0.14) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
                }}
              />

              {/* Badge NUOVO (top-left) */}
              {isNew && (
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span className="px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[9px] font-bold rounded-full shadow-sm">
                    NUOVO
                  </span>
                </div>
              )}

              {/* Badge Tier (top-right) — più elegante */}
              <div className="absolute top-1.5 right-1.5 z-10">
                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full border backdrop-blur-sm ${accessStyle}`}>
                  {accessLabel}
                </span>
              </div>

              {/* Badge Trending (bottom-left) */}
              {trendingPosition && trendingPosition <= 10 ? (
                <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                  <Flame className="w-2.5 h-2.5" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Top {trendingPosition}
                </div>
              ) : showTrending && book.trending_score > 0 ? (
                <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                  <TrendingUp className="w-2.5 h-2.5" />
                </div>
              ) : null}

              {/* Bookmark (bottom-right) — on cover */}
              {savedLoaded && (
                <button
                  type="button"
                  onClick={toggleBookmark}
                  aria-label={saved ? 'Rimuovi dai salvati' : 'Salva nella libreria'}
                  className="absolute bottom-1.5 right-1.5 z-20 w-7 h-7 rounded-full bg-black/45 backdrop-blur hover:bg-black/65 flex items-center justify-center transition-colors shadow-sm"
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${saved ? 'text-amber-300 fill-amber-300' : 'text-white'}`}
                  />
                </button>
              )}
            </div>

            {/* Dorso */}
            <div
              className="absolute top-0 bottom-0 left-0 w-[7px] rounded-l-[2px]"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.05))',
                transform: 'translateX(-100%) rotateY(-90deg)',
                transformOrigin: 'right center',
              }}
            />

            {/* Pagine bordo */}
            <div
              className="absolute top-[2px] bottom-[2px] right-0 w-[4px]"
              style={{
                background: 'linear-gradient(to right, #f5f0e8, #e8e0d4)',
                transform: 'translateX(100%)',
                borderRadius: '0 1px 1px 0',
                boxShadow: 'inset 0 0 3px rgba(0,0,0,0.08)',
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="px-2 pb-3 flex flex-col flex-1">
          {book.genre && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit mb-1 ${getGenreTagColor(book.genre)}`}>
              {book.genre}
            </span>
          )}

          <h3
            className="font-semibold text-sage-900 dark:text-sage-100 text-[11px] sm:text-sm group-hover:text-sage-600 dark:group-hover:text-sage-300 transition-colors"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.2rem',
            }}
          >
            {book.title}
          </h3>
          <span
            className="text-[10px] sm:text-xs text-bark-400 dark:text-sage-500 mt-1 block hover:text-sage-600 dark:hover:text-sage-300 transition-colors cursor-pointer truncate"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); const u = book.author?.username || book.author?.id; if (u) router.push(`/profile/${u}`) }}
          >
            {authorName}
          </span>

          {/* Stats: rating, lettori, commenti */}
          <div className="flex items-center gap-2 sm:gap-3 mt-auto pt-2 text-[10px] sm:text-[11px] text-bark-400 dark:text-sage-500">
            <span className="flex items-center gap-0.5 font-medium" title={hasReviews ? `${avg.toFixed(1)} su 5` : 'Nessun voto'}>
              <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${hasReviews ? 'text-amber-400 fill-amber-400' : 'text-sage-300 dark:text-sage-600'}`} />
              <span className={hasReviews ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                {hasReviews ? avg.toFixed(1) : '—'}
              </span>
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1" title={`${readers} lettori`}>
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {formatCompact(readers)}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1" title={`${comments} commenti`}>
              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {formatCompact(comments)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
