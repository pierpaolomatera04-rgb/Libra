'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Search, BookOpen, Users, X, Pencil, Award, Heart, MessageCircle, Gift,
  ChevronLeft, ChevronRight, Sparkles, TrendingUp, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { MACRO_AREAS, getMacroAreaByGenre, type MacroArea } from '@/lib/genres'

const CERT_MIN_BOOKS = 3
const CERT_MIN_PRESTIGE = 100
const CERT_MIN_LIKES = 50
const TOP_PRESTIGE_THRESHOLD = 50
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
  prestige_points: number
  totalBooks: number
  totalLikes: number
  totalComments: number
  totalUnlocks: number
  totalReads: number
  totalFollowers: number
  engagementScore: number
  totalTipped: number
  genres: string[]
  booksByMacro: Record<string, number>
  certifiedIn: string[]
}

/* Carosello orizzontale (stesso pattern della pagina Sfoglia) */
function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const check = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 0)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => {
    check()
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', check)
    return () => el?.removeEventListener('scroll', check)
  }, [children])
  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }
  return (
    <div className="relative group/carousel">
      {canLeft && (
        <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 dark:bg-[#1e221c]/90 backdrop-blur border border-sage-200 dark:border-sage-700 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity">
          <ChevronLeft className="w-5 h-5 text-sage-700 dark:text-sage-300" />
        </button>
      )}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {children}
      </div>
      {canRight && (
        <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 dark:bg-[#1e221c]/90 backdrop-blur border border-sage-200 dark:border-sage-700 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5 text-sage-700 dark:text-sage-300" />
        </button>
      )}
    </div>
  )
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
      .select('id, name, username, author_pseudonym, author_bio, avatar_url, author_banner_url, created_at, prestige_points')
      .eq('is_author', true)
    if (search) query = query.or(`author_pseudonym.ilike.%${search}%,name.ilike.%${search}%`)
    const { data } = await query
    if (data && data.length > 0) {
      const authorIds = data.map((a: any) => a.id)
      const [allBooksRes, followersRes, donationsRes] = await Promise.all([
        supabase.from('books').select('id, author_id, total_likes, total_reads, genre, status').in('author_id', authorIds).in('status', ['published', 'ongoing', 'completed']),
        supabase.from('follows').select('following_id').in('following_id', authorIds),
        supabase.from('donations').select('author_id, amount').in('author_id', authorIds).gte('amount', 5),
      ])
      const allBooks = allBooksRes.data || []
      const allFollows = followersRes.data || []
      const allDonations = donationsRes.data || []

      // Bulk: commenti e sblocchi sui libri degli autori
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
        const booksByMacro: Record<string, number> = {}
        const genres = new Set<string>()
        for (const b of books) {
          totalLikes += b.total_likes || 0
          totalReads += b.total_reads || 0
          totalComments += commentsPerBook.get(b.id) || 0
          totalUnlocks += unlocksPerBook.get(b.id) || 0
          if (b.genre) genres.add(b.genre)
          const macro = getMacroAreaByGenre(b.genre)
          if (macro) booksByMacro[macro.value] = (booksByMacro[macro.value] || 0) + 1
        }
        const prestige = a.prestige_points || 0
        const meetsGlobal = prestige >= CERT_MIN_PRESTIGE && totalLikes >= CERT_MIN_LIKES
        const certifiedIn = meetsGlobal
          ? Object.entries(booksByMacro).filter(([, count]) => count >= CERT_MIN_BOOKS).map(([value]) => value)
          : []
        const engagementScore = totalLikes + totalComments + totalReads + totalUnlocks
        return {
          ...a,
          prestige_points: prestige,
          totalBooks: books.length,
          totalLikes,
          totalComments,
          totalUnlocks,
          totalReads,
          totalFollowers: followersCount.get(a.id) || 0,
          engagementScore,
          totalTipped: tippedByAuthor.get(a.id) || 0,
          genres: Array.from(genres),
          booksByMacro,
          certifiedIn,
        }
      })
      setAuthors(enriched)
    } else { setAuthors([]) }

    // Generi letti dall'utente negli ultimi 30 giorni (per "Consigliati per te")
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
    }
  }

  const now = useMemo(() => Date.now(), [])

  const baseAuthors = useMemo(() => {
    if (viewTab === 'seguiti') return authors.filter(a => followedIds.includes(a.id))
    if (viewTab === 'nuovi') return authors.filter(a => now - new Date(a.created_at).getTime() <= NEW_AUTHOR_WINDOW_MS)
    return authors
  }, [authors, viewTab, followedIds, now])

  // "Consigliati per te": priorità generi letti ultimi 30gg → preferred_genres →
  // fallback: autori con libri pubblicati ordinati per engagement (così la sezione
  // compare sempre anche per utenti nuovi/ospiti).
  const recommended = useMemo(() => {
    let targetGenres: Set<string> | null = null
    if (userReadGenres.size > 0) {
      targetGenres = userReadGenres
    } else {
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

    // Fallback: top autori per engagement con almeno 1 libro pubblicato
    return [...baseAuthors]
      .filter(a => excludeSelf(a) && a.totalBooks >= 1)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 20)
  }, [baseAuthors, profile?.preferred_genres, userReadGenres, user])

  // "I Più Votati" → ora basato su engagement score (like + commenti + letture + sblocchi)
  const topVotati = useMemo(() =>
    [...baseAuthors].filter(a => a.engagementScore > 0).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20)
  , [baseAuthors])

  // "I Più Supportati" → autori che hanno ricevuto più mance (≥5 token) e boost
  const topSupportati = useMemo(() =>
    [...baseAuthors].filter(a => a.totalTipped > 0).sort((a, b) => b.totalTipped - a.totalTipped).slice(0, 20)
  , [baseAuthors])

  const nuovePromesse = useMemo(() =>
    baseAuthors.filter(a => now - new Date(a.created_at).getTime() <= NEW_AUTHOR_WINDOW_MS && a.totalBooks >= 1)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)
  , [baseAuthors, now])

  const isDiscoveryMode = viewTab === 'scopri' && !search

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* ── Sticky filter bar ── */}
      <div
        className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-2.5 border-b border-sage-100/50 dark:border-sage-800/40"
        style={{ backgroundColor: 'color-mix(in srgb, var(--background) 88%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* Search */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 sm:max-w-xs">
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
        {/* Tabs */}
        <div className="flex items-center gap-1" style={{ scrollbarWidth: 'none' }}>
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

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="mt-5 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-5 w-48 bg-sage-100 dark:bg-sage-800 rounded mb-3 animate-pulse" />
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="flex-shrink-0 bg-sage-50 dark:bg-sage-800/40 rounded-2xl animate-pulse" style={{ width: '140px', aspectRatio: '2/3' }} />
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : isDiscoveryMode ? (
        /* ── Discovery mode: 3 sezioni a carosello ── */
        <div className="mt-5 space-y-8">

          {/* ✨ Consigliati per te */}
          {recommended.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-sage-900 dark:text-sage-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Consigliati per te
                  </h2>
                  <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">In base ai tuoi generi preferiti</p>
                </div>
              </div>
              <HorizontalCarousel>
                {recommended.map(a => (
                  <div key={a.id} className="flex-shrink-0"><AuthorCard author={a} user={user} isFollowing={followedIds.includes(a.id)} onToggleFollow={toggleFollow} /></div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* 🏆 I Più Votati */}
          {topVotati.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-sage-900 dark:text-sage-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-500" /> I Più Votati
                  </h2>
                  <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">Gli autori con più like, commenti, letture e sblocchi</p>
                </div>
              </div>
              <HorizontalCarousel>
                {topVotati.map(a => (
                  <div key={a.id} className="flex-shrink-0"><AuthorCard author={a} user={user} isFollowing={followedIds.includes(a.id)} onToggleFollow={toggleFollow} /></div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* 🎁 I Più Supportati */}
          {topSupportati.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-sage-900 dark:text-sage-100 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500" /> I Più Supportati
                  </h2>
                  <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">Autori che hanno ricevuto più mance (≥5 token) e boost dai lettori</p>
                </div>
              </div>
              <HorizontalCarousel>
                {topSupportati.map(a => (
                  <div key={a.id} className="flex-shrink-0"><AuthorCard author={a} user={user} isFollowing={followedIds.includes(a.id)} onToggleFollow={toggleFollow} /></div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* 🌟 Nuove Promesse */}
          {nuovePromesse.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-sage-900 dark:text-sage-100 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-500" /> Nuove Promesse
                  </h2>
                  <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">Iscritti negli ultimi 30 giorni con almeno un libro pubblicato</p>
                </div>
              </div>
              <HorizontalCarousel>
                {nuovePromesse.map(a => (
                  <div key={a.id} className="flex-shrink-0"><AuthorCard author={a} user={user} isFollowing={followedIds.includes(a.id)} onToggleFollow={toggleFollow} /></div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* Fallback se non ci sono sezioni */}
          {recommended.length === 0 && topVotati.length === 0 && topSupportati.length === 0 && nuovePromesse.length === 0 && (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-sage-200 dark:text-sage-700 mx-auto mb-4" />
              <p className="text-bark-500 dark:text-sage-400 text-lg">Nessun autore trovato</p>
            </div>
          )}
        </div>

      ) : (
        /* ── Grid mode: ricerca attiva o tab Seguiti/Nuovi ── */
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {[...baseAuthors]
                .sort((a, b) => b.prestige_points - a.prestige_points)
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
// COMPONENT: AuthorCard
// ============================================
// ============================================
// COMPONENT: AuthorCard - formato 2:3, full-bleed con overlay
// ============================================
function AuthorCard({
  author, highlightedMacro, user, isFollowing, onToggleFollow,
}: {
  author: AuthorEntry
  highlightedMacro?: MacroArea
  user: any
  isFollowing: boolean
  onToggleFollow: (id: string) => void
}) {
  const displayName = author.author_pseudonym || author.name
  const initial = (displayName || '?').charAt(0).toUpperCase()
  const profileHref = `/profile/${author.username || author.id}`

  const certMacroValue = highlightedMacro && author.certifiedIn.includes(highlightedMacro.value)
    ? highlightedMacro.value
    : author.certifiedIn[0]
  const certMacro = certMacroValue
    ? MACRO_AREAS.find(m => m.value === certMacroValue)
    : undefined
  const isCertified = !!certMacro
  const isTopAuthor = author.prestige_points >= TOP_PRESTIGE_THRESHOLD
  const goldGlow = isTopAuthor
    ? 'shadow-[0_14px_36px_rgba(251,191,36,0.38)]' : ''

  return (
    <div
      className={`group snap-start flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-[5px] ${goldGlow}`}
      style={{ width: '140px', aspectRatio: '2/3' }}
    >
      {/* Background: banner o gradiente */}
      <Link href={profileHref} className="absolute inset-0 block">
        {author.author_banner_url ? (
          <img src={author.author_banner_url} alt="" className="w-full h-full object-cover" />
        ) : author.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(160deg, #4A6F62 0%, #7a9e6e 45%, #D8E3D8 100%)' }}
          />
        )}
        {/* Dark overlay dal basso */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </Link>

      {/* Badges angolo in alto a destra */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
        {isCertified && certMacro && (
          <span
            title={`Autore Certificato in ${certMacro.label}`}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 border border-amber-500/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          >
            <Award className="w-3.5 h-3.5 text-amber-900" strokeWidth={2.5} />
          </span>
        )}
        {!isCertified && isTopAuthor && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-400/90 text-amber-900 text-[9px] font-black tracking-wide uppercase">
            TOP
          </span>
        )}
      </div>

      {/* Avatar centrato */}
      <Link href={profileHref} className="absolute left-1/2 -translate-x-1/2 top-[18%] z-10 block">
        <div className="w-16 h-16 rounded-full border-[3px] border-white/80 overflow-hidden bg-sage-200 dark:bg-sage-700 flex items-center justify-center shadow-lg">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-sage-600">{initial}</span>
          )}
        </div>
      </Link>

      {/* Info overlay in basso */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-2.5 pb-2.5 pt-6">
        <Link href={profileHref}>
          <h3 className="font-bold text-white text-xs text-center truncate leading-tight group-hover:text-amber-200 transition-colors">
            {displayName}
          </h3>
        </Link>
        {author.username && (
          <p className="text-[9px] text-white/60 text-center truncate mt-0.5">@{author.username}</p>
        )}
        <div className="flex items-center justify-center gap-2 mt-1.5 text-[9px] text-white/70">
          <span className="flex items-center gap-0.5" title="Libri pubblicati">
            <BookOpen className="w-2.5 h-2.5" /> {author.totalBooks}
          </span>
          <span className="flex items-center gap-0.5 text-rose-300" title="Like totali">
            <Heart className="w-2.5 h-2.5" /> {author.totalLikes}
          </span>
          <span className="flex items-center gap-0.5 text-sky-300" title="Commenti totali">
            <MessageCircle className="w-2.5 h-2.5" /> {author.totalComments}
          </span>
          {author.prestige_points > 0 && (
            <span className="flex items-center gap-0.5 text-amber-300" title="Punti Prestigio">
              <Award className="w-2.5 h-2.5" /> {author.prestige_points}
            </span>
          )}
        </div>
        <div className="mt-2">
          {user && user.id === author.id ? (
            <Link
              href="/dashboard/profilo-autore"
              className="flex items-center justify-center gap-1 w-full px-2 py-1 rounded-full text-[10px] font-semibold text-white/80 hover:text-white border border-white/30 hover:border-white/60 transition-colors bg-white/10"
            >
              <Pencil className="w-2.5 h-2.5" /> Modifica
            </Link>
          ) : user ? (
            <button
              onClick={(e) => { e.preventDefault(); onToggleFollow(author.id) }}
              className={`w-full px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${isFollowing ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-sage-800 hover:bg-amber-100'}`}
            >
              {isFollowing ? 'Seguito' : 'Segui'}
            </button>
          ) : (
            <Link href={profileHref} className="block text-center w-full px-2 py-1 rounded-full text-[10px] font-semibold bg-white/20 text-white hover:bg-white/30 transition-colors">
              Vedi profilo
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
