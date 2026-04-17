'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, BookOpen, Bookmark, TrendingUp, Flame } from 'lucide-react'
import { getGenreTagColor } from '@/lib/genres'

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

export default function BookCard({ book, showTrending = false, trendingPosition }: BookCardProps) {
  const router = useRouter()
  const authorName = book.author?.author_pseudonym || book.author?.name || 'Autore'
  const isNew = book.published_at && (Date.now() - new Date(book.published_at).getTime()) < 48 * 60 * 60 * 1000

  const accessLabel = book.access_level === 'gold_exclusive'
    ? 'Gold'
    : book.access_level === 'silver_choice'
      ? 'Silver+'
      : 'Free'

  const accessColor = book.access_level === 'gold_exclusive'
    ? 'bg-yellow-500 text-white'
    : book.access_level === 'silver_choice'
      ? 'bg-gray-400 text-white'
      : 'bg-sage-100 text-sage-700'

  return (
    <Link href={`/libro/${book.id}`} className="group block h-full">
      <div className="h-full flex flex-col transition-transform duration-300 ease-in-out md:group-hover:-translate-y-2.5 md:group-hover:scale-[1.03]">
        {/* Libro 3D mockup */}
        <div className="relative flex justify-center py-3 px-2">
          {/* Ombra sotto il libro — si allarga e sfuma all'hover */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-3 bg-black/15 rounded-full blur-md transition-all duration-300 ease-in-out md:group-hover:w-[80%] md:group-hover:h-5 md:group-hover:bottom-[-6px] md:group-hover:blur-xl md:group-hover:bg-black/20" />

          <div
            className="relative md:group-hover:[transform:rotateY(-8deg)_translateX(-2px)] transition-transform duration-300"
            style={{
              perspective: '600px',
              transformStyle: 'preserve-3d',
              transform: 'rotateY(-3deg)',
            }}
          >
            {/* Cover */}
            <div
              className="relative w-[130px] rounded-r-md rounded-l-[2px] overflow-hidden transition-shadow duration-300 ease-in-out"
              style={{
                aspectRatio: '2/3',
                boxShadow: '2px 2px 10px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '4px 8px 20px rgba(0,0,0,0.25), 0 0 2px rgba(0,0,0,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '2px 2px 10px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.1)' }}
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
                  background: 'linear-gradient(120deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
                }}
              />

              {/* Badge NUOVO */}
              {isNew && (
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span className="px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[9px] font-bold rounded-full">
                    NUOVO
                  </span>
                </div>
              )}

              {/* Badge Access */}
              <div className="absolute top-1.5 right-1.5 z-10">
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${accessColor}`}>
                  {accessLabel}
                </span>
              </div>

              {/* Badge Trending */}
              {trendingPosition && trendingPosition <= 10 ? (
                <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                  <Flame className="w-2.5 h-2.5" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Top {trendingPosition}
                </div>
              ) : showTrending && book.trending_score > 0 ? (
                <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">
                  <TrendingUp className="w-2.5 h-2.5" />
                </div>
              ) : null}
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

            {/* Pagine (bordo destro) */}
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
          {/* Genere */}
          {book.genre && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit mb-1 ${getGenreTagColor(book.genre)}`}>
              {book.genre}
            </span>
          )}

          {/* Titolo */}
          <h3
            className="font-semibold text-sage-900 text-sm group-hover:text-sage-600 transition-colors"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.5rem',
            }}
          >
            {book.title}
          </h3>
          <span
            className="text-xs text-bark-400 mt-1 block hover:text-sage-600 transition-colors cursor-pointer"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); const u = book.author?.username || book.author?.id; if (u) router.push(`/profile/${u}`) }}
          >
            {authorName}
          </span>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-auto pt-2 text-xs text-bark-400">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {book.total_blocks}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {book.total_likes}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" />
              {book.total_saves || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
