'use client'

import Link from 'next/link'
import { Heart, BookOpen, Clock, TrendingUp } from 'lucide-react'

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
}

export default function BookCard({ book, showTrending = false }: BookCardProps) {
  const authorName = book.author?.author_pseudonym || book.author?.name || 'Autore'
  const isNew = book.published_at && (Date.now() - new Date(book.published_at).getTime()) < 48 * 60 * 60 * 1000

  return (
    <Link href={`/reader/${book.id}/1`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-sage-100 hover:border-sage-300 hover:shadow-md transition-all duration-300">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-sage-100 overflow-hidden">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-200 to-sage-300">
              <BookOpen className="w-12 h-12 text-sage-500" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isNew && (
              <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                NUOVO
              </span>
            )}
            {book.access_level === 'gold_exclusive' && (
              <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full">
                GOLD
              </span>
            )}
            {book.access_level === 'silver_choice' && (
              <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-bold rounded-full">
                SILVER
              </span>
            )}
          </div>

          {showTrending && book.trending_score > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              <TrendingUp className="w-3 h-3" />
              Trending
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-sage-900 text-sm line-clamp-1 group-hover:text-sage-600 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-bark-400 mt-1">{authorName}</p>

          {book.description && (
            <p className="text-xs text-bark-500 mt-2 line-clamp-2 leading-relaxed">
              {book.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-sage-50">
            <div className="flex items-center gap-3 text-xs text-bark-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {book.total_blocks} blocchi
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {book.total_likes}
              </span>
            </div>
            {book.genre && (
              <span className="text-xs px-2 py-0.5 bg-sage-50 text-sage-600 rounded-full">
                {book.genre}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
