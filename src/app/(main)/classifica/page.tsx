'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Flame, Trophy, Medal, Loader2, Crown, BookOpen,
  Users, TrendingUp, Heart, Eye, Award, Sparkles, ChevronUp, ChevronDown
} from 'lucide-react'
import { MecenateBadge, getMecenateLevel } from '@/components/ui/MecenateBadge'
import { getXpLevel } from '@/lib/badges'

type MainTab = 'libri' | 'autori' | 'lettori' | 'mecenati'
type BookFilter = 'reads' | 'likes' | 'trending'
type ReaderFilter = 'streak' | 'badges'

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
  const [bookFilter, setBookFilter] = useState<BookFilter>('reads')
  const [readerFilter, setReaderFilter] = useState<ReaderFilter>('streak')
  const [books, setBooks] = useState<any[]>([])
  const [authors, setAuthors] = useState<any[]>([])
  const [readers, setReaders] = useState<any[]>([])
  const [mecenati, setMecenati] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // Fetch books leaderboard
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab !== 'libri') return
    const fetchBooks = async () => {
      setLoading(true)

      if (bookFilter === 'trending') {
        // Per In Tendenza uso trending_cache (posizioni, delta, days_at_top)
        const { data: cache } = await supabase
          .from('trending_cache')
          .select('book_id, score, position, prev_position, positions_changed, is_new_entry, days_at_top')
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
          .select('id, name, username, avatar_url, author_pseudonym, prestige_points')
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
  // Fetch readers leaderboard
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab !== 'lettori') return
    const fetchReaders = async () => {
      setLoading(true)

      if (readerFilter === 'streak') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url, daily_streak, longest_streak, total_xp')
          .gt('daily_streak', 0)
          .order('daily_streak', { ascending: false })
          .limit(20)

        if (profiles) {
          const withBadges = await Promise.all(
            profiles.map(async (p: any) => {
              try {
                const { count } = await supabase
                  .from('user_badges')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', p.id)
                return { ...p, badge_count: count || 0 }
              } catch {
                return { ...p, badge_count: 0 }
              }
            })
          )
          setReaders(withBadges)
        } else {
          setReaders([])
        }
      } else {
        try {
          const { data: badgeUsers } = await supabase
            .from('user_badges')
            .select('user_id')

          if (badgeUsers && badgeUsers.length > 0) {
            const countMap: Record<string, number> = {}
            badgeUsers.forEach((b: any) => { countMap[b.user_id] = (countMap[b.user_id] || 0) + 1 })
            const sortedIds = Object.entries(countMap)
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 20)
              .map(([id]) => id)

            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name, username, avatar_url, daily_streak, longest_streak, total_xp')
              .in('id', sortedIds)

            if (profiles) {
              const withBadges = profiles.map((p: any) => ({ ...p, badge_count: countMap[p.id] || 0 }))
              withBadges.sort((a: any, b: any) => b.badge_count - a.badge_count || b.total_xp - a.total_xp)
              setReaders(withBadges)
            } else {
              setReaders([])
            }
          } else {
            setReaders([])
          }
        } catch {
          setReaders([])
        }
      }

      setLoading(false)
    }
    fetchReaders()
  }, [mainTab, readerFilter])

  // ─────────────────────────────────────────────────────────────
  // Fetch mecenati leaderboard (real-time su focus/visibility)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab !== 'mecenati') return
    let isMounted = true
    const fetchMecenati = async () => {
      if (isMounted) setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, prestige_points')
        .gt('prestige_points', 0)
        .order('prestige_points', { ascending: false })
        .limit(20)
      if (!isMounted) return
      setMecenati(data || [])
      setLoading(false)
    }
    fetchMecenati()

    const onFocus = () => { if (document.visibilityState === 'visible') fetchMecenati() }
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
          onClick={() => setMainTab('lettori')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mainTab === 'lettori'
              ? 'bg-sage-600 text-white'
              : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 border border-sage-100 dark:border-sage-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Lettori
        </button>
        <button
          onClick={() => setMainTab('mecenati')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mainTab === 'mecenati'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-sage-100 dark:border-sage-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Mecenati
        </button>
      </div>

      {/* ── Sotto-filtri ── */}
      {(mainTab === 'libri' || mainTab === 'lettori') && (
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {mainTab === 'libri' ? (
          <>
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
          </>
        ) : (
          <>
            <button
              onClick={() => setReaderFilter('streak')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                readerFilter === 'streak'
                  ? 'bg-orange-500 text-white'
                  : 'text-bark-500 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Top Streak
            </button>
            <button
              onClick={() => setReaderFilter('badges')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                readerFilter === 'badges'
                  ? 'bg-amber-500 text-white'
                  : 'text-bark-500 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Top Badge
            </button>
          </>
        )}
      </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
        </div>
      ) : mainTab === 'mecenati' ? (
        /* ═══ MECENATI LEADERBOARD ═══ */
        mecenati.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800">
            <Award className="w-16 h-16 text-amber-200 dark:text-amber-900/50 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-sage-800 dark:text-sage-200 mb-2">Nessun Mecenate ancora</h2>
            <p className="text-sm text-bark-400 dark:text-sage-500">
              Sostieni i libri con Boost o Reazioni premium per guadagnare Punti Prestigio.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mecenati.map((entry: any, index: number) => {
              const level = getMecenateLevel(entry.prestige_points)
              const levelLabel =
                level === 'diamante' ? 'Diamante'
                : level === 'oro' ? 'Oro'
                : level === 'argento' ? 'Argento'
                : 'Bronzo'
              const levelColor =
                level === 'diamante'
                  ? 'bg-gradient-to-r from-cyan-100 to-sky-100 dark:from-cyan-900/20 dark:to-sky-900/20 border border-cyan-300 dark:border-cyan-700 text-sky-800 dark:text-cyan-200'
                  : level === 'oro'
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                    : level === 'argento'
                      ? 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/40 dark:to-slate-800/40 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                      : 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-400 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              return (
                <Link
                  key={entry.id}
                  href={`/profile/${entry.username || entry.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(index)}`}
                >
                  <RankColumn index={index} />
                  {index === 0 && <Crown className="w-5 h-5 text-amber-500 -ml-2 flex-shrink-0" />}
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-lg font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
                      {(entry.name || entry.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 truncate">
                        {entry.name || entry.username || 'Utente'}
                      </p>
                      <MecenateBadge prestigePoints={entry.prestige_points} size="xs" />
                    </div>
                    {entry.username && (
                      <p className="text-xs text-bark-400 dark:text-sage-500">@{entry.username}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${levelColor}`}>
                      {levelLabel}
                    </span>
                    <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-800">
                      <Award className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        {entry.prestige_points}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
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
                    <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 truncate">{displayName}</p>
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
                        {!isNewEntry && positionsDelta > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <ChevronUp className="w-2.5 h-2.5" /> +{positionsDelta}
                          </span>
                        )}
                        {!isNewEntry && positionsDelta < 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <ChevronDown className="w-2.5 h-2.5" /> {positionsDelta}
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
        /* ═══ LETTORI LEADERBOARD ═══ */
        readers.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800">
            <Users className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-sage-800 dark:text-sage-200 mb-2">Nessun dato ancora</h2>
            <p className="text-sm text-bark-400 dark:text-sage-500">Inizia a leggere per entrare in classifica!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {readers.map((entry: any, index: number) => (
              <Link
                key={entry.id}
                href={`/profile/${entry.username || entry.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(index)}`}
              >
                <RankColumn index={index} />

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
                  <p className={`text-sm font-semibold truncate ${
                    getXpLevel(entry.total_xp).level >= 50
                      ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
                      : 'text-sage-900 dark:text-sage-100'
                  }`}>
                    {entry.name || entry.username || 'Utente'}
                  </p>
                  {entry.username && (
                    <p className="text-xs text-bark-400 dark:text-sage-500">@{entry.username}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {readerFilter === 'streak' ? (
                    <>
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-200 dark:border-orange-800">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{entry.daily_streak}</span>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-bark-400 dark:text-sage-500">XP</p>
                        <p className="text-xs font-semibold text-sage-700 dark:text-sage-300">{entry.total_xp}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-800">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{entry.badge_count}</span>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-bark-400 dark:text-sage-500">Streak</p>
                        <div className="flex items-center gap-0.5 justify-end">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <p className="text-xs font-semibold text-sage-700 dark:text-sage-300">{entry.daily_streak}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Legenda Prestigio (footer) ── */}
      <div className="mt-8 flex items-start gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-100 dark:border-amber-900/30">
        <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Punti Prestigio:</strong> +1 per Token (mance min. 5), +30 Gold, +15 Silver.
          &nbsp;Livelli: Bronzo (150+) &bull; Argento (600+) &bull; Oro (1500+) &bull; Diamante (3000+)
        </p>
      </div>
    </div>
  )
}
