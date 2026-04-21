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
import { MACRO_AREAS, type MacroArea } from '@/lib/genres'

const READING_TIMES = [
  { label: 'Veloce (< 10 blocchi)', max: 10 },
  { label: 'Medio (10-25 blocchi)', min: 10, max: 25 },
  { label: 'Lungo (25+ blocchi)', min: 25 },
]

type SortOption = 'trending' | 'newest' | 'popular' | 'serializations'
type StatusFilter = 'all' | 'ongoing' | 'completed'

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'trending', label: 'In tendenza' },
  { key: 'newest', label: 'Nuovi' },
  { key: 'popular', label: 'Più letti' },
  { key: 'serializations', label: 'Serializzazioni' },
]

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
        className="flex gap-4 overflow-x-auto pb-2"
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

export default function BrowsePage() {
  const { user, profile } = useAuth()
  const supabase = createClient()

  // Filter state
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeMacro, setActiveMacro] = useState<MacroArea | null>(null)
  const [genre, setGenre] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [readingTime, setReadingTime] = useState<number | null>(null)
  const [sort, setSort] = useState<SortOption | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Discovery sections state
  const [continueReading, setContinueReading] = useState<any[]>([])
  const [trendingBooks, setTrendingBooks] = useState<any[]>([])
  const [recommended, setRecommended] = useState<any[]>([])
  const [mostCommented, setMostCommented] = useState<any[]>([])

  // ── Hide-on-scroll-down / show-on-scroll-up per la barra filtri ──
  // La navbar principale resta fissa; solo questa barra si nasconde.
  const [filterHidden, setFilterHidden] = useState(false)
  useEffect(() => {
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0
    const THRESHOLD = 10 // minimo spostamento prima di triggerare
    const NAVBAR_HEIGHT = 64 // altezza navbar in px (top-16)
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY

        // Vicino al top: sempre visibile
        if (y < NAVBAR_HEIGHT + 20) {
          setFilterHidden(false)
          lastY = y
          ticking = false
          return
        }

        // Evita flickering su scroll minimo
        if (Math.abs(delta) < THRESHOLD) {
          ticking = false
          return
        }

        setFilterHidden(delta > 0) // scroll giù → nascondi, scroll su → mostra
        lastY = y
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const hasActiveFilters = genre || activeMacro || statusFilter !== 'all' || readingTime !== null || sort !== null
  // Le categorie colorate (macro/genre) NON escono dalla discovery mode: filtrano sia sezioni che griglia.
  // Solo i filtri dell'imbuto (sort, status, readingTime) o la search attivano la grid mode.
  const isDiscoveryMode = sort === null && statusFilter === 'all' && readingTime === null && !search

  const showFullCatalog = (sortBy: SortOption) => {
    setSort(sortBy)
  }

  /* ── Fetch filtered books ── */
  const fetchBooks = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
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
    } else if (activeMacro) {
      // Filtra per macro-area: cerca tutti i sotto-generi di quella macro
      const subGenreValues = activeMacro.subGenres.map(sg => sg.value)
      query = query.in('genre', subGenreValues)
    }

    if (readingTime !== null) {
      const rt = READING_TIMES[readingTime]
      if (rt.min !== undefined) query = query.gte('total_blocks', rt.min)
      if (rt.max !== undefined) query = query.lte('total_blocks', rt.max)
    }

    if (sort === 'trending') {
      query = query.order('trending_score', { ascending: false })
    } else if (sort === 'newest') {
      query = query.order('published_at', { ascending: false })
    } else if (sort === 'popular') {
      query = query.order('total_reads', { ascending: false })
    } else if (sort === 'serializations') {
      query = query.order('published_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.limit(50)

    const { data } = await query
    if (data) setBooks(data)
    setLoading(false)
  }, [supabase, search, genre, activeMacro, sort, statusFilter, readingTime])

  /* ── Fetch discovery sections ── */
  const fetchDiscoverySections = useCallback(async () => {
    // Helper: applica filtro macro/genre a una query sui books
    const applyCategoryFilter = (q: any) => {
      if (genre) return q.eq('genre', genre)
      if (activeMacro) {
        const subGenreValues = activeMacro.subGenres.map(sg => sg.value)
        return q.in('genre', subGenreValues)
      }
      return q
    }

    // Determina generi ammessi per filtrare in-memory i risultati di "Continua a leggere"
    const allowedGenres: string[] | null = genre
      ? [genre]
      : activeMacro
        ? activeMacro.subGenres.map(sg => sg.value)
        : null

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
            total_likes, total_reads, total_saves, total_comments, trending_score, access_level,
            first_block_free, status, published_at,
            author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'reading')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (libraryData) {
        const filtered = allowedGenres
          ? libraryData.filter((item: any) => item.book && allowedGenres.includes(item.book.genre))
          : libraryData
        const booksWithProgress = await Promise.all(
          filtered
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
    } else {
      setContinueReading([])
    }

    // 2. In tendenza — legge dalla cache velocity per performance
    const { data: cacheData } = await supabase
      .from('trending_cache')
      .select('book_id, score, position')
      .order('position', { ascending: true })
      .limit(30)

    if (cacheData && cacheData.length > 0) {
      const bookIds = cacheData.map((c: any) => c.book_id)
      let trendQ = supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
        `)
        .in('id', bookIds)
        .in('status', ['published', 'ongoing', 'completed'])
      trendQ = applyCategoryFilter(trendQ)
      const { data: trendData } = await trendQ

      if (trendData) {
        const posMap = new Map<string, number>(cacheData.map((c: any) => [c.book_id, Number(c.position)]))
        const sorted = [...trendData]
          .map(b => ({ ...b, _trendingPosition: posMap.get(b.id) || 99 }))
          .sort((a, b) => a._trendingPosition - b._trendingPosition)
          .slice(0, 12)
        setTrendingBooks(sorted)
      }
    } else {
      let trendQ = supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
        `)
        .in('status', ['published', 'ongoing', 'completed'])
      trendQ = applyCategoryFilter(trendQ)
      const { data: trendData } = await trendQ
        .order('trending_score', { ascending: false })
        .limit(12)

      if (trendData) setTrendingBooks(trendData)
    }

    // 3. Consigliati per te
    // Se la categoria è già selezionata, usiamo quella; altrimenti i preferiti del profilo.
    if (!genre && !activeMacro && profile?.preferred_genres && profile.preferred_genres.length > 0) {
      const { data: recData } = await supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
        `)
        .in('genre', profile.preferred_genres)
        .in('status', ['published', 'ongoing', 'completed'])
        .order('trending_score', { ascending: false })
        .limit(12)

      if (recData) setRecommended(recData)
    } else {
      let recQ = supabase
        .from('books')
        .select(`
          *,
          author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
        `)
        .in('status', ['published', 'ongoing', 'completed'])
      recQ = applyCategoryFilter(recQ)
      const { data: recData } = await recQ
        .order('total_likes', { ascending: false })
        .limit(12)

      if (recData) setRecommended(recData)
    }

    // 4. I più commentati
    let commQ = supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
      `)
      .in('status', ['published', 'ongoing', 'completed'])
    commQ = applyCategoryFilter(commQ)
    const { data: commData } = await commQ
      .order('total_comments', { ascending: false })
      .limit(12)

    if (commData) setMostCommented(commData)
  }, [supabase, user, profile, activeMacro, genre])

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
    setActiveMacro(null)
    setGenre(null)
    setStatusFilter('all')
    setReadingTime(null)
    setSort(null)
  }

  const handleMacroClick = (macro: MacroArea) => {
    if (activeMacro?.value === macro.value) {
      setActiveMacro(null)
      setGenre(null)
    } else {
      setActiveMacro(macro)
      setGenre(null)
    }
  }

  const handleSubGenreClick = (subGenreValue: string) => {
    setGenre(genre === subGenreValue ? null : subGenreValue)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Sticky filter bar (inizio pagina) — hide on scroll down, show on scroll up ── */}
      <div
        className={`sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-2.5 border-b border-sage-100/50 dark:border-sage-800/40 transition-transform duration-300 ease-out will-change-transform ${
          filterHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ backgroundColor: 'color-mix(in srgb, var(--background) 88%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* Search + Filter toggle */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300 dark:text-sage-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca titolo..."
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-sage-200 dark:border-sage-700 focus:border-sage-400 dark:focus:border-sage-500 focus:ring-2 focus:ring-sage-200 dark:focus:ring-sage-700 outline-none transition-all text-sm bg-white dark:bg-[#252525] dark:text-gray-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-bark-300 hover:text-bark-500 dark:text-sage-500 dark:hover:text-sage-300" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-sage-500 text-white border-sage-500'
                : 'border-sage-200 dark:border-sage-700 text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Livello 1: Macro-Aree con icone e colori */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <button
            onClick={() => { setActiveMacro(null); setGenre(null) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${
              !activeMacro
                ? 'bg-sage-600 text-white border-sage-600'
                : 'bg-white dark:bg-[#282828] text-bark-500 dark:text-[#aaaaaa] border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-[#333333]'
            }`}
          >
            Tutti
          </button>
          {MACRO_AREAS.map((macro) => (
            <button
              key={macro.value}
              onClick={() => handleMacroClick(macro)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${
                activeMacro?.value === macro.value
                  ? `${macro.color.bg} ${macro.color.text} border-transparent`
                  : `${macro.color.bgLight} ${macro.color.textLight} ${macro.color.border} hover:opacity-80`
              }`}
            >
              <span className="text-sm">{macro.icon}</span>
              {macro.label}
            </button>
          ))}
        </div>

        {/* Livello 2: Sotto-generi (visibili solo quando macro selezionata) */}
        {activeMacro && (
          <div
            className="flex items-center gap-1.5 mt-2 overflow-x-auto animate-fade-in"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={() => setGenre(null)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                !genre
                  ? `${activeMacro.color.bg} ${activeMacro.color.text}`
                  : 'bg-sage-50 dark:bg-[#282828] text-bark-400 dark:text-[#aaaaaa] hover:bg-sage-100 dark:hover:bg-[#333333]'
              }`}
            >
              Tutti {activeMacro.label}
            </button>
            {activeMacro.subGenres.map((sg) => (
              <button
                key={sg.value}
                onClick={() => handleSubGenreClick(sg.value)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                  genre === sg.value
                    ? `${activeMacro.color.bg} ${activeMacro.color.text}`
                    : `${activeMacro.color.bgLight} ${activeMacro.color.textLight} hover:opacity-80`
                }`}
              >
                {sg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Filters panel (espandibile) ── */}
      {showFilters && (
        <div className="mt-4 mb-4 p-4 bg-white rounded-xl border border-sage-100 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-sage-800">Filtri avanzati</p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-xs text-red-400 hover:text-red-500 font-medium">
                Rimuovi tutti
              </button>
            )}
          </div>

          {/* Ordinamento */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">ORDINAMENTO</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSort(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sort === null ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                Nessuno
              </button>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sort === key ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stato */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">STATO</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all' as StatusFilter, label: 'Tutti' },
                { key: 'ongoing' as StatusFilter, label: 'In corso' },
                { key: 'completed' as StatusFilter, label: 'Completati' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === key ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lunghezza */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">LUNGHEZZA</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setReadingTime(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  readingTime === null ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                Qualsiasi
              </button>
              {READING_TIMES.map((rt, i) => (
                <button
                  key={i}
                  onClick={() => setReadingTime(readingTime === i ? null : i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    readingTime === i ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ DISCOVERY MODE ═══════ */}
      {isDiscoveryMode && (
        <div className="mt-5 space-y-6">
          {/* 1. Continua a leggere */}
          {continueReading.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-sage-900">Continua a leggere</h2>
                <Link href="/libreria" className="text-xs text-sage-500 hover:text-sage-700 font-medium flex items-center gap-0.5">
                  Vedi tutti <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <HorizontalCarousel>
                {continueReading.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-40 sm:w-44">
                    <Link href={`/libro/${book.id}`} className="group block">
                      <div className="bg-white rounded-xl overflow-hidden border border-sage-100 hover:border-sage-300 hover:shadow-md transition-all duration-300">
                        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/3' }}>
                          {book.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt={book.title}
                              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-200 to-sage-300">
                              <BookOpen className="w-10 h-10 text-sage-500" />
                            </div>
                          )}
                          {/* Progress overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-6">
                            <p className="text-white text-[11px] font-medium mb-1">
                              Blocco {book.currentBlock} di {book.total_blocks}
                            </p>
                            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{
                                  width: `${book.total_blocks > 0 ? Math.round((book.currentBlock / book.total_blocks) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <h3 className="font-semibold text-sage-900 text-xs line-clamp-1">{book.title}</h3>
                          <p className="text-[11px] text-bark-400 mt-0.5 line-clamp-1">
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

          {/* 2. In tendenza */}
          {trendingBooks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-sage-900 dark:text-sage-100">In tendenza</h2>
                <Link
                  href="/trending"
                  className="text-xs text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 font-medium flex items-center gap-0.5"
                >
                  Classifica <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <HorizontalCarousel>
                {trendingBooks.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-40 sm:w-44">
                    <BookCard book={book} showTrending trendingPosition={book._trendingPosition} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* 3. Consigliati per te */}
          {recommended.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-sage-900">
                  {user ? 'Consigliati per te' : 'I pi\u00F9 amati'}
                </h2>
                <button
                  onClick={() => showFullCatalog('popular')}
                  className="text-xs text-sage-500 hover:text-sage-700 font-medium flex items-center gap-0.5"
                >
                  Vedi tutti <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <HorizontalCarousel>
                {recommended.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-40 sm:w-44">
                    <BookCard book={book} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* 4. I più commentati */}
          {mostCommented.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-sage-900">I pi&#249; commentati</h2>
                <button
                  onClick={() => showFullCatalog('popular')}
                  className="text-xs text-sage-500 hover:text-sage-700 font-medium flex items-center gap-0.5"
                >
                  Vedi tutti <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <HorizontalCarousel>
                {mostCommented.map((book: any) => (
                  <div key={book.id} className="flex-shrink-0 w-40 sm:w-44">
                    <BookCard book={book} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}
        </div>
      )}

      {/* ═══════ GRID MODE (search/filter/sort active) ═══════ */}
      {!isDiscoveryMode && (
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-sage-100 animate-pulse">
                  <div className="aspect-[2/3] bg-sage-100" />
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
        </div>
      )}
    </div>
  )
}
