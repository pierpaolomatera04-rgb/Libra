'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BookCard from '@/components/book/BookCard'
import { Search, Filter, TrendingUp, Clock, Sparkles, X, BookOpen, Timer, Radio } from 'lucide-react'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia', 'Altro'
]

const READING_TIMES = [
  { label: 'Veloce (< 10 blocchi)', max: 10 },
  { label: 'Medio (10-25 blocchi)', min: 10, max: 25 },
  { label: 'Lungo (25+ blocchi)', min: 25 },
]

type SortOption = 'trending' | 'newest' | 'popular' | 'serializations'
type StatusFilter = 'all' | 'ongoing' | 'completed'

export default function BrowsePage() {
  const [books, setBooks] = useState<any[]>([])
  const [trendingBooks, setTrendingBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [readingTime, setReadingTime] = useState<number | null>(null)
  const [sort, setSort] = useState<SortOption>('trending')
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  const hasActiveFilters = genre || statusFilter !== 'all' || readingTime !== null

  const fetchBooks = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)

    // Serializzazioni: forza filtro su libri in corso
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

    // Filtro tempo lettura (numero blocchi)
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

    const { data, error } = await query

    if (!error && data) {
      setBooks(data)
    }
    setLoading(false)
  }, [supabase, search, genre, sort, statusFilter, readingTime])

  const fetchTrending = useCallback(async () => {
    const { data } = await supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)
      .in('status', ['published', 'ongoing', 'completed'])
      .order('trending_score', { ascending: false })
      .limit(6)

    if (data) setTrendingBooks(data)
  }, [supabase])

  useEffect(() => {
    fetchBooks()
    fetchTrending()
  }, [fetchBooks, fetchTrending])

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
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'trending' as SortOption, label: 'In tendenza', icon: TrendingUp },
          { key: 'newest' as SortOption, label: 'Nuovi', icon: Sparkles },
          { key: 'popular' as SortOption, label: 'Più letti', icon: Clock },
          { key: 'serializations' as SortOption, label: 'Serializzazioni', icon: Radio },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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
          {/* Header filtri */}
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
                { key: 'ongoing' as StatusFilter, label: 'In uscita', icon: Clock },
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

      {/* Trending section (solo se non ci sono filtri attivi) */}
      {!search && !hasActiveFilters && sort === 'trending' && trendingBooks.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-sage-900">In tendenza ora</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {trendingBooks.map((book) => (
              <BookCard key={book.id} book={book} showTrending />
            ))}
          </div>
        </div>
      )}

      {/* All books grid */}
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
    </div>
  )
}
