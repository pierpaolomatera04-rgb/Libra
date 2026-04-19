'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Flame, Trophy, Medal, Loader2, Crown, BookOpen,
  Users, TrendingUp, Heart, Eye, Sparkles, ChevronUp, ChevronDown
} from 'lucide-react'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { getXpLevel } from '@/lib/badges'

type MainTab = 'libri' | 'autori' | 'community'
type BookFilter = 'reads' | 'likes' | 'trending'

// Colori esatti del podio (richiesta prodotto)
const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const

// ─────────────────────────────────────────────────────────────────
// Colonna rank: numeri giganti (podio) + grigi (dal 4°)
// Larghezza fissa 80px per allineare tutte le card.
// ─────────────────────────────────────────────────────────────────
function RankColumn({ index }: { index: number }) {
  const isPodium = index < 3
  if (isPodium) {
    return (
      <div className="flex-shrink-0 w-20 flex items-center justify-center">
        <span
          className="font-extrabold leading-none text-3xl sm:text-4xl md:text-5xl select-none"
          style={{
            color: PODIUM_COLORS[index],
            textShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          {index + 1}
        </span>
      </div>
    )
  }
  return (
    <div className="flex-shrink-0 w-20 flex items-center justify-center">
      <span className="font-bold leading-none text-2xl text-bark-300 dark:text-sage-600 select-none">
        {index + 1}
      </span>
    </div>
  )
}

export default function ClassificaPage() {
  const supabase = createClient()
  const [mainTab, setMainTab] = useState<MainTab>('libri')
  const [bookFilter, setBookFilter] = useState<BookFilter>('trending')
  const [books, setBooks] = useState<any[]>([])
  const [authors, setAuthors] = useState<any[]>([])
  const [community, setCommunity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // Fetch books leaderboard
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab !== 'libri') return
    const fetchBooks = async () => {
      setLoading(true)

      if (bookFilter === 'trending') {
        // Per In Tendenza uso trending_cache (posizioni, delta, days_at_top, attivita 7gg)
        const { data: cache } = await supabase
          .from('trending_cache')
          .select('book_id, score, position, prev_position, positions_changed, is_new_entry, days_at_top, activity_delta_7d, score_7d_ago')
          .order('position', { ascending: true })
          .limit(20)

        const ids = (cache || []).map((r: any) => r.book_id)
        if (ids.length === 0) { setBooks([]); setLoading(false); return }

        const { data: booksData } = await supabase
          .from('books')
          .select('id, title, cover_image_url, genre, total_reads, total_likes, trending_score, status, author:profiles!books_author_id_fkey(id, name, username, author_pseudonym)')
          .in('id', ids)

        const booksMap = new Map((booksData || []).map((b: any) => [b.id, b]))
        const merged = (cache || []).map((r: any) => ({
          ...(booksMap.get(r.book_id) || {}),
          _trending: {
            position: r.position,
            prev_position: r.prev_position,
            positions_changed: r.positions_changed,
            is_new_entry: r.is_new_entry,
            days_at_top: r.days_at_top,
            score: r.score,
            activity_delta_7d: r.activity_delta_7d,
            score_7d_ago: r.score_7d_ago,
          },
        })).filter((b: any) => b.id)

        setBooks(merged)
        setLoading(false)
        return
      }

      let query = supabase
        .from('books')
        .select('id, title, cover_image_url, genre, total_reads, total_likes, trending_score, status, author:profiles!books_author_id_fkey(id, name, username, author_pseudonym)')
        .in('status', ['published', 'ongoing', 'completed'])

      if (bookFilter === 'reads') query = query.order('total_reads', { ascending: false })
      if (bookFilter === 'likes') query = query.order('total_likes', { ascending: false })

      const { data } = await query.limit(20)
      setBooks(data || [])
      setLoading(false)
    }
    fetchBooks()
  }, [mainTab, bookFilter])

  // ─────────────────────────────────────────────────────────────
  // Fetch authors leaderboard (follower count + books aggregati)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab !== 'autori') return
    const fetchAuthors = async () => {
      setLoading(true)
      try {
        // Prendo tutti i follow: aggrego in JS per following_id
        const { data: followsRows } = await supabase
          .from('follows')
          .select('following_id')

        const followMap: Record<string, number> = {}
        ;(followsRows || []).forEach((f: any) => {
          followMap[f.following_id] = (followMap[f.following_id] || 0) + 1
        })

        const topIds = Object.entries(followMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([id]) => id)

        if (topIds.length === 0) { setAuthors([]); setLoading(false); return }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url, author_pseudonym, total_xp')
          .in('id', topIds)

        // Conto i libri pubblicati di ciascun autore
        const { data: booksCount } = await supabase
          .from('books')
          .select('author_id')
          .in('author_id', topIds)
          .in('status', ['published', 'ongoing', 'completed'])

        const booksMap: Record<string, number> = {}
        ;(booksCount || []).forEach((b: any) => {
          booksMap[b.author_id] = (booksMap[b.author_id] || 0) + 1
        })

        const merged = (profiles || [])
          .map((p: any) => ({
            ...p,
            follower_count: followMap[p.id] || 0,
            books_count: booksMap[p.id] || 0,
          }))
          .sort((a: any, b: any) => b.follower_count - a.follower_count)

        setAuthors(merged)
      } catch {
        setAuthors([])
      }
      setLoading(false)
    }
    fetchAuthors()
  }, [mainTab])

  // ─────────────────────────────────────────────────────────────
  // Fetch community leaderboard — ordinata SOLO per total_xp
  // Real-time su focus/visibility per riflettere nuovi XP guadagnati.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab !== 'community') return
    let isMounted = true
    const fetchCommunity = async () => {
      if (isMounted) setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, total_xp, daily_streak')
        .gt('total_xp', 0)
        .order('total_xp', { ascending: false })
        .limit(20)
      if (!isMounted) return
      setCommunity(data || [])
      setLoading(false)
    }
    fetchCommunity()

    const onFocus = () => { if (document.visibilityState === 'visible') fetchCommunity() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      isMounted = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [mainTab, supabase])

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
    if (index === 1) return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700'
    if (index === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800'
    return 'bg-white dark:bg-[#1e221c] border-sage-100 dark:border-sage-800'
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">Classifica</h1>
      </div>

      {/* ── Tab principali ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setMainTab('libri')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mainTab === 'libri'
              ? 'bg-sage-600 text-white'
              : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 border border-sage-100 dark:border-sage-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Libri
        </button>
        <button
          onClick={() => setMainTab('autori')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mainTab === 'autori'
              ? 'bg-sage-600 text-white'
              : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 border border-sage-100 dark:border-sage-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Autori
        </button>
        <button
          onClick={() => setMainTab('community')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mainTab === 'community'
              ? 'bg-sage-600 text-white'
              : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 border border-sage-100 dark:border-sage-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Community
        </button>
      </div>

      {/* ── Sotto-filtri (solo per Libri) ── */}
      {mainTab === 'libri' && (
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {([
          { key: 'reads' as BookFilter, label: 'Più letti', icon: Eye },
          { key: 'likes' as BookFilter, label: 'Più votati', icon: Heart },
          { key: 'trending' as BookFilter, label: 'In tendenza', icon: TrendingUp },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setBookFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              bookFilter === key
                ? 'bg-sage-500 text-white'
                : 'text-bark-500 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
        </div>
      ) : mainTab === 'autori' ? (
        /* ═══ AUTORI LEADERBOARD ═══ */
        authors.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800">
            <Sparkles className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-sage-800 dark:text-sage-200 mb-2">Nessun autore ancora</h2>
            <p className="text-sm text-bark-400 dark:text-sage-500">Segui i tuoi autori preferiti per farli salire in classifica.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {authors.map((entry: any, index: number) => {
              const displayName = entry.author_pseudonym || entry.name || entry.username || 'Autore'
              return (
                <Link
                  key={entry.id}
                  href={`/profile/${entry.username || entry.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(index)}`}
                >
                  <RankColumn index={index} />
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-white dark:border-sage-700 shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-sage-200 dark:bg-sage-700 flex items-center justify-center text-xl font-bold text-sage-600 dark:text-sage-300 flex-shrink-0 border-2 border-white dark:border-sage-700 shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 truncate">{displayName}</p>
                      <LevelBadge totalXp={entry.total_xp} size="xs" />
                    </div>
                    {entry.username && (
                      <p className="text-xs text-bark-400 dark:text-sage-500 truncate">@{entry.username}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
                        <BookOpen className="w-2.5 h-2.5" />
                        {entry.books_count} opere
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-sage-50 dark:bg-sage-800 rounded-full border border-sage-100 dark:border-sage-700">
                    <Users className="w-3.5 h-3.5 text-sage-500" />
                    <span className="text-xs font-bold text-sage-700 dark:text-sage-300">
                      {entry.follower_count >= 1000 ? `${(entry.follower_count / 1000).toFixed(1)}k` : entry.follower_count}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      ) : mainTab === 'libri' ? (
        /* ═══ LIBRI LEADERBOARD ═══ */
        books.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800">
            <BookOpen className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-sage-800 dark:text-sage-200 mb-2">Nessun libro ancora</h2>
            <p className="text-sm text-bark-400 dark:text-sage-500">I libri appariranno qui quando verranno pubblicati.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {books.map((book: any, index: number) => {
              const authorName = book.author?.author_pseudonym || book.author?.name || 'Autore'
              const tr = book._trending
              const positionsDelta = tr?.positions_changed ?? 0
              const daysAtTop = tr?.days_at_top ?? 0
              const isNewEntry = !!tr?.is_new_entry
              const activityDelta: number | null = tr && tr.score_7d_ago > 0 ? Number(tr.activity_delta_7d) : null
              return (
                <Link
                  key={book.id}
                  href={`/libro/${book.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(index)}`}
                >
                  <RankColumn index={index} />

                  {/* Cover mini */}
                  <div className="flex-shrink-0 w-12 h-[72px] rounded-lg overflow-hidden bg-sage-100 dark:bg-sage-800">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-sage-300 dark:text-sage-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bookFilter === 'trending' && (
                        <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" style={{ animation: 'pulse 1.6s ease-in-out infinite' }} />
                      )}
                      <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 line-clamp-1">{book.title}</p>
                    </div>
                    <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">{authorName}</p>

                    {/* Indicatori trending */}
                    {bookFilter === 'trending' ? (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {isNewEntry && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            NUOVO
                          </span>
                        )}
                        {activityDelta !== null && activityDelta > 0 && (
                          <span
                            title="Variazione score ultimi 7 giorni"
                            className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          >
                            <ChevronUp className="w-2.5 h-2.5" /> +{Math.round(activityDelta)}% attività 7gg
                          </span>
                        )}
                        {activityDelta !== null && activityDelta < 0 && (
                          <span
                            title="Variazione score ultimi 7 giorni"
                            className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                          >
                            <ChevronDown className="w-2.5 h-2.5" /> {Math.round(activityDelta)}% attività 7gg
                          </span>
                        )}
                        {!isNewEntry && positionsDelta !== 0 && (
                          <span
                            title="Posizioni guadagnate/perse dall'ultima rilevazione"
                            className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                              positionsDelta > 0
                                ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800'
                                : 'bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {positionsDelta > 0 ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            {positionsDelta > 0 ? `+${positionsDelta}` : positionsDelta} pos.
                          </span>
                        )}
                        {index === 0 && daysAtTop > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Crown className="w-2.5 h-2.5" /> In vetta da {daysAtTop} {daysAtTop === 1 ? 'giorno' : 'giorni'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
                          <Eye className="w-2.5 h-2.5" />
                          {book.total_reads >= 1000 ? `${(book.total_reads / 1000).toFixed(1)}k` : book.total_reads || 0}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
                          <Heart className="w-2.5 h-2.5" />
                          {book.total_likes || 0}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Main stat */}
                  <div className="flex-shrink-0 text-right">
                    {bookFilter === 'reads' && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-sage-50 dark:bg-sage-800 rounded-full">
                        <Eye className="w-3.5 h-3.5 text-sage-500" />
                        <span className="text-xs font-bold text-sage-700 dark:text-sage-300">
                          {book.total_reads >= 1000 ? `${(book.total_reads / 1000).toFixed(1)}k` : book.total_reads || 0}
                        </span>
                      </div>
                    )}
                    {bookFilter === 'likes' && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <Heart className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{book.total_likes || 0}</span>
                      </div>
                    )}
                    {bookFilter === 'trending' && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-full border border-orange-200 dark:border-orange-800">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                          {tr?.score ? Math.round(tr.score) : Math.round(book.trending_score || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      ) : (
        /* ═══ COMMUNITY LEADERBOARD — basata esclusivamente su XP ═══ */
        community.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800">
            <Users className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-sage-800 dark:text-sage-200 mb-2">Nessun dato ancora</h2>
            <p className="text-sm text-bark-400 dark:text-sage-500">Guadagna XP leggendo, inviando mance e sbloccando badge per salire in classifica!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {community.map((entry: any, index: number) => {
              const { level } = getXpLevel(entry.total_xp ?? 0)
              return (
                <Link
                  key={entry.id}
                  href={`/profile/${entry.username || entry.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(index)}`}
                >
                  <RankColumn index={index} />
                  {index === 0 && <Crown className="w-5 h-5 text-amber-500 -ml-2 flex-shrink-0" />}

                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-sage-200 dark:bg-sage-700 flex items-center justify-center text-lg font-bold text-sage-600 dark:text-sage-300 flex-shrink-0">
                      {(entry.name || entry.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-sm font-semibold truncate ${
                        level >= 50
                          ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
                          : 'text-sage-900 dark:text-sage-100'
                      }`}>
                        {entry.name || entry.username || 'Utente'}
                      </p>
                      <LevelBadge totalXp={entry.total_xp} size="xs" />
                    </div>
                    {entry.username && (
                      <p className="text-xs text-bark-400 dark:text-sage-500">@{entry.username}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-bark-400 dark:text-sage-500">
                        Livello {level}
                      </span>
                      {entry.daily_streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
                          <Flame className="w-2.5 h-2.5 text-orange-400" />
                          {entry.daily_streak}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* XP totali */}
                  <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-sage-50 to-emerald-50 dark:from-sage-800 dark:to-emerald-900/20 rounded-full border border-sage-100 dark:border-sage-700">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-sage-700 dark:text-sage-200">
                      {(entry.total_xp ?? 0) >= 1000
                        ? `${((entry.total_xp ?? 0) / 1000).toFixed(1)}k`
                        : entry.total_xp ?? 0} XP
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
