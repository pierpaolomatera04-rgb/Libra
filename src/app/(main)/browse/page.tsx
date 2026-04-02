'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import BookCard from '@/components/book/BookCard'
import Link from 'next/link'
import {
  Search, Filter, TrendingUp, Clock, Sparkles, X, BookOpen,
  Timer, Radio, ChevronRight, ChevronLeft, BookMarked, Heart
} from 'lucide-react'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia', 'Self-help', 'Altro'
]

const READING_TIMES = [
  { label: 'Veloce (< 10 blocchi)', max: 10 },
  { label: 'Medio (10-25 blocchi)', min: 10, max: 25 },
  { label: 'Lungo (25+ blocchi)', min: 25 },
]

type SortOption = 'trending' | 'newest' | 'popular' | 'serializations'
type StatusFilter = 'all' | 'ongoing' | 'completed'

/* ── Carosello orizzontale riutilizzabile ── */
function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', checkScroll)
    return () => el?.removeEventListener('scroll', checkScroll)
  }, [children])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 backdrop-blur border border-sage-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 text-sage-700" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 backdrop-blur border border-sage-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-sage-700" />
        </button>
      )}
    </div>
  )
}

/* ── Header sezione con titolo + "Vedi tutti" ── */
function SectionHeader({
  icon: Icon,
  iconColor,
  title,
  viewAllHref,
  viewAllAction,
}: {
  icon: React.ElementType
  iconColor?: string
  title: string
  viewAllHref?: string
  viewAllAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor || 'text-sage-600'}`} />
        <h2 className="text-lg font-bold text-sage-900">{title}</h2>
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="text-sm text-sage-500 hover:text-sage-700 font-medium flex items-center gap-1">
          Vedi tutti <ChevronRight className="w-4 h-4" />
        </Link>
      )}
      {viewAllAction && (
        <button onClick={viewAllAction} className="text-sm text-sage-500 hover:text-sage-700 font-medium flex items-center gap-1">
          Vedi tutti <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function BrowsePage() {
  const { user, profile } = useAuth()
  const supabase = createClient()

  // Existing filter state
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [readingTime, setReadingTime] = useState<number | null>(null)
  const [sort, setSort] = useState<SortOption>('trending')
  const [showFilters, setShowFilters] = useState(false)

  // Discovery sections state
  const [continueReading, setContinueReading] = useState<any[]>([])
  const [newBlocks, setNewBlocks] = useState<any[]>([])
  const [recommended, setRecommended] = useState<any[]>([])
  const [mostSaved, setMostSaved] = useState<any[]>([])

  const hasActiveFilters = genre || statusFilter !== 'all' || readingTime !== null
  const isDiscoveryMode = !search && !hasActiveFilters && sort === 'trending'

  /* ── Fetch filtered books (existing logic) ── */
  const fetchBooks = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)

    if (sort === 'serializations') {
      query = query.in('status', ['published', 'ongoing'])
    } else if (statusFilter === 'ongoing') {
      query = query.in('status', ['published', 'ongoing'])
    } else if (statusFilter === 'completed') {
      query = query.eq('status', 'completed')
    } else {
      query = query.in('status', ['published', 'ongoing', 'completed'])
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (genre) {
      query = query.eq('genre', genre)
    }

    if (readingTime !== null) {
      const rt = READING_TIMES[readingTime]
      if (rt.min !== undefined) query = query.gte('total_blocks', rt.min)
      if (rt.max !== undefined) query = query.lte('total_blocks', rt.max)
    }

    switch (sort) {
      case 'trending':
        query = query.order('trending_score', { ascending: false })
        break
      case 'newest':
        query = query.order('published_at', { ascending: false })
        break
      case 'popular':
        query = query.order('total_reads', { ascending: false })
        break
      case 'serializations':
        query = query.order('published_at', { ascending: false })
        break
    }

    query = query.limit(50)

    const { data } = await query
    if (data) setBooks(data)
    setLoading(false)
  }, [supabase, search, genre, sort, statusFilter, readingTime])

  /* ── Fetch discovery sections ── */
  const fetchDiscoverySections = useCallback(async () => {
    // 1. Continua a leggere (solo utenti loggati)
    if (user) {
      const { data: libraryData } = await supabase
        .from('user_library')
        .select(`
          book_id,
          last_read_block_id,
          updated_at,
          book:books!user_library_book_id_fkey(
            id, title, description, cover_image_url, genre, total_blocks,
            total_likes, total_reads, trending_score, access_level,
            first_block_free, status, published_at,
            author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'reading')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (libraryData) {
        // Per ogni libro in lettura, calcola il progresso
        const booksWithProgress = await Promise.all(
          libraryData
            .filter((item: any) => item.book)
            .map(async (item: any) => {
              let currentBlock = 0
              if (item.last_read_block_id) {
                const { data: blockData } = await supabase
                  .from('blocks')
                  .select('block_number')
                  .eq('id', item.last_read_block_id)
                  .single()
                if (blockData) currentBlock = blockData.block_number
              }
              return {
                ...item.book,
                currentBlock,
                lastReadAt: item.updated_at,
              }
            })
        )
        setContinueReading(booksWithProgress)
      }
    }

    // 2. Nuovi blocchi (ultimi 48h)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: recentBlockBooks } = await supabase
      .from('blocks')
      .select('book_id')
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })

    if (recentBlockBooks && recentBlockBooks.length > 0) {
      const uniqueBookIds = Array.from(new Set(recentBlockBooks.map((b: any) => b.book_id))) as string[]
      const { data: newBlocksData } = await supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
        `)
        .in('id', uniqueBookIds.slice(0, 12))
        .in('status', ['published', 'ongoing', 'completed'])

      if (newBlocksData) setNewBlocks(newBlocksData)
    }

    // 3. Consigliati per te
    if (profile?.preferred_genres && profile.preferred_genres.length > 0) {
      const { data: recData } = await supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
        `)
        .in('genre', profile.preferred_genres)
        .in('status', ['published', 'ongoing', 'completed'])
        .order('trending_score', { ascending: false })
        .limit(12)

      if (recData) setRecommended(recData)
    } else {
      // Fallback: libri con più likes
      const { data: recData } = await supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
        `)
        .in('status', ['published', 'ongoing', 'completed'])
        .order('total_likes', { ascending: false })
        .limit(12)

      if (recData) setRecommended(recData)
    }

    // 4. I più salvati (basato su total_reads come proxy, o total_likes)
    const { data: savedData } = await supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)
      .in('status', ['published', 'ongoing', 'completed'])
      .order('total_likes', { ascending: false })
      .limit(12)

    if (savedData) setMostSaved(savedData)
  }, [supabase, user, profile])

  useEffect(() => {
    fetchBooks()
    fetchDiscoverySections()
  }, [fetchBooks, fetchDiscoverySections])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchBooks])

  const clearAllFilters = () => {
    setGenre(null)
    setStatusFilter('all')
    setReadingTime(null)
  }

  const handleGenreChipClick = (g: string) => {
    setGenre(g)
    setSort('trending')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Sfoglia</h1>
          <p className="text-sm text-bark-400 mt-1">Scopri la tua prossima storia preferita</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca titolo..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-bark-300 hover:text-bark-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showFilters || hasActiveFilters ? 'bg-sage-500 text-white border-sage-500' : 'border-sage-200 text-bark-500 hover:bg-sage-50'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {[
          { key: 'trending' as SortOption, label: 'In tendenza', icon: TrendingUp },
          { key: 'newest' as SortOption, label: 'Nuovi', icon: Sparkles },
          { key: 'popular' as SortOption, label: 'Più letti', icon: Clock },
          { key: 'serializations' as SortOption, label: 'Serializzazioni', icon: Radio },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              sort === key
                ? 'bg-sage-500 text-white'
                : 'bg-white text-bark-500 border border-sage-200 hover:bg-sage-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 p-5 bg-white rounded-xl border border-sage-100 animate-fade-in space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-sage-800">Filtri</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-400 hover:text-red-500 font-medium"
              >
                Rimuovi tutti
              </button>
            )}
          </div>

          {/* Genere */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">GENERE</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGenre(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !genre ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                Tutti
              </button>
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    genre === g ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Stato pubblicazione */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">STATO</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all' as StatusFilter, label: 'Tutti', icon: BookOpen },
                { key: 'ongoing' as StatusFilter, label: 'In corso', icon: Clock },
                { key: 'completed' as StatusFilter, label: 'Completati', icon: Sparkles },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === key ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo di lettura */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">LUNGHEZZA</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReadingTime(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  readingTime === null ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                Qualsiasi
              </button>
              {READING_TIMES.map((rt, i) => (
                <button
                  key={i}
                  onClick={() => setReadingTime(readingTime === i ? null : i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    readingTime === i ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ DISCOVERY MODE (no search/filters) ═══════ */}
      {isDiscoveryMode && (
        <div className="space-y-10 mb-12">
          {/* ── Continua a leggere ── */}
          {continueReading.length > 0 && (
            <section>
              <SectionHeader
                icon={BookMarked}
                iconColor="text-amber-500"
                title="Continua a leggere"
                viewAllHref="/libreria"
              />
              <HorizontalCarousel>
                {continueReading.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-44 sm:w-48">
                    <Link href={`/libro/${book.id}`} className="group block">
                      <div className="bg-white rounded-2xl overflow-hidden border border-sage-100 hover:border-sage-300 hover:shadow-md transition-all duration-300">
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
                          {/* Progress overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                            <p className="text-white text-xs font-medium mb-1.5">
                              Blocco {book.currentBlock} di {book.total_blocks}
                            </p>
                            <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{
                                  width: `${book.total_blocks > 0 ? Math.round((book.currentBlock / book.total_blocks) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sage-900 text-sm line-clamp-1">{book.title}</h3>
                          <p className="text-xs text-bark-400 mt-0.5">
                            {book.author?.author_pseudonym || book.author?.name || 'Autore'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* ── Nuovi blocchi ── */}
          {newBlocks.length > 0 && (
            <section>
              <SectionHeader
                icon={Sparkles}
                iconColor="text-emerald-500"
                title="Nuovi blocchi"
                viewAllAction={() => setSort('newest')}
              />
              <HorizontalCarousel>
                {newBlocks.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-44 sm:w-48">
                    <BookCard book={book} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* ── Esplora per categoria ── */}
          <section>
            <SectionHeader
              icon={Filter}
              iconColor="text-sage-600"
              title="Esplora per categoria"
            />
            <div className="flex flex-wrap gap-3">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenreChipClick(g)}
                  className="px-5 py-2.5 bg-white border border-sage-200 rounded-full text-sm font-medium text-sage-700 hover:bg-sage-500 hover:text-white hover:border-sage-500 transition-all duration-200"
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          {/* ── Consigliati per te ── */}
          {recommended.length > 0 && (
            <section>
              <SectionHeader
                icon={Heart}
                iconColor="text-rose-500"
                title={user ? 'Consigliati per te' : 'I pi\u00F9 amati'}
              />
              <HorizontalCarousel>
                {recommended.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-44 sm:w-48">
                    <BookCard book={book} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* ── I più salvati ── */}
          {mostSaved.length > 0 && (
            <section>
              <SectionHeader
                icon={BookMarked}
                iconColor="text-sage-600"
                title="I pi\u00F9 salvati"
              />
              <HorizontalCarousel>
                {mostSaved.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-44 sm:w-48">
                    <BookCard book={book} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}
        </div>
      )}

      {/* ═══════ GRID MODE (search/filter active OR non-trending sort) ═══════ */}
      {!isDiscoveryMode && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-sage-100 animate-pulse">
                  <div className="aspect-[3/4] bg-sage-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-sage-100 rounded w-3/4" />
                    <div className="h-3 bg-sage-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-sage-200 mx-auto mb-4" />
              <p className="text-bark-500 text-lg">Nessun libro trovato</p>
              <p className="text-bark-400 text-sm mt-1">
                {search || hasActiveFilters ? 'Prova a modificare i filtri' : 'I primi libri stanno arrivando!'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-sage-600 font-medium hover:text-sage-700"
                >
                  Rimuovi tutti i filtri
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </>
      )}

      {/* In discovery mode, also show the trending grid below */}
      {isDiscoveryMode && (
        <>
          <div className="mb-6">
            <SectionHeader
              icon={TrendingUp}
              iconColor="text-red-500"
              title="In tendenza ora"
            />
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-sage-100 animate-pulse">
                  <div className="aspect-[3/4] bg-sage-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-sage-100 rounded w-3/4" />
                    <div className="h-3 bg-sage-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} showTrending />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
