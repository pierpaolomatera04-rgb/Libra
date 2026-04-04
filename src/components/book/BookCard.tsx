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
      author_pseudonym: string | null
      avatar_url: string | null
    }
  }
  showTrending?: boolean
  trendingPosition?: number  // posizione nella classifica trending (1-50)
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
      <div
        className="bg-white rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1"
        style={{
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Cover — aspect-ratio 2/3 fisso */}
        <div
          className="relative w-full overflow-hidden rounded-t-xl"
          style={{ aspectRatio: '2/3', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
        >
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-200 to-sage-300">
              <BookOpen className="w-12 h-12 text-sage-500" />
            </div>
          )}

          {/* Badge top-left: NUOVO */}
          {isNew && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                NUOVO
              </span>
            </div>
          )}

          {/* Badge top-right: Access level */}
          <div className="absolute top-2 right-2 z-10">
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${accessColor}`}>
              {accessLabel}
            </span>
          </div>

          {/* Badge bottom-right: Top 10 fire o Trending generico */}
          {trendingPosition && trendingPosition <= 10 ? (
            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] font-bold rounded-full shadow-sm">
              <Flame className="w-3 h-3" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
              Top {trendingPosition}
            </div>
          ) : showTrending && book.trending_score > 0 ? (
            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              <TrendingUp className="w-3 h-3" />
              Trending
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          {/* Genere — tag colorato per macro-area */}
          {book.genre && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit mb-1 ${getGenreTagColor(book.genre)}`}>
              {book.genre}
            </span>
          )}

          {/* Titolo: sempre 2 righe */}
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/autore/${book.author?.id}`) }}
          >
            {authorName}
          </span>

          {/* Stats footer */}
          <div className="flex items-center gap-4 mt-auto pt-3 border-t border-sage-50 text-xs text-bark-400">
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
