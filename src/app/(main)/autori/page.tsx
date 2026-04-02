'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Search, BookOpen, Users, Heart, X, Filter, Sparkles, Clock, Timer, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia', 'Altro'
]

type SortOption = 'newest' | 'oldest' | 'popular' | 'most_books'
type ViewTab = 'scopri' | 'seguiti'

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const [sort, setSort] = useState<SortOption>('newest')
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [bookLengthFilter, setBookLengthFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewTab, setViewTab] = useState<ViewTab>('scopri')
  const { user } = useAuth()
  const supabase = createClient()

  const hasActiveFilters = genreFilter !== null || bookLengthFilter !== null

  const fetchAuthors = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('profiles')
      .select('id, name, author_pseudonym, author_bio, avatar_url, author_banner_url, created_at')
      .eq('is_author', true)

    if (search) {
      query = query.or(`author_pseudonym.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data } = await query

    if (data) {
      const authorsWithStats = await Promise.all(
        data.map(async (author: any) => {
          const [booksRes, followersRes] = await Promise.all([
            supabase
              .from('books')
              .select('id, total_likes, genre, total_blocks, status')
              .eq('author_id', author.id)
              .in('status', ['published', 'ongoing', 'completed']),
            supabase
              .from('follows')
              .select('id', { count: 'exact', head: true })
              .eq('following_id', author.id),
          ])

          const books = booksRes.data || []
          return {
            ...author,
            totalBooks: books.length,
            totalLikes: books.reduce((sum: number, b: any) => sum + (b.total_likes || 0), 0),
            totalFollowers: followersRes.count || 0,
            genres: Array.from(new Set(books.map((b: any) => b.genre).filter(Boolean))),
            avgBlocks: books.length > 0
              ? Math.round(books.reduce((sum: number, b: any) => sum + (b.total_blocks || 0), 0) / books.length)
              : 0,
            hasOngoing: books.some((b: any) => b.status === 'ongoing' || b.status === 'published'),
          }
        })
      )

      setAuthors(authorsWithStats)
    }

    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      setFollowedIds(follows?.map((f: any) => f.following_id) || [])
    }

    setLoading(false)
  }, [supabase, search, user])

  useEffect(() => {
    fetchAuthors()
  }, [fetchAuthors])

  useEffect(() => {
    const timer = setTimeout(() => fetchAuthors(), 300)
    return () => clearTimeout(timer)
  }, [search, fetchAuthors])

  // Filtra e ordina lato client
  const filteredAuthors = useMemo(() => {
    let result = [...authors]

    // Filtro tab Seguiti
    if (viewTab === 'seguiti') {
      result = result.filter(a => followedIds.includes(a.id))
    }

    // Filtro genere
    if (genreFilter) {
      result = result.filter(a => a.genres.includes(genreFilter))
    }

    // Filtro lunghezza libri
    if (bookLengthFilter === 'short') {
      result = result.filter(a => a.avgBlocks > 0 && a.avgBlocks < 10)
    } else if (bookLengthFilter === 'medium') {
      result = result.filter(a => a.avgBlocks >= 10 && a.avgBlocks <= 25)
    } else if (bookLengthFilter === 'long') {
      result = result.filter(a => a.avgBlocks > 25)
    }

    // Ordinamento
    switch (sort) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'popular':
        result.sort((a, b) => (b.totalFollowers + b.totalLikes) - (a.totalFollowers + a.totalLikes))
        break
      case 'most_books':
        result.sort((a, b) => b.totalBooks - a.totalBooks)
        break
    }

    return result
  }, [authors, sort, genreFilter, bookLengthFilter, viewTab, followedIds])

  const toggleFollow = async (authorId: string) => {
    if (!user) {
      toast.error('Accedi per seguire un autore')
      return
    }

    if (followedIds.includes(authorId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', authorId)
      setFollowedIds(prev => prev.filter(id => id !== authorId))
      setAuthors(prev => prev.map(a => a.id === authorId ? { ...a, totalFollowers: a.totalFollowers - 1 } : a))
      toast.success('Non segui più questo autore')
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: authorId })
      setFollowedIds(prev => [...prev, authorId])
      setAuthors(prev => prev.map(a => a.id === authorId ? { ...a, totalFollowers: a.totalFollowers + 1 } : a))
      toast.success('Ora segui questo autore!')
    }
  }

  const clearAllFilters = () => {
    setGenreFilter(null)
    setBookLengthFilter(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Autori</h1>
          <p className="text-sm text-bark-400 mt-1">Scopri chi scrive le storie che ami</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca autore..."
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

      {/* Filtri unificati — riga singola scrollabile */}
      <div
        className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* View tabs */}
        {([
          { key: 'scopri' as ViewTab, label: 'Scopri' },
          { key: 'seguiti' as ViewTab, label: `Seguiti${followedIds.length > 0 ? ` (${followedIds.length})` : ''}` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewTab(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              viewTab === key
                ? 'bg-sage-600 text-white'
                : 'text-bark-500 dark:text-[#b0b0b0] hover:bg-sage-100 dark:hover:bg-[#2e2e2e]'
            }`}
          >
            {label}
          </button>
        ))}

        {/* Separatore */}
        <div className="w-px h-5 bg-sage-200 dark:bg-sage-700 mx-0.5 flex-shrink-0" />

        {/* Sort tabs */}
        {[
          { key: 'newest' as SortOption, label: 'Nuovi' },
          { key: 'popular' as SortOption, label: 'Più seguiti' },
          { key: 'most_books' as SortOption, label: 'Più libri' },
          { key: 'oldest' as SortOption, label: 'Meno recenti' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              sort === key
                ? 'bg-sage-500 text-white'
                : 'text-bark-400 dark:text-[#aaaaaa] hover:bg-sage-50 dark:hover:bg-[#282828]'
            }`}
          >
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

          {/* Genere libri */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">GENERE DEI LIBRI</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGenreFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !genreFilter ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                Tutti
              </button>
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    genreFilter === g ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Lunghezza libri */}
          <div>
            <p className="text-xs font-medium text-bark-400 mb-2">LUNGHEZZA MEDIA DEI LIBRI</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBookLengthFilter(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !bookLengthFilter ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                Qualsiasi
              </button>
              {[
                { key: 'short', label: 'Veloci (< 10 blocchi)' },
                { key: 'medium', label: 'Medi (10-25 blocchi)' },
                { key: 'long', label: 'Lunghi (25+ blocchi)' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBookLengthFilter(bookLengthFilter === key ? null : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    bookLengthFilter === key ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Authors grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="h-24 bg-sage-100" />
              <div className="px-5 pb-5 pt-8">
                <div className="h-4 bg-sage-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-sage-50 rounded w-1/2 mb-3" />
                <div className="h-10 bg-sage-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAuthors.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-sage-200 mx-auto mb-4" />
          <p className="text-bark-500 text-lg">
            {viewTab === 'seguiti'
              ? 'Non segui ancora nessun autore'
              : search || hasActiveFilters ? 'Nessun autore trovato' : 'Nessun autore ancora'}
          </p>
          <p className="text-bark-400 text-sm mt-1">
            {viewTab === 'seguiti'
              ? 'Esplora la sezione &quot;Scopri&quot; e inizia a seguire gli autori che ti piacciono!'
              : search || hasActiveFilters ? 'Prova a modificare i filtri' : 'I primi autori stanno arrivando!'}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAuthors.map((author) => {
            const isFollowing = followedIds.includes(author.id)
            const displayName = author.author_pseudonym || author.name
            const initial = (displayName || '?').charAt(0).toUpperCase()

            return (
              <div
                key={author.id}
                className="bg-white dark:bg-[#1e221c] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {/* Banner */}
                <Link href={`/autore/${author.id}`} className="block">
                  <div className="relative h-24 sm:h-28 overflow-hidden">
                    {author.author_banner_url ? (
                      <img
                        src={author.author_banner_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #4A6F62 0%, #7a9e6e 40%, #D8E3D8 100%)' }} />
                    )}
                  </div>
                </Link>

                {/* Avatar a cavallo del banner + Content */}
                <div className="px-5 pb-5">
                  {/* Avatar */}
                  <Link href={`/autore/${author.id}`} className="-mt-9 block w-[4.5rem] h-[4.5rem] relative mb-3">
                    <div className="w-full h-full rounded-full border-[3px] border-white dark:border-[#1e221c] overflow-hidden bg-sage-200 dark:bg-sage-700 flex items-center justify-center shadow-md">
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-sage-600 dark:text-sage-300">
                          {initial}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Name + Follow button */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/autore/${author.id}`}>
                        <h3 className="font-bold text-sage-900 dark:text-sage-100 truncate text-base hover:text-sage-600 dark:hover:text-sage-300 transition-colors">
                          {displayName}
                        </h3>
                      </Link>
                      {author.author_pseudonym && author.name && author.author_pseudonym !== author.name && (
                        <p className="text-xs text-bark-400 dark:text-[#999999] truncate">@{author.name}</p>
                      )}
                    </div>

                    {user && user.id === author.id && (
                      <Link
                        href="/dashboard/profilo-autore"
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Modifica
                      </Link>
                    )}

                    {user && user.id !== author.id && (
                      <button
                        onClick={() => toggleFollow(author.id)}
                        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          isFollowing
                            ? 'bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-sage-200 dark:hover:bg-sage-700'
                            : 'bg-sage-500 text-white hover:bg-sage-600'
                        }`}
                      >
                        {isFollowing ? 'Seguito' : 'Segui'}
                      </button>
                    )}

                    {!user && (
                      <Link
                        href={`/autore/${author.id}`}
                        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sage-50 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
                      >
                        Profilo
                      </Link>
                    )}
                  </div>

                  {/* Bio */}
                  {author.author_bio && (
                    <p className="text-xs text-bark-400 dark:text-[#999999] line-clamp-2 mb-4 leading-relaxed">
                      {author.author_bio}
                    </p>
                  )}
                  {!author.author_bio && <div className="mb-4" />}

                  {/* Generi */}
                  {author.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {author.genres.slice(0, 3).map((g: string) => (
                        <span key={g} className="text-[10px] px-2 py-0.5 bg-sage-50 dark:bg-sage-800 text-sage-600 dark:text-sage-300 rounded-full">
                          {g}
                        </span>
                      ))}
                      {author.genres.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 bg-sage-50 dark:bg-sage-800 text-sage-500 dark:text-sage-400 rounded-full">
                          +{author.genres.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs pt-4 border-t border-sage-50 dark:border-sage-800">
                    <span className="flex items-center gap-1 text-[#4A6F62] dark:text-[#999999]">
                      <BookOpen className="w-4 h-4" />
                      {author.totalBooks} {author.totalBooks === 1 ? 'libro' : 'libri'}
                    </span>
                    <span className="flex items-center gap-1 text-[#4A6F62] dark:text-[#999999]">
                      <Heart className="w-4 h-4" />
                      {author.totalLikes}
                    </span>
                    <span className="flex items-center gap-1 text-[#4A6F62] dark:text-[#999999]">
                      <Users className="w-4 h-4" />
                      {author.totalFollowers}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
