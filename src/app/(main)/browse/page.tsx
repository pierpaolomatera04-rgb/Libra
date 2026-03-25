'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BookCard from '@/components/book/BookCard'
import { Search, Filter, TrendingUp, Clock, Sparkles, X } from 'lucide-react'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia', 'Altro'
]

type SortOption = 'trending' | 'newest' | 'popular'

export default function BrowsePage() {
  const [books, setBooks] = useState<any[]>([])
  const [trendingBooks, setTrendingBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('trending')
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  const fetchBooks = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)
      .in('status', ['published', 'ongoing', 'completed'])

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (genre) {
      query = query.eq('genre', genre)
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
    }

    query = query.limit(50)

    const { data, error } = await query

    if (!error && data) {
      setBooks(data)
    }
    setLoading(false)
  }, [supabase, search, genre, sort])

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Esplora</h1>
          <p className="text-sm text-bark-400 mt-1">Scopri la tua prossima storia preferita</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca titolo o autore..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm bg-white"
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
              showFilters || genre ? 'bg-sage-500 text-white border-sage-500' : 'border-sage-200 text-bark-500 hover:bg-sage-50'
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

      {/* Genre filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-sage-100 animate-fade-in">
          <p className="text-xs font-medium text-bark-400 mb-3">GENERE</p>
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
      )}

      {/* Trending section (solo se non ci sono filtri attivi) */}
      {!search && !genre && sort === 'trending' && trendingBooks.length > 0 && (
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
          <BookCard
            book={{
              id: '',
              title: '',
              description: null,
              cover_image_url: null,
              genre: null,
              total_blocks: 0,
              total_likes: 0,
              total_reads: 0,
              trending_score: 0,
              access_level: 'open',
              first_block_free: true,
              status: 'published',
              published_at: null,
              author: { id: '', name: null, author_pseudonym: null, avatar_url: null },
            }}
          />
          <div className="mt-8">
            <p className="text-bark-500 text-lg">Nessun libro trovato</p>
            <p className="text-bark-400 text-sm mt-1">
              {search ? 'Prova a cercare qualcos\'altro' : 'I primi libri stanno arrivando!'}
            </p>
          </div>
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
