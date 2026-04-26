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
        className="flex gap-2 sm:gap-3 overflow-x-auto pb-2"
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
  const [continueReading, setContinueReading] = useState<any[]>([]) // 0. Continua a leggere (sopra le 8)
  const [recommended, setRecommended] = useState<any[]>([])         // 1. Consigliati per te
  const [trendingBooks, setTrendingBooks] = useState<any[]>([])     // 2. In tendenza
  const [communityPicks, setCommunityPicks] = useState<any[]>([])   // 3. Scelti dalla community
  const [topRated, setTopRated] = useState<any[]>([])               // 4. I più votati
  const [followedAuthors, setFollowedAuthors] = useState<any[]>([]) // 5. Dagli autori che segui
  const [quickReads, setQuickReads] = useState<any[]>([])           // 6. Lettura veloce
  const [readByFriends, setReadByFriends] = useState<any[]>([])     // 7. Leggi anche tu
  const [mostCommented, setMostCommented] = useState<any[]>([])     // 8. I più commentati

  // Soglia minima di libri per mostrare una sezione (regola globale)
  const MIN_SECTION_BOOKS = 1

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

  /* ── Fetch discovery sections (8 sezioni nell'ordine definitivo) ── */
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

    const allowedGenres: string[] | null = genre
      ? [genre]
      : activeMacro
        ? activeMacro.subGenres.map(sg => sg.value)
        : null

    // Select base riutilizzato per tutte le query books
    const BOOK_SELECT = `
      *,
      author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
    `

    // ── 0. CONTINUA A LEGGERE — solo utenti loggati, sopra alle 8 sezioni ──
    if (user) {
      const { data: libraryData } = await supabase
        .from('user_library')
        .select(`
          book_id,
          last_read_block_id,
          updated_at,
          book:books!user_library_book_id_fkey(
            id, title, description, cover_image_url, genre, total_blocks,
            total_likes, total_reads, total_saves, total_comments,
            total_reviews, average_rating, unique_readers,
            trending_score, access_level,
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
      } else {
        setContinueReading([])
      }
    } else {
      setContinueReading([])
    }

    // ── 1. CONSIGLIATI PER TE ──
    // Generi dei libri letti/salvati. Se utente nuovo o non loggato → più letti in assoluto.
    let recommendedGenres: string[] | null = null
    if (user) {
      const { data: histData } = await supabase
        .from('user_library')
        .select('book:books!user_library_book_id_fkey(genre)')
        .eq('user_id', user.id)
        .in('status', ['reading', 'completed', 'saved'])
        .limit(50)
      if (histData && histData.length > 0) {
        const genres = histData
          .map((r: any) => r.book?.genre)
          .filter(Boolean)
        if (genres.length > 0) recommendedGenres = Array.from(new Set(genres))
      }
    }
    {
      let q = supabase.from('books').select(BOOK_SELECT)
        .in('status', ['published', 'ongoing', 'completed'])
      if (allowedGenres) {
        q = q.in('genre', allowedGenres)
      } else if (recommendedGenres) {
        q = q.in('genre', recommendedGenres)
      }
      const { data } = await q.order('total_reads', { ascending: false }).limit(12)
      setRecommended(data || [])
    }

    // ── 2. IN TENDENZA — visibility_score ultimi 7 giorni ──
    {
      let q = supabase.from('books').select(BOOK_SELECT)
        .in('status', ['published', 'ongoing', 'completed'])
        .gt('visibility_score', 0)
      q = applyCategoryFilter(q)
      const { data } = await q.order('visibility_score', { ascending: false }).limit(12)
      setTrendingBooks(data || [])
    }

    // ── 3. SCELTI DALLA COMMUNITY — per salvataggi ultima settimana ──
    {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const { data: savesData } = await supabase
        .from('user_library')
        .select('book_id')
        .gte('created_at', since)
        .limit(2000)
      if (savesData && savesData.length > 0) {
        const counts = new Map<string, number>()
        for (const r of savesData) {
          counts.set(r.book_id, (counts.get(r.book_id) || 0) + 1)
        }
        const topIds = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([id]) => id)
        if (topIds.length > 0) {
          let q = supabase.from('books').select(BOOK_SELECT)
            .in('id', topIds)
            .in('status', ['published', 'ongoing', 'completed'])
          q = applyCategoryFilter(q)
          const { data } = await q
          if (data) {
            const sorted = [...data]
              .map(b => ({ ...b, _saves7d: counts.get(b.id) || 0 }))
              .sort((a, b) => b._saves7d - a._saves7d)
              .slice(0, 12)
            setCommunityPicks(sorted)
          } else {
            setCommunityPicks([])
          }
        } else {
          setCommunityPicks([])
        }
      } else {
        setCommunityPicks([])
      }
    }

    // ── 4. I PIÙ VOTATI — 70% recensioni + 30% voti blocchi ──
    {
      let q = supabase.from('books').select(BOOK_SELECT)
        .in('status', ['published', 'ongoing', 'completed'])
        .gt('total_reviews', 0)
      q = applyCategoryFilter(q)
      const { data: candidates } = await q.limit(60)
      if (candidates && candidates.length > 0) {
        // Voti medi blocchi per ciascun libro candidato
        const ids = candidates.map((b: any) => b.id)
        const { data: blockRatings } = await supabase
          .from('block_ratings')
          .select('block_id, stars, block:blocks!inner(book_id)')
          .in('block.book_id', ids)
        const bookBlockAvg = new Map<string, { sum: number; count: number }>()
        for (const r of (blockRatings as any[]) || []) {
          const bid = r.block?.book_id
          if (!bid) continue
          const cur = bookBlockAvg.get(bid) || { sum: 0, count: 0 }
          cur.sum += r.stars || 0
          cur.count += 1
          bookBlockAvg.set(bid, cur)
        }
        const scored = candidates.map((b: any) => {
          const blk = bookBlockAvg.get(b.id)
          const blockAvg = blk && blk.count > 0 ? blk.sum / blk.count : 0
          const reviewAvg = b.average_rating || 0
          const weighted = blockAvg > 0
            ? reviewAvg * 0.7 + blockAvg * 0.3
            : reviewAvg
          return { ...b, _weightedRating: weighted }
        })
        scored.sort((a: any, b: any) => b._weightedRating - a._weightedRating)
        setTopRated(scored.slice(0, 12))
      } else {
        setTopRated([])
      }
    }

    // ── 5. DAGLI AUTORI CHE SEGUI — nascosta se non segui nessun autore ──
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id, following:profiles!follows_following_id_fkey(is_author)')
        .eq('follower_id', user.id)
        .limit(200)
      const authorIds = (follows || [])
        .filter((f: any) => f.following?.is_author)
        .map((f: any) => f.following_id)
      if (authorIds.length > 0) {
        // Libri di quegli autori con almeno un blocco rilasciato di recente (30 giorni)
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        const { data: recentBlocks } = await supabase
          .from('blocks')
          .select('book_id, released_at')
          .eq('is_released', true)
          .gte('released_at', since)
          .limit(500)
        const bookIdsSet = new Set<string>((recentBlocks || []).map((b: any) => b.book_id))
        let q = supabase.from('books').select(BOOK_SELECT)
          .in('author_id', authorIds)
          .in('status', ['published', 'ongoing', 'completed'])
        q = applyCategoryFilter(q)
        const { data } = await q.limit(40)
        const filtered = (data || [])
          .filter((b: any) => bookIdsSet.size === 0 || bookIdsSet.has(b.id))
          .slice(0, 12)
        setFollowedAuthors(filtered)
      } else {
        setFollowedAuthors([])
      }
    } else {
      setFollowedAuthors([])
    }

    // ── 6. LETTURA VELOCE — tempo medio per blocco < 10 minuti (~2250 parole) ──
    {
      let q = supabase.from('books').select(BOOK_SELECT)
        .in('status', ['published', 'ongoing', 'completed'])
        .gt('total_blocks', 0)
      q = applyCategoryFilter(q)
      const { data: cands } = await q.order('total_reads', { ascending: false }).limit(60)
      if (cands && cands.length > 0) {
        const ids = cands.map((b: any) => b.id)
        const { data: blocks } = await supabase
          .from('blocks')
          .select('book_id, word_count')
          .in('book_id', ids)
          .eq('is_released', true)
        const wordsAgg = new Map<string, { sum: number; count: number }>()
        for (const b of (blocks as any[]) || []) {
          const cur = wordsAgg.get(b.book_id) || { sum: 0, count: 0 }
          cur.sum += b.word_count || 0
          cur.count += 1
          wordsAgg.set(b.book_id, cur)
        }
        const fast = cands
          .filter((b: any) => {
            const a = wordsAgg.get(b.id)
            if (!a || a.count === 0) return false
            const avgWords = a.sum / a.count
            return avgWords > 0 && avgWords < 2250 // < 10 min @ 225 wpm
          })
          .slice(0, 12)
        setQuickReads(fast)
      } else {
        setQuickReads([])
      }
    }

    // ── 7. LEGGI ANCHE TU — libri letti dagli utenti che segui — nascosta se 0 follow ──
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(200)
      const followedIds = (follows || []).map((f: any) => f.following_id)
      if (followedIds.length > 0) {
        const { data: theirReading } = await supabase
          .from('user_library')
          .select('book_id, user_id')
          .in('user_id', followedIds)
          .eq('status', 'reading')
          .order('updated_at', { ascending: false })
          .limit(200)
        if (theirReading && theirReading.length > 0) {
          const counts = new Map<string, number>()
          for (const r of theirReading) {
            counts.set(r.book_id, (counts.get(r.book_id) || 0) + 1)
          }
          const topIds = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([id]) => id)
          if (topIds.length > 0) {
            let q = supabase.from('books').select(BOOK_SELECT)
              .in('id', topIds)
              .in('status', ['published', 'ongoing', 'completed'])
            q = applyCategoryFilter(q)
            const { data } = await q
            const sorted = (data || [])
              .map((b: any) => ({ ...b, _friendsReading: counts.get(b.id) || 0 }))
              .sort((a: any, b: any) => b._friendsReading - a._friendsReading)
              .slice(0, 12)
            setReadByFriends(sorted)
          } else {
            setReadByFriends([])
          }
        } else {
          setReadByFriends([])
        }
      } else {
        setReadByFriends([])
      }
    } else {
      setReadByFriends([])
    }

    // ── 8. I PIÙ COMMENTATI ──
    {
      let q = supabase.from('books').select(BOOK_SELECT)
        .in('status', ['published', 'ongoing', 'completed'])
        .gt('total_comments', 0)
      q = applyCategoryFilter(q)
      const { data } = await q.order('total_comments', { ascending: false }).limit(12)
      setMostCommented(data || [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user, profile, activeMacro, genre])

  // Debug temporaneo: stampa in console quante voci ha ogni sezione (rimovibile)
  useEffect(() => {
    console.log(
      `[browse sections] continua=${continueReading.length} | consigliati=${recommended.length} | trending=${trendingBooks.length} | community=${communityPicks.length} | topRated=${topRated.length} | autori=${followedAuthors.length} | rapida=${quickReads.length} | amici=${readByFriends.length} | commentati=${mostCommented.length} | MIN=${MIN_SECTION_BOOKS}`
    )
  }, [continueReading, recommended, trendingBooks, communityPicks, topRated, followedAuthors, quickReads, readByFriends, mostCommented])

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

      {/* ═══════ DISCOVERY MODE — 8 sezioni nell'ordine definitivo ═══════ */}
      {isDiscoveryMode && (() => {
        // Helper rendering sezione: si autonasconde se < MIN_SECTION_BOOKS
        const Section = ({
          title,
          books,
          actionHref,
          actionLabel,
          actionOnClick,
          showTrending,
        }: {
          title: string
          books: any[]
          actionHref?: string
          actionLabel?: string
          actionOnClick?: () => void
          showTrending?: boolean
        }) => {
          if (books.length < MIN_SECTION_BOOKS) return null
          return (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-sage-900 dark:text-sage-100">{title}</h2>
                {actionHref ? (
                  <Link
                    href={actionHref}
                    className="text-xs text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 font-medium flex items-center gap-0.5"
                  >
                    {actionLabel || 'Vedi tutti'} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : actionOnClick ? (
                  <button
                    onClick={actionOnClick}
                    className="text-xs text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 font-medium flex items-center gap-0.5"
                  >
                    {actionLabel || 'Vedi tutti'} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
              <HorizontalCarousel>
                {books.map((book: any, idx: number) => (
                  <div key={book.id} className="flex-shrink-0 w-[100px] sm:w-[150px]">
                    <BookCard
                      book={book}
                      showTrending={showTrending}
                      trendingPosition={showTrending ? idx + 1 : undefined}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )
        }
        return (
          <div className="mt-5 space-y-6">
            {/* 0. Continua a leggere — card più piccole, sempre in cima */}
            {continueReading.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-sage-900 dark:text-sage-100">Continua a leggere</h2>
                  <Link
                    href="/libreria"
                    className="text-xs text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 font-medium flex items-center gap-0.5"
                  >
                    Vedi tutti <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <HorizontalCarousel>
                  {continueReading.map((book: any) => (
                    <div key={book.id} className="flex-shrink-0 w-[130px] sm:w-[145px]">
                      <Link href={`/libro/${book.id}`} className="group block">
                        {/* Card solo-copertina con testo sovrapposto — sezione più bassa delle altre */}
                        <div className="relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300" style={{ aspectRatio: '2/3' }}>
                          {book.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt={book.title}
                              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-200 to-sage-300">
                              <BookOpen className="w-8 h-8 text-sage-500" />
                            </div>
                          )}
                          {/* Gradiente + titolo + barra progresso sovrapposti */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 pt-6 pb-2">
                            <p className="text-white text-[10px] font-semibold line-clamp-2 leading-tight mb-1.5">
                              {book.title}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{
                                    width: `${book.total_blocks > 0 ? Math.round((book.currentBlock / book.total_blocks) * 100) : 0}%`,
                                  }}
                                />
                              </div>
                              <span className="text-white/70 text-[9px] whitespace-nowrap">
                                {book.currentBlock}/{book.total_blocks}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </HorizontalCarousel>
              </section>
            )}

            <Section
              title="Consigliati per te"
              books={recommended}
              actionOnClick={() => showFullCatalog('popular')}
            />
            <Section
              title="In tendenza"
              books={trendingBooks}
              actionHref="/trending"
              actionLabel="Classifica"
              showTrending
            />
            <Section
              title="Scelti dalla community"
              books={communityPicks}
            />
            <Section
              title="I più votati"
              books={topRated}
            />
            <Section
              title="Dagli autori che segui"
              books={followedAuthors}
              actionHref="/autori"
            />
            <Section
              title="Lettura veloce"
              books={quickReads}
            />
            <Section
              title="Leggi anche tu"
              books={readByFriends}
            />
            <Section
              title="I più commentati"
              books={mostCommented}
              actionOnClick={() => showFullCatalog('popular')}
            />
          </div>
        )
      })()}

      {/* ═══════ GRID MODE (search/filter/sort active) ═══════ */}
      {!isDiscoveryMode && (
        <div className="mt-6">
          {loading ? (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[100px] sm:w-[150px]">
                  <div className="bg-white dark:bg-[#1e221c] rounded-lg overflow-hidden border border-sage-100 dark:border-sage-800 animate-pulse">
                    <div className="aspect-[2/3] bg-sage-100 dark:bg-sage-800" />
                    <div className="p-2 space-y-1.5">
                      <div className="h-3 bg-sage-100 dark:bg-sage-800 rounded w-3/4" />
                      <div className="h-2 bg-sage-50 dark:bg-sage-900 rounded w-1/2" />
                    </div>
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
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-sage-900 dark:text-sage-100">
                  Risultati <span className="text-sm font-normal text-bark-400">({books.length})</span>
                </h2>
              </div>
              <HorizontalCarousel>
                {books.map((book) => (
                  <div key={book.id} className="flex-shrink-0 w-[100px] sm:w-[150px]">
                    <BookCard book={book} />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
