'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Search, BookOpen, Users, X, Pencil, Award,
  Sparkles, TrendingUp, Star, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { MACRO_AREAS, getMacroAreaByGenre } from '@/lib/genres'
import { awardXp } from '@/lib/xp'
import { XP_VALUES } from '@/lib/badges'
import AuthorCardEditor from '@/components/authors/AuthorCardEditor'
import HorizontalCarousel from '@/components/ui/HorizontalCarousel'
import {
  CardColorPreset,
  getPreset,
  presetFromMacros,
} from '@/components/authors/authorCardBg'
import { getRank } from '@/components/authors/authorRank'

const CERT_MIN_BOOKS = 3
const CERT_MIN_XP = 2400
const CERT_MIN_LIKES = 50
const NEW_AUTHOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

type ViewTab = 'scopri' | 'seguiti' | 'nuovi'

interface AuthorEntry {
  id: string
  name: string | null
  username: string | null
  author_pseudonym: string | null
  author_bio: string | null
  avatar_url: string | null
  author_banner_url: string | null
  profile_card_color: CardColorPreset | null
  created_at: string
  total_xp: number
  totalBooks: number
  totalLikes: number
  totalComments: number
  totalUnlocks: number
  totalReads: number
  totalFollowers: number
  engagementScore: number
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
  const [editorOpen, setEditorOpen] = useState(false)
  const { user, profile } = useAuth()
  const supabase = createClient()

  const fetchAuthors = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('id, name, username, author_pseudonym, author_bio, avatar_url, author_banner_url, profile_card_color, created_at, total_xp')
      .eq('is_author', true)
    if (search) query = query.or(`author_pseudonym.ilike.%${search}%,name.ilike.%${search}%`)
    const { data } = await query
    if (data && data.length > 0) {
      const authorIds = data.map((a: any) => a.id)
      const [allBooksRes, followersRes] = await Promise.all([
        supabase.from('books')
          .select('id, author_id, total_likes, total_reads, genre, status, average_rating, total_reviews')
          .in('author_id', authorIds)
          .in('status', ['published', 'ongoing', 'completed']),
        supabase.from('follows').select('following_id').in('following_id', authorIds),
      ])
      const allBooks = allBooksRes.data || []
      const allFollows = followersRes.data || []

      const bookIds = allBooks.map((b: any) => b.id)
      const commentsPerBook = new Map<string, number>()
      const unlocksPerBook = new Map<string, number>()
      if (bookIds.length > 0) {
        const [commentsRes, unlocksRes] = await Promise.all([
          supabase.from('comments').select('book_id').in('book_id', bookIds),
          supabase.from('block_unlocks').select('book_id').in('book_id', bookIds),
        ])
        for (const c of commentsRes.data || []) commentsPerBook.set(c.book_id, (commentsPerBook.get(c.book_id) || 0) + 1)
        for (const u of unlocksRes.data || []) unlocksPerBook.set(u.book_id, (unlocksPerBook.get(u.book_id) || 0) + 1)
      }

      const booksByAuthor = new Map<string, any[]>()
      for (const b of allBooks) { const list = booksByAuthor.get(b.author_id) || []; list.push(b); booksByAuthor.set(b.author_id, list) }
      const followersCount = new Map<string, number>()
      for (const f of allFollows) followersCount.set(f.following_id, (followersCount.get(f.following_id) || 0) + 1)

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
        const macroMatch = a.genres.some(g => { const m = getMacroAreaByGenre(g); return m ? targetMacros.has(m.value) : false })
        return directMatch || macroMatch
      })
      if (matched.length > 0) return [...matched].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20)
    }
    return [...baseAuthors].filter(a => excludeSelf(a) && a.totalBooks >= 1)
      .sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20)
  }, [baseAuthors, profile?.preferred_genres, userReadGenres, user])

  const topVotati = useMemo(() =>
    [...baseAuthors].filter(a => a.engagementScore > 0).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20)
  , [baseAuthors])

  const nuovePromesse = useMemo(() =>
    baseAuthors.filter(a => now - new Date(a.created_at).getTime() <= NEW_AUTHOR_WINDOW_MS && a.totalBooks >= 1)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)
  , [baseAuthors, now])

  // Dedup
  const shown = new Set<string>()
  const dedup = (list: AuthorEntry[]) => {
    const out: AuthorEntry[] = []
    for (const a of list) {
      if (shown.has(a.id)) continue
      shown.add(a.id); out.push(a)
    }
    return out
  }
  const recommendedD = dedup(recommended)
  const topVotatiD = dedup(topVotati)
  const nuovePromesseD = dedup(nuovePromesse)

  const isDiscoveryMode = viewTab === 'scopri' && !search
  const myEntry = user ? authors.find(a => a.id === user.id) : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

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
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="flex-shrink-0 w-[120px] sm:w-[140px] lg:w-[150px] h-[180px] sm:h-[200px] lg:h-[210px] bg-sage-50 dark:bg-sage-800/40 rounded-2xl animate-pulse" />
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
            onEditSelf={() => setEditorOpen(true)}
          />
          <Section
            icon={<TrendingUp className="w-4 h-4 text-rose-500" />}
            title="I più votati"
            subtitle="Gli autori con più like, commenti e letture"
            authors={topVotatiD}
            user={user}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
            onEditSelf={() => setEditorOpen(true)}
          />
          <Section
            icon={<Star className="w-4 h-4 text-emerald-500" />}
            title="Nuove promesse"
            subtitle="Scopri chi ha iniziato a pubblicare di recente"
            authors={nuovePromesseD}
            user={user}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
            onEditSelf={() => setEditorOpen(true)}
          />

          {recommendedD.length === 0 && topVotatiD.length === 0 && nuovePromesseD.length === 0 && (
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
            <HorizontalCarousel>
              {[...baseAuthors]
                .sort((a, b) => b.total_xp - a.total_xp)
                .map(a => (
                  <div key={a.id} className="flex-shrink-0 w-[120px] sm:w-[140px] lg:w-[150px]">
                    <AuthorCard
                      author={a}
                      user={user}
                      isFollowing={followedIds.includes(a.id)}
                      onToggleFollow={toggleFollow}
                      onEditSelf={() => setEditorOpen(true)}
                    />
                  </div>
                ))}
            </HorizontalCarousel>
          )}
        </div>
      )}

      {/* Editor proprietario */}
      {user && myEntry && (
        <AuthorCardEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          defaults={{
            name: myEntry.name,
            username: myEntry.username,
            author_pseudonym: myEntry.author_pseudonym,
            author_bio: myEntry.author_bio,
            avatar_url: myEntry.avatar_url,
            profile_card_color: myEntry.profile_card_color,
            total_xp: myEntry.total_xp,
            booksByMacro: myEntry.booksByMacro,
            totalBooks: myEntry.totalBooks,
            totalFollowers: myEntry.totalFollowers,
            avgRating: myEntry.avgRating,
          }}
          onSaved={fetchAuthors}
        />
      )}
    </div>
  )
}

// ============================================
// Section
// ============================================
function Section({
  icon, title, subtitle, authors, user, followedIds, onToggleFollow, onEditSelf,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  authors: AuthorEntry[]
  user: any
  followedIds: string[]
  onToggleFollow: (id: string) => void
  onEditSelf: () => void
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
      <HorizontalCarousel>
        {authors.map(a => (
          <div key={a.id} className="flex-shrink-0 w-[120px] sm:w-[140px] lg:w-[150px]">
            <AuthorCard
              author={a}
              user={user}
              isFollowing={followedIds.includes(a.id)}
              onToggleFollow={onToggleFollow}
              onEditSelf={onEditSelf}
            />
          </div>
        ))}
      </HorizontalCarousel>
    </section>
  )
}

// ============================================
// AuthorCard — verticale 2:3, altezza fissa, slot fissi
// ============================================
function AuthorCard({
  author, user, isFollowing, onToggleFollow, onEditSelf,
}: {
  author: AuthorEntry
  user: any
  isFollowing: boolean
  onToggleFollow: (id: string) => void
  onEditSelf: () => void
}) {
  const router = useRouter()
  const displayName = author.author_pseudonym || author.name || 'Anonimo'
  const initial = (displayName || '?').charAt(0).toUpperCase()
  const profileHref = `/profile/${author.username || author.id}`
  const isSelf = user && user.id === author.id

  const preset = getPreset(author.profile_card_color || presetFromMacros(author.booksByMacro))
  const rank = getRank(author.total_xp)
  const isCertified = author.certifiedIn.length > 0
  const certMacro = isCertified ? MACRO_AREAS.find(m => m.value === author.certifiedIn[0]) : undefined

  const go = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    router.push(profileHref)
  }

  return (
    <div
      onClick={go}
      className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer h-[180px] sm:h-[200px] lg:h-[210px] w-full flex flex-col items-center px-1.5 pt-2 pb-1.5 text-white"
      style={{ background: preset.gradient }}
    >
      {/* Overlay leggibilità */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />

      {/* Top-right badges + pencil */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
        {isCertified && certMacro && (
          <span
            title={`Autore Certificato in ${certMacro.label}`}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 border border-amber-500/80 shadow-sm"
          >
            <Award className="w-2.5 h-2.5 text-amber-900" strokeWidth={2.5} />
          </span>
        )}
        {isSelf && (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditSelf() }}
            title="Personalizza profilo"
            className="w-5 h-5 rounded-full bg-white/25 hover:bg-white/45 backdrop-blur flex items-center justify-center transition-colors"
          >
            <Pencil className="w-2.5 h-2.5 text-white" />
          </button>
        )}
      </div>

      {/* Zona avatar — alta 50px */}
      <div className="relative z-10 flex items-center justify-center" style={{ height: 50 }}>
        <Link href={profileHref} onClick={(e) => e.stopPropagation()} className="block">
          <div
            className={`rounded-full overflow-hidden flex items-center justify-center bg-white/20 w-10 h-10 border-2 ${
              isFollowing ? 'border-emerald-300' : 'border-white/70'
            }`}
          >
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{initial}</span>
            )}
          </div>
        </Link>
      </div>

      {/* Zona nome — 1 riga */}
      <h3
        className="relative z-10 font-bold text-[11px] text-center leading-tight px-0.5 w-full truncate"
        style={{ height: 14 }}
        title={displayName}
      >
        {displayName}
      </h3>

      {/* Zona @username — 1 riga */}
      <p
        className="relative z-10 text-[10px] text-white/70 text-center truncate w-full"
        style={{ height: 13 }}
      >
        {author.username ? `@${author.username}` : '\u00A0'}
      </p>

      {/* Zona bio — 2 righe */}
      <p
        className="relative z-10 text-[10px] text-white/85 text-center line-clamp-2 w-full px-0.5 mt-0.5 leading-tight"
        style={{ height: 24 }}
      >
        {author.author_bio ? author.author_bio.slice(0, 60) : '\u00A0'}
      </p>

      {/* Zona badge rank */}
      <div className="relative z-10 flex items-center justify-center mt-1" style={{ height: 16 }}>
        <span className={`inline-flex items-center px-1.5 rounded-full text-[9px] font-bold leading-tight ${rank.chip}`} style={{ paddingTop: 1, paddingBottom: 1 }}>
          {rank.label}
        </span>
      </div>

      {/* Zona statistiche */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 text-[10px] text-white/95 mt-0.5" style={{ height: 14 }}>
        <span className="inline-flex items-center gap-0.5" title="Libri pubblicati">
          <BookOpen className="w-2.5 h-2.5" />
          <span className="font-semibold">{author.totalBooks}</span>
        </span>
        <span className="inline-flex items-center gap-0.5" title="Follower">
          <Users className="w-2.5 h-2.5" />
          <span className="font-semibold">{author.totalFollowers}</span>
        </span>
        <span className="inline-flex items-center gap-0.5" title="Voto medio">
          <Star className={`w-2.5 h-2.5 ${author.avgRating ? 'text-amber-300 fill-amber-300' : ''}`} />
          <span className="font-semibold">{author.avgRating ? author.avgRating.toFixed(1) : '—'}</span>
        </span>
      </div>

      {/* Zona bottone */}
      <div className="relative z-10 mt-auto w-full pt-1">
        {isSelf ? (
          <Link
            href="/dashboard/profilo-autore"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-0.5 w-full rounded-full text-[10px] font-semibold text-white border border-white/50 hover:bg-white/15 transition-colors h-6"
          >
            <Pencil className="w-2.5 h-2.5" /> Modifica
          </Link>
        ) : user ? (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleFollow(author.id) }}
            className={`w-full rounded-full text-[10px] font-bold transition-colors h-6 flex items-center justify-center gap-0.5 ${
              isFollowing
                ? 'bg-white/25 text-white hover:bg-white/35 backdrop-blur'
                : 'bg-white text-sage-800 hover:bg-amber-100'
            }`}
          >
            {isFollowing && <Check className="w-2.5 h-2.5" />}
            {isFollowing ? 'Seguito' : 'Segui'}
          </button>
        ) : (
          <Link
            href={profileHref}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-full rounded-full text-[10px] font-semibold bg-white/25 text-white hover:bg-white/35 transition-colors h-6"
          >
            Profilo
          </Link>
        )}
      </div>
    </div>
  )
}
