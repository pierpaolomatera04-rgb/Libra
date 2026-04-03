'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  TrendingUp, ChevronUp, ChevronDown, Minus, Flame,
  BookOpen, Heart, Bookmark, Eye, Loader2, Crown
} from 'lucide-react'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia', 'Self-help', 'Altro'
]

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

interface TrendingBook {
  position: number
  prev_position: number
  is_new_entry: boolean
  positions_changed: number
  days_at_top: number
  score: number
  book: {
    id: string
    title: string
    cover_image_url: string | null
    genre: string | null
    total_blocks: number
    total_likes: number
    total_reads: number
    total_saves: number
    status: string
    author: {
      id: string
      name: string | null
      author_pseudonym: string | null
      avatar_url: string | null
    }
  }
}

export default function TrendingPage() {
  const supabase = createClient()
  const [items, setItems] = useState<TrendingBook[]>([])
  const [loading, setLoading] = useState(true)
  const [genre, setGenre] = useState<string | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)

  const fetchTrending = useCallback(async () => {
    setLoading(true)

    const { data: cacheData } = await supabase
      .from('trending_cache')
      .select('book_id, position, prev_position, is_new_entry, positions_changed, days_at_top, score, computed_at')
      .order('position', { ascending: true })
      .limit(50)

    if (!cacheData || cacheData.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    if (cacheData[0]?.computed_at) {
      setComputedAt(cacheData[0].computed_at)
    }

    const bookIds = cacheData.map((c: any) => c.book_id)

    const { data: booksData } = await supabase
      .from('books')
      .select(`
        id, title, cover_image_url, genre, total_blocks, total_likes,
        total_reads, total_saves, status,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)
      .in('id', bookIds)

    if (!booksData) {
      setItems([])
      setLoading(false)
      return
    }

    const bookMap = new Map(booksData.map((b: any) => [b.id, b]))

    const merged: TrendingBook[] = cacheData
      .map((c: any) => ({
        position: c.position,
        prev_position: c.prev_position,
        is_new_entry: c.is_new_entry,
        positions_changed: c.positions_changed,
        days_at_top: c.days_at_top,
        score: Number(c.score),
        book: bookMap.get(c.book_id),
      }))
      .filter((item: any) => item.book)

    setItems(merged)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTrending()
  }, [fetchTrending])

  // Filtra per genere lato client
  const filtered = genre
    ? items.filter(item => item.book.genre === genre)
    : items

  // Social proof label
  const getSocialLabel = (item: TrendingBook) => {
    if (item.position === 1 && item.days_at_top > 1) {
      return { text: `In vetta da ${item.days_at_top}g`, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' }
    }
    if (item.positions_changed >= 5) {
      return { text: 'In ascesa rapida', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' }
    }
    if (item.position === 1 && item.days_at_top === 1) {
      return { text: 'Nuovo n.1!', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' }
    }
    return null
  }

  // Colore posizione podio
  const getPodiumStyle = (pos: number) => {
    if (pos === 1) return 'text-amber-500'       // oro
    if (pos === 2) return 'text-gray-400'          // argento
    if (pos === 3) return 'text-amber-700'         // bronzo
    return 'text-bark-300 dark:text-sage-700'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">Classifica Tendenze</h1>
            <p className="text-xs text-bark-400 dark:text-sage-500">
              Top 50 libri per attività negli ultimi 7 giorni
              {computedAt && (
                <> &middot; Aggiornata {new Date(computedAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Genre filters */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto mb-6 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={() => setGenre(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            !genre
              ? 'bg-sage-600 text-white'
              : 'bg-sage-50 dark:bg-[#282828] text-bark-400 dark:text-[#aaaaaa] hover:bg-sage-100 dark:hover:bg-[#333]'
          }`}
        >
          Tutti i generi
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(genre === g ? null : g)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              genre === g
                ? 'bg-sage-600 text-white'
                : 'bg-sage-50 dark:bg-[#282828] text-bark-400 dark:text-[#aaaaaa] hover:bg-sage-100 dark:hover:bg-[#333]'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Lista classifica */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-sage-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-12 h-12 text-sage-200 dark:text-sage-700 mx-auto mb-3" />
          <p className="text-bark-500 dark:text-sage-400">
            {genre ? `Nessun libro in tendenza per "${genre}"` : 'Nessun libro in tendenza al momento'}
          </p>
          <p className="text-xs text-bark-400 dark:text-sage-500 mt-1">La classifica si aggiorna ogni ora</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, idx) => {
            const displayPos = genre ? idx + 1 : item.position
            const socialLabel = getSocialLabel(item)
            const authorName = item.book.author?.author_pseudonym || item.book.author?.name || 'Autore'
            const isPodium = displayPos <= 3

            return (
              <Link
                key={item.book.id}
                href={`/libro/${item.book.id}`}
                className="group block"
              >
                <div
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 ${
                    isPodium
                      ? 'bg-white dark:bg-[#1e221c] border border-sage-100 dark:border-sage-800 shadow-sm hover:shadow-md'
                      : 'bg-white dark:bg-[#1e221c] border border-sage-50 dark:border-sage-800/50 hover:border-sage-200 dark:hover:border-sage-700 hover:shadow-sm'
                  }`}
                >
                  {/* Posizione — grande e bold */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '44px' }}>
                    <span className={`font-black leading-none ${getPodiumStyle(displayPos)} ${
                      displayPos <= 3 ? 'text-3xl sm:text-4xl' : displayPos <= 10 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                    }`}>
                      {displayPos}
                    </span>

                    {/* Freccia movimento */}
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {item.is_new_entry ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          NEW
                        </span>
                      ) : item.positions_changed > 0 ? (
                        <span className="flex items-center text-[10px] font-bold text-emerald-500">
                          <ChevronUp className="w-3 h-3" />
                          {item.positions_changed}
                        </span>
                      ) : item.positions_changed < 0 ? (
                        <span className="flex items-center text-[10px] font-bold text-red-400">
                          <ChevronDown className="w-3 h-3" />
                          {Math.abs(item.positions_changed)}
                        </span>
                      ) : (
                        <Minus className="w-3 h-3 text-bark-300 dark:text-sage-600" />
                      )}
                    </div>
                  </div>

                  {/* Cover */}
                  <div className="flex-shrink-0 w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg overflow-hidden">
                    {item.book.cover_image_url ? (
                      <img
                        src={item.book.cover_image_url}
                        alt={item.book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-sage-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Genre + Social proof */}
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          {item.book.genre && (
                            <span className="text-[10px] uppercase tracking-wider text-bark-400 dark:text-sage-500 font-medium">
                              {item.book.genre}
                            </span>
                          )}
                          {socialLabel && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${socialLabel.color}`}>
                              {socialLabel.text}
                            </span>
                          )}
                        </div>

                        {/* Titolo */}
                        <h3 className="font-semibold text-sage-900 dark:text-sage-100 text-sm sm:text-base line-clamp-1 group-hover:text-sage-600 dark:group-hover:text-sage-300 transition-colors">
                          {item.book.title}
                        </h3>

                        {/* Autore */}
                        <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5 line-clamp-1">
                          {authorName}
                        </p>
                      </div>

                      {/* Podium crown per i primi 3 su desktop */}
                      {isPodium && (
                        <div className="hidden sm:flex flex-shrink-0">
                          <Crown className={`w-5 h-5 ${
                            displayPos === 1 ? 'text-amber-400' : displayPos === 2 ? 'text-gray-400' : 'text-amber-700'
                          }`} />
                        </div>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-1.5 text-[11px] text-bark-400 dark:text-sage-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNum(item.book.total_reads || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatNum(item.book.total_likes || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        {formatNum(item.book.total_saves || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {item.book.total_blocks} blocchi
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
