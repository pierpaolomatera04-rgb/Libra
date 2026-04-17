'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Flame, Trophy, Medal, Loader2, Crown, BookOpen,
  Users, TrendingUp, Heart, Eye, Award
} from 'lucide-react'
import { MecenateBadge, getMecenateLevel } from '@/components/ui/MecenateBadge'
import { getXpLevel } from '@/lib/badges'

type MainTab = 'libri' | 'lettori' | 'mecenati'
type BookFilter = 'reads' | 'likes' | 'trending'
type ReaderFilter = 'streak' | 'badges'

export default function ClassificaPage() {
  const supabase = createClient()
  const [mainTab, setMainTab] = useState<MainTab>('libri')
  const [bookFilter, setBookFilter] = useState<BookFilter>('reads')
  const [readerFilter, setReaderFilter] = useState<ReaderFilter>('streak')
  const [books, setBooks] = useState<any[]>([])
  const [readers, setReaders] = useState<any[]>([])
  const [mecenati, setMecenati] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch books leaderboard
  useEffect(() => {
    if (mainTab !== 'libri') return
    const fetchBooks = async () => {
      setLoading(true)

      let query = supabase
        .from('books')
        .select('id, title, cover_image_url, genre, total_reads, total_likes, trending_score, status, author:profiles!books_author_id_fkey(id, name, username, author_pseudonym)')
        .in('status', ['published', 'ongoing', 'completed'])

      switch (bookFilter) {
        case 'reads':
          query = query.order('total_reads', { ascending: false })
          break
        case 'likes':
          query = query.order('total_likes', { ascending: false })
          break
        case 'trending':
          query = query.order('trending_score', { ascending: false })
          break
      }

      const { data } = await query.limit(20)
      setBooks(data || [])
      setLoading(false)
    }
    fetchBooks()
  }, [mainTab, bookFilter])

  // Fetch readers leaderboard
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

  // Fetch mecenati leaderboard
  // ── Feedback in tempo reale: la classifica si aggiorna al cambio tab,
  //    al rientro sulla scheda (visibilitychange) e quando la finestra
  //    torna in focus — così i punti guadagnati in altre pagine si
  //    riflettono appena l'utente torna qui.
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

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (index === 2) return <Medal className="w-5 h-5 text-orange-400" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-bark-400 dark:text-sage-500">{index + 1}</span>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">Classifica</h1>
      </div>

      {/* ── Tab principali ── */}
      <div className="flex gap-2 mb-4">
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
      {mainTab !== 'mecenati' && (
      <div className="flex gap-1.5 mb-5">
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
            <div className="flex items-start gap-2 p-3 mb-1 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-100 dark:border-amber-900/30">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Punti Prestigio:</strong> +1 per ogni Token (mance da min. 5 Token), +15/30 per Abbonamento (Silver/Gold),
                +5 per acquisto, +10 per Boost.
                &nbsp;Livelli: Bronzo (150+) &bull; Argento (600+) &bull; Oro (1500+) &bull; Diamante (3000+)
              </p>
            </div>
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
                  <div className="flex-shrink-0 w-7 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-base font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
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
              return (
                <Link
                  key={book.id}
                  href={`/libro/${book.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(index)}`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-7 flex justify-center">
                    {getRankIcon(index)}
                  </div>

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
                    <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 line-clamp-1">{book.title}</p>
                    <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">{authorName}</p>
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
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {book.trending_score ? Math.round(book.trending_score) : 0}
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
                {/* Rank */}
                <div className="flex-shrink-0 w-7 flex justify-center">
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sage-200 dark:bg-sage-700 flex items-center justify-center text-base font-bold text-sage-600 dark:text-sage-300 flex-shrink-0">
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
    </div>
  )
}
