'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Search, BookOpen, Users, X, Pencil, Award, Gift,
  Sparkles, TrendingUp, Star, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { MACRO_AREAS, getMacroAreaByGenre, type MacroArea } from '@/lib/genres'
import { awardXp } from '@/lib/xp'
import { XP_VALUES } from '@/lib/badges'

const CERT_MIN_BOOKS = 3
const CERT_MIN_XP = 2400
const CERT_MIN_LIKES = 50
const TOP_XP_THRESHOLD = 900
const NEW_AUTHOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

type ViewTab = 'scopri' | 'seguiti' | 'nuovi'

interface AuthorEntry {
  id: string
  name: string | null
  username: string | null
  author_pseudonym: string | null
  avatar_url: string | null
  author_banner_url: string | null
  created_at: string
  total_xp: number
  totalBooks: number
  totalLikes: number
  totalComments: number
  totalUnlocks: number
  totalReads: number
  totalFollowers: number
  engagementScore: number
  totalTipped: number
  avgRating: number | null
  genres: string[]
  booksByMacro: Record<string, number>
  certifiedIn: string[]
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const [viewTab, setViewTab] = useState<ViewTab>('scopri')
  const [userReadGenres, setUserReadGenres] = useState<Set<string>>(new Set())
  const { user, profile } = useAuth()
  const supabase = createClient()

  const fetchAuthors = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('id, name, username, author_pseudonym, author_bio, avatar_url, author_banner_url, created_at, total_xp')
      .eq('is_author', true)
    if (search) query = query.or(`author_pseudonym.ilike.%${search}%,name.ilike.%${search}%`)
    const { data } = await query
    if (data && data.length > 0) {
      const authorIds = data.map((a: any) => a.id)
      const [allBooksRes, followersRes, donationsRes] = await Promise.all([
        supabase.from('books')
          .select('id, author_id, total_likes, total_reads, genre, status, average_rating, total_reviews')
          .in('author_id', authorIds)
          .in('status', ['published', 'ongoing', 'completed']),
        supabase.from('follows').select('following_id').in('following_id', authorIds),
        supabase.from('donations').select('author_id, amount').in('author_id', authorIds).gte('amount', 5),
      ])
      const allBooks = allBooksRes.data || []
      const allFollows = followersRes.data || []
      const allDonations = donationsRes.data || []

      const bookIds = allBooks.map((b: any) => b.id)
      const commentsPerBook = new Map<string, number>()
      const unlocksPerBook = new Map<string, number>()
      if (bookIds.length > 0) {
        const [commentsRes, unlocksRes] = await Promise.all([
          supabase.from('comments').select('book_id').in('book_id', bookIds),
          supabase.from('block_unlocks').select('book_id').in('book_id', bookIds),
        ])
        for (const c of commentsRes.data || []) {
          commentsPerBook.set(c.book_id, (commentsPerBook.get(c.book_id) || 0) + 1)
        }
        for (const u of unlocksRes.data || []) {
          unlocksPerBook.set(u.book_id, (unlocksPerBook.get(u.book_id) || 0) + 1)
        }
      }

      const booksByAuthor = new Map<string, any[]>()
      for (const b of allBooks) { const list = booksByAuthor.get(b.author_id) || []; list.push(b); booksByAuthor.set(b.author_id, list) }
      const followersCount = new Map<string, number>()
      for (const f of allFollows) { followersCount.set(f.following_id, (followersCount.get(f.following_id) || 0) + 1) }
      const tippedByAuthor = new Map<string, number>()
      for (const d of allDonations) { tippedByAuthor.set(d.author_id, (tippedByAuthor.get(d.author_id) || 0) + (d.amount || 0)) }

      const enriched: AuthorEntry[] = data.map((a: any) => {
        const books = booksByAuthor.get(a.id) || []
        let totalLikes = 0, totalReads = 0, totalComments = 0, totalUnlocks = 0
        let ratedBooks = 0, ratingSum = 0
        const booksByMacro: Record<string, number> = {}
        const genres = new Set<string>()
        for (const b of books) {
          totalLikes += b.total_likes || 0
          totalReads += b.total_reads || 0
          totalComments += commentsPerBook.get(b.id) || 0
          totalUnlocks += unlocksPerBook.get(b.id) || 0
          if (b.total_reviews > 0 && b.average_rating) {
            ratedBooks++
            ratingSum += Number(b.average_rating)
          }
          if (b.genre) genres.add(b.genre)
          const macro = getMacroAreaByGenre(b.genre)
          if (macro) booksByMacro[macro.value] = (booksByMacro[macro.value] || 0) + 1
        }
        const xp = a.total_xp || 0
        const meetsGlobal = xp >= CERT_MIN_XP && totalLikes >= CERT_MIN_LIKES
        const certifiedIn = meetsGlobal
          ? Object.entries(booksByMacro).filter(([, count]) => count >= CERT_MIN_BOOKS).map(([value]) => value)
          : []
        const engagementScore = totalLikes + totalComments + totalReads + totalUnlocks
        return {
          ...a,
          total_xp: xp,
          totalBooks: books.length,
          totalLikes,
          totalComments,
          totalUnlocks,
          totalReads,
          totalFollowers: followersCount.get(a.id) || 0,
          engagementScore,
          totalTipped: tippedByAuthor.get(a.id) || 0,
          avgRating: ratedBooks > 0 ? ratingSum / ratedBooks : null,
          genres: Array.from(genres),
          booksByMacro,
          certifiedIn,
        }
      })
      setAuthors(enriched)
    } else { setAuthors([]) }

    if (user) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [followsRes, recentReadsRes] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('segment_reads')
          .select('books!inner(genre)')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo)
          .limit(500),
      ])
      setFollowedIds(followsRes.data?.map((f: any) => f.following_id) || [])
      const readGenres = new Set<string>()
      for (const r of (recentReadsRes.data as any[]) || []) {
        const g = r?.books?.genre
        if (g) readGenres.add(g)
      }
      setUserReadGenres(readGenres)
    } else {
      setUserReadGenres(new Set())
    }
    setLoading(false)
  }, [supabase, search, user])

  useEffect(() => { fetchAuthors() }, [fetchAuthors])
  useEffect(() => { const t = setTimeout(() => fetchAuthors(), 300); return () => clearTimeout(t) }, [search, fetchAuthors])

  const toggleFollow = async (authorId: string) => {
    if (!user) { toast.error('Accedi per seguire un autore'); return }
    if (followedIds.includes(authorId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', authorId)
      setFollowedIds(prev => prev.filter(id => id !== authorId))
      setAuthors(prev => prev.map(a => a.id === authorId ? { ...a, totalFollowers: a.totalFollowers - 1 } : a))
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: authorId })
      setFollowedIds(prev => [...prev, authorId])
      setAuthors(prev => prev.map(a => a.id === authorId ? { ...a, totalFollowers: a.totalFollowers + 1 } : a))
      awardXp(supabase, user.id, XP_VALUES.FOLLOW_AUTHOR, 'follow_author', true)
    }
  }

  const now = useMemo(() => Date.now(), [])

  const baseAuthors = useMemo(() => {
    if (viewTab === 'seguiti') return authors.filter(a => followedIds.includes(a.id))
    if (viewTab === 'nuovi') return authors.filter(a => now - new Date(a.created_at).getTime() <= NEW_AUTHOR_WINDOW_MS)
    return authors
  }, [authors, viewTab, followedIds, now])

  const recommended = useMemo(() => {
    let targetGenres: Set<string> | null = null
    if (userReadGenres.size > 0) targetGenres = userReadGenres
    else {
      const prefs = profile?.preferred_genres || []
      if (prefs.length) targetGenres = new Set(prefs)
    }
    const excludeSelf = (a: AuthorEntry) => !(user && a.id === user.id)
    if (targetGenres) {
      const targetMacros = new Set(
        Array.from(targetGenres).map(g => getMacroAreaByGenre(g)?.value).filter(Boolean) as string[]
      )
      const matched = baseAuthors.filter(a => {
        if (!excludeSelf(a)) return false
        const directMatch = a.genres.some(g => targetGenres!.has(g))
        const macroMatch = a.genres.some(g => {
          const m = getMacroAreaByGenre(g)
          return m ? targetMacros.has(m.value) : false
        })
        return directMatch || macroMatch
      })
      if (matched.length > 0) {
        return [...matched].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20)
      }
    }
    return [...baseAuthors]
      .filter(a => excludeSelf(a) && a.totalBooks >= 1)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 20)
  }, [baseAuthors, profile?.preferred_genres, userReadGenres, user])

  const topVotati = useMemo(() =>
    [...baseAuthors].filter(a => a.engagementScore > 0).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20)
  , [baseAuthors])

  const topSupportati = useMemo(() =>
    [...baseAuthors].filter(a => a.totalTipped > 0).sort((a, b) => b.totalTipped - a.totalTipped).slice(0, 20)
  , [baseAuthors])

  const nuovePromesse = useMemo(() =>
    baseAuthors.filter(a => now - new Date(a.created_at).getTime() <= NEW_AUTHOR_WINDOW_MS && a.totalBooks >= 1)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)
  , [baseAuthors, now])

  // Dedup: ogni autore appare nella prima sezione dove è idoneo
  const shown = new Set<string>()
  const dedup = (list: AuthorEntry[]) => {
    const out: AuthorEntry[] = []
    for (const a of list) {
      if (shown.has(a.id)) continue
      shown.add(a.id)
      out.push(a)
    }
    return out
  }
  const recommendedD = dedup(recommended)
  const topVotatiD = dedup(topVotati)
  const topSupportatiD = dedup(topSupportati)
  const nuovePromesseD = dedup(nuovePromesse)

  const isDiscoveryMode = viewTab === 'scopri' && !search

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* ── Sticky filter bar ── */}
      <div
        className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-2.5 border-b border-sage-100/50 dark:border-sage-800/40"
        style={{ backgroundColor: 'color-mix(in srgb, var(--background) 88%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300 dark:text-sage-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca autore..."
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-sage-200 dark:border-sage-700 focus:border-sage-400 dark:focus:border-sage-500 focus:ring-2 focus:ring-sage-200 dark:focus:ring-sage-700 outline-none transition-all text-sm bg-white dark:bg-[#252525] dark:text-gray-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-bark-300 hover:text-bark-500 dark:text-sage-500 dark:hover:text-sage-300" />
              </button>
            )}
          </div>
        </div>
        {/* Tabs scrollabili orizzontalmente su mobile */}
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {([
            { key: 'scopri' as ViewTab, label: '✨ Scopri' },
            { key: 'seguiti' as ViewTab, label: `Seguiti${followedIds.length > 0 ? ` (${followedIds.length})` : ''}` },
            { key: 'nuovi' as ViewTab, label: '🌱 Nuovi' },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setViewTab(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${viewTab === key ? 'bg-sage-600 text-white' : 'text-bark-500 dark:text-[#b0b0b0] hover:bg-sage-100 dark:hover:bg-[#2e2e2e]'}`}
            >{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-5 w-48 bg-sage-100 dark:bg-sage-800 rounded mb-3 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-48 bg-sage-50 dark:bg-sage-800/40 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : isDiscoveryMode ? (
        <div className="mt-5 space-y-8">
          <Section
            icon={<Sparkles className="w-4 h-4 text-amber-500" />}
            title="Consigliati per te"
            subtitle="In base ai tuoi generi preferiti"
            authors={recommendedD}
            user={user}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
          />
          <Section
            icon={<TrendingUp className="w-4 h-4 text-rose-500" />}
            title="I Più Votati"
            subtitle="Gli autori con più like, commenti, letture e sblocchi"
            authors={topVotatiD}
            user={user}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
          />
          <Section
            icon={<Gift className="w-4 h-4 text-amber-500" />}
            title="I Più Supportati"
            subtitle="Autori che hanno ricevuto più mance e boost"
            authors={topSupportatiD}
            user={user}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
          />
          <Section
            icon={<Star className="w-4 h-4 text-emerald-500" />}
            title="Nuove Promesse"
            subtitle="Iscritti negli ultimi 30 giorni con almeno un libro"
            authors={nuovePromesseD}
            user={user}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
          />

          {recommendedD.length === 0 && topVotatiD.length === 0 && topSupportatiD.length === 0 && nuovePromesseD.length === 0 && (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
              <p className="text-bark-500 dark:text-sage-400 text-lg">Nessun autore trovato</p>
            </div>
          )}
        </div>

      ) : (
        <div className="mt-6">
          {baseAuthors.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
              <p className="text-bark-500 dark:text-sage-400 text-lg">
                {viewTab === 'seguiti' ? 'Non segui ancora nessun autore' : 'Nessun autore trovato'}
              </p>
              <p className="text-bark-400 dark:text-sage-500 text-sm mt-1">
                {viewTab === 'seguiti'
                  ? 'Vai su "Scopri" e inizia a seguire gli autori che ti piacciono!'
                  : 'Prova a modificare la ricerca'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
              {[...baseAuthors]
                .sort((a, b) => b.total_xp - a.total_xp)
                .map(a => (
                  <AuthorCard key={a.id} author={a} user={user} isFollowing={followedIds.includes(a.id)} onToggleFollow={toggleFollow} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Section: titolo + grid uniforme
// ============================================
function Section({
  icon, title, subtitle, authors, user, followedIds, onToggleFollow,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  authors: AuthorEntry[]
  user: any
  followedIds: string[]
  onToggleFollow: (id: string) => void
}) {
  if (authors.length === 0) return null
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base sm:text-lg font-bold text-sage-900 dark:text-sage-100 flex items-center gap-2">
          {icon} {title}
        </h2>
        <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
        {authors.map(a => (
          <AuthorCard
            key={a.id}
            author={a}
            user={user}
            isFollowing={followedIds.includes(a.id)}
            onToggleFollow={onToggleFollow}
          />
        ))}
      </div>
    </section>
  )
}

// ============================================
// AuthorCard: bianca, piatta, moderna
// ============================================
function AuthorCard({
  author, user, isFollowing, onToggleFollow,
}: {
  author: AuthorEntry
  user: any
  isFollowing: boolean
  onToggleFollow: (id: string) => void
}) {
  const router = useRouter()
  const displayName = author.author_pseudonym || author.name
  const initial = (displayName || '?').charAt(0).toUpperCase()
  const profileHref = `/profile/${author.username || author.id}`

  const isCertified = author.certifiedIn.length > 0
  const certMacro = isCertified
    ? MACRO_AREAS.find(m => m.value === author.certifiedIn[0])
    : undefined
  const isTopAuthor = author.total_xp >= TOP_XP_THRESHOLD

  const isSelf = user && user.id === author.id

  const go = (e: React.MouseEvent) => {
    // Ignora click se arrivano dal bottone o link figli
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    router.push(profileHref)
  }

  const avgLabel = author.avgRating ? author.avgRating.toFixed(1) : '—'

  return (
    <div
      onClick={go}
      className="group relative flex flex-col items-center bg-white dark:bg-[#1e221c] border border-sage-100 dark:border-sage-800 rounded-2xl p-2 sm:p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer h-full"
    >
      {/* Badges angolo top-right */}
      {(isCertified || isTopAuthor) && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {isCertified && certMacro && (
            <span
              title={`Autore Certificato in ${certMacro.label}`}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 border border-amber-500/80 shadow-sm"
            >
              <Award className="w-3 h-3 text-amber-900" strokeWidth={2.5} />
            </span>
          )}
          {!isCertified && isTopAuthor && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-400/90 text-amber-900 text-[9px] font-black tracking-wide uppercase">
              TOP
            </span>
          )}
        </div>
      )}

      {/* Avatar con bordo colorato */}
      <Link href={profileHref} className="block">
        <div
          className={`rounded-full overflow-hidden flex items-center justify-center bg-sage-100 dark:bg-sage-700 w-14 h-14 sm:w-20 sm:h-20 border-2 ${
            isFollowing
              ? 'border-sage-500'
              : 'border-sage-200 dark:border-sage-700'
          } transition-colors`}
        >
          {author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg sm:text-2xl font-bold text-sage-600 dark:text-sage-300">{initial}</span>
          )}
        </div>
      </Link>

      {/* Nome + username */}
      <Link href={profileHref} className="mt-2 w-full text-center">
        <h3 className="font-bold text-sage-900 dark:text-sage-100 text-sm sm:text-base truncate leading-tight">
          {displayName || 'Anonimo'}
        </h3>
        {author.username && (
          <p className="text-[11px] sm:text-xs text-bark-400 dark:text-sage-500 truncate mt-0.5">
            @{author.username}
          </p>
        )}
      </Link>

      {/* Stat row */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-2 text-[11px] sm:text-xs text-bark-500 dark:text-sage-400 w-full">
        <span className="inline-flex items-center gap-0.5" title="Libri pubblicati">
          <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="font-semibold">{author.totalBooks}</span>
        </span>
        <span className="inline-flex items-center gap-0.5" title="Follower">
          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="font-semibold">{author.totalFollowers}</span>
        </span>
        <span className="inline-flex items-center gap-0.5" title="Voto medio">
          <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${author.avgRating ? 'text-amber-400 fill-amber-400' : ''}`} />
          <span className="font-semibold">{avgLabel}</span>
        </span>
      </div>

      {/* CTA */}
      <div className="mt-auto pt-3 w-full">
        {isSelf ? (
          <Link
            href="/dashboard/profilo-autore"
            className="flex items-center justify-center gap-1 w-full rounded-full text-[11px] sm:text-xs font-semibold text-sage-700 dark:text-sage-300 border border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors h-8 sm:h-10"
          >
            <Pencil className="w-3 h-3" /> Modifica
          </Link>
        ) : user ? (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleFollow(author.id) }}
            className={`w-full rounded-full text-[11px] sm:text-xs font-semibold transition-colors h-8 sm:h-10 flex items-center justify-center gap-1 ${
              isFollowing
                ? 'bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-200 hover:bg-sage-200 dark:hover:bg-sage-700'
                : 'bg-sage-500 text-white hover:bg-sage-600'
            }`}
          >
            {isFollowing && <Check className="w-3 h-3" />}
            {isFollowing ? 'Seguito' : 'Segui'}
          </button>
        ) : (
          <Link
            href={profileHref}
            className="flex items-center justify-center w-full rounded-full text-[11px] sm:text-xs font-semibold bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-sage-200 dark:hover:bg-sage-700 transition-colors h-8 sm:h-10"
          >
            Vedi profilo
          </Link>
        )}
      </div>
    </div>
  )
}
