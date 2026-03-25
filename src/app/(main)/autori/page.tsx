'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Search, BookOpen, Users, Heart, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const { user } = useAuth()
  const supabase = createClient()

  const fetchAuthors = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('profiles')
      .select('id, name, author_pseudonym, author_bio, avatar_url')
      .eq('is_author', true)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`author_pseudonym.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data } = await query

    if (data) {
      // Per ogni autore, prendi il conteggio libri e followers
      const authorsWithStats = await Promise.all(
        data.map(async (author) => {
          const [booksRes, followersRes] = await Promise.all([
            supabase
              .from('books')
              .select('id, total_likes', { count: 'exact', head: false })
              .eq('author_id', author.id)
              .in('status', ['published', 'ongoing', 'completed']),
            supabase
              .from('follows')
              .select('id', { count: 'exact', head: true })
              .eq('following_id', author.id),
          ])

          return {
            ...author,
            totalBooks: booksRes.data?.length || 0,
            totalLikes: booksRes.data?.reduce((sum, b) => sum + (b.total_likes || 0), 0) || 0,
            totalFollowers: followersRes.count || 0,
          }
        })
      )

      setAuthors(authorsWithStats)
    }

    // Fetch follow status
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      setFollowedIds(follows?.map(f => f.following_id) || [])
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Autori</h1>
          <p className="text-sm text-bark-400 mt-1">Scopri chi scrive le storie che ami</p>
        </div>

        <div className="relative w-full sm:w-72">
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
      </div>

      {/* Authors grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-sage-100 p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-sage-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sage-100 rounded w-3/4" />
                  <div className="h-3 bg-sage-50 rounded w-1/2" />
                </div>
              </div>
              <div className="h-12 bg-sage-50 rounded" />
            </div>
          ))}
        </div>
      ) : authors.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-sage-200 mx-auto mb-4" />
          <p className="text-bark-500 text-lg">
            {search ? 'Nessun autore trovato' : 'Nessun autore ancora'}
          </p>
          <p className="text-bark-400 text-sm mt-1">
            {search ? 'Prova a cercare qualcos\'altro' : 'I primi autori stanno arrivando!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {authors.map((author) => (
            <div
              key={author.id}
              className="bg-white rounded-2xl border border-sage-100 hover:border-sage-300 hover:shadow-sm transition-all p-6"
            >
              {/* Author info */}
              <div className="flex items-center gap-4 mb-4">
                <Link href={`/autore/${author.id}`}>
                  <div className="w-14 h-14 rounded-full bg-sage-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-sage-600">
                        {(author.author_pseudonym || author.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/autore/${author.id}`}>
                    <h3 className="font-semibold text-sage-900 truncate hover:text-sage-600 transition-colors">
                      {author.author_pseudonym || author.name}
                    </h3>
                  </Link>
                  {author.author_pseudonym && author.name && author.author_pseudonym !== author.name && (
                    <p className="text-xs text-bark-400 truncate">{author.name}</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {author.author_bio && (
                <p className="text-sm text-bark-500 line-clamp-2 mb-4 leading-relaxed">
                  {author.author_bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 text-xs text-bark-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {author.totalBooks} {author.totalBooks === 1 ? 'libro' : 'libri'}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {author.totalLikes} like
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {author.totalFollowers} follower
                </span>
              </div>

              {/* Follow button */}
              {user && user.id !== author.id && (
                <button
                  onClick={() => toggleFollow(author.id)}
                  className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                    followedIds.includes(author.id)
                      ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                      : 'bg-sage-500 text-white hover:bg-sage-600'
                  }`}
                >
                  {followedIds.includes(author.id) ? 'Segui già' : 'Segui'}
                </button>
              )}

              {!user && (
                <Link
                  href={`/autore/${author.id}`}
                  className="block w-full py-2 rounded-xl text-sm font-medium text-center bg-sage-50 text-sage-700 hover:bg-sage-100 transition-colors"
                >
                  Vedi profilo
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
