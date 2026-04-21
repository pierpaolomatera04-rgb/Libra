'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Trophy, Loader2, Crown, BookOpen,
  Users, TrendingUp, Heart, Eye, Sparkles,
  Layers, UserPlus, Zap, Coins, MessageCircle, PenTool,
} from 'lucide-react'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { getXpLevel, getRankTier, type RankTier } from '@/lib/badges'

type MainTab = 'libri' | 'autori' | 'community'
type BookFilter = 'reads' | 'likes' | 'trending' | 'new' | 'serializing'
type AuthorFilter = 'followers' | 'reads' | 'active' | 'new'
type CommunityFilter = 'xp' | 'active' | 'donors'

// Colori podio: oro / argento / bronzo
const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const

// Formattatori
const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n ?? 0}`

// Rank number compatto (proporzionato all'altezza card)
function RankColumn({ index }: { index: number }) {
  const isPodium = index < 3
  return (
    <div className="flex-shrink-0 w-10 flex items-center justify-center">
      <span
        className={`font-extrabold leading-none select-none ${
          isPodium ? 'text-xl sm:text-2xl' : 'text-base text-bark-300 dark:text-sage-600'
        }`}
        style={isPodium ? {
          color: PODIUM_COLORS[index],
          textShadow: '0 1px 2px rgba(0,0,0,0.08)',
        } : undefined}
      >
        {index + 1}
      </span>
    </div>
  )
}

function rankStyle(index: number) {
  if (index === 0) return 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
  if (index === 1) return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700'
  if (index === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800'
  return 'bg-white dark:bg-[#1e221c] border-sage-100 dark:border-sage-800'
}

// Pill riutilizzabile (stile coerente con /browse)
function Pill({ active, onClick, icon: Icon, label }: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
        active
          ? 'bg-sage-600 text-white'
          : 'text-bark-500 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-800'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

export default function ClassificaPage() {
  const supabase = createClient()
  const [mainTab, setMainTab] = useState<MainTab>('libri')
  const [bookFilter, setBookFilter] = useState<BookFilter>('reads')
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>('followers')
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>('xp')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const currentRpc = useMemo(() => {
    if (mainTab === 'libri') {
      return ({
        reads: 'leaderboard_books_reads',
        likes: 'leaderboard_books_likes',
        trending: 'leaderboard_books_trending',
        new: 'leaderboard_books_new',
        serializing: 'leaderboard_books_serializing',
      } as const)[bookFilter]
    }
    if (mainTab === 'autori') {
      return ({
        followers: 'leaderboard_authors_followers',
        reads: 'leaderboard_authors_reads',
        active: 'leaderboard_authors_active',
        new: 'leaderboard_authors_new',
      } as const)[authorFilter]
    }
    return ({
      xp: 'leaderboard_community_xp',
      active: 'leaderboard_community_active',
      donors: 'leaderboard_community_donors',
    } as const)[communityFilter]
  }, [mainTab, bookFilter, authorFilter, communityFilter])

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc(currentRpc, { p_limit: 20 })
      if (cancelled) return
      if (error) {
        console.error('Leaderboard RPC error:', currentRpc, error)
        setItems([])
      } else {
        setItems((data as any[]) || [])
      }
      setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [currentRpc, supabase])

  // ============================================
  // RENDER HELPERS
  // ============================================

  // ── Libro: riga in lista verticale (stesso layout di Autori/Community) ──
  const renderBookCard = (b: any, i: number) => {
    const authorName = b.author?.author_pseudonym || b.author?.name || b.author?.username || 'Autore'
    return (
      <Link
        key={b.id}
        href={`/libro/${b.id}`}
        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-shadow hover:shadow-md ${rankStyle(i)}`}
      >
        <RankColumn index={i} />
        {/* Copertina: stesso "slot" di un avatar, ma rettangolare 2/3 */}
        <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-sage-100 dark:bg-sage-800 border border-sage-200 dark:border-sage-700 shadow-sm">
          {b.cover_image_url ? (
            <img src={b.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-sage-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 truncate">{b.title}</p>
          <p className="text-xs text-bark-400 dark:text-sage-500 truncate">di {authorName}</p>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
              <Layers className="w-2.5 h-2.5" /> {b.total_blocks || 0}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
              <Heart className="w-2.5 h-2.5" /> {fmt(b.total_likes || 0)}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
              <MessageCircle className="w-2.5 h-2.5" /> {fmt(b.total_comments || 0)}
            </span>
            {bookFilter === 'trending' && b.is_boosted ? (
              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                <Zap className="w-2.5 h-2.5" /> BOOST
              </span>
            ) : null}
          </div>
        </div>
        {/* Metrica principale tab Libri: lettori totali */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-sage-50 dark:bg-sage-800 rounded-full border border-sage-100 dark:border-sage-700">
            <Eye className="w-3.5 h-3.5 text-sage-500" />
            <span className="text-xs font-bold text-sage-700 dark:text-sage-300">{fmt(b.total_reads || 0)}</span>
          </div>
        </div>
      </Link>
    )
  }

  const renderAuthorCard = (a: any, i: number) => {
    const displayName = a.author_pseudonym || a.name || a.username || 'Autore'
    return (
      <Link
        key={a.id}
        href={`/profile/${a.username || a.id}`}
        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-shadow hover:shadow-md ${rankStyle(i)}`}
      >
        <RankColumn index={i} />
        {a.avatar_url ? (
          <img src={a.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white dark:border-sage-700 shadow-sm" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-sage-200 dark:bg-sage-700 flex items-center justify-center text-base font-bold text-sage-600 dark:text-sage-300 flex-shrink-0 border-2 border-white dark:border-sage-700 shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-sage-900 dark:text-sage-100 truncate">{displayName}</p>
            <LevelBadge totalXp={a.total_xp ?? 0} size="xs" />
          </div>
          {a.username && (
            <p className="text-xs text-bark-400 dark:text-sage-500 truncate">@{a.username}</p>
          )}
          {/* Statistiche fisse: pagine lette + opere */}
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
              <Eye className="w-2.5 h-2.5" /> {fmt(a.total_reads || 0)} pagine lette
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
              <BookOpen className="w-2.5 h-2.5" /> {a.books_count || 0} opere
            </span>
          </div>
        </div>
        {/* Metrica principale tab Autori: follower */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-sage-50 dark:bg-sage-800 rounded-full border border-sage-100 dark:border-sage-700">
            <Users className="w-3.5 h-3.5 text-sage-500" />
            <span className="text-xs font-bold text-sage-700 dark:text-sage-300">{fmt(a.follower_count || 0)}</span>
          </div>
        </div>
      </Link>
    )
  }

  // Stile pill rank per tier
  const RANK_TIER_STYLES: Record<RankTier, { cls: string; label: string }> = {
    bronzo:   { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', label: 'Bronzo' },
    argento:  { cls: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200', label: 'Argento' },
    oro:      { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: 'Oro' },
    diamante: { cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', label: 'Diamante' },
  }

  const renderCommunityCard = (u: any, i: number) => {
    const { level } = getXpLevel(u.total_xp ?? 0)
    const tier = getRankTier(level)
    const tierStyle = RANK_TIER_STYLES[tier]
    const displayName = u.name || u.username || 'Utente'
    return (
      <Link
        key={u.id}
        href={`/profile/${u.username || u.id}`}
        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-shadow hover:shadow-md ${rankStyle(i)}`}
      >
        <RankColumn index={i} />
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white dark:border-sage-700 shadow-sm" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-sage-200 dark:bg-sage-700 flex items-center justify-center text-base font-bold text-sage-600 dark:text-sage-300 flex-shrink-0 border-2 border-white dark:border-sage-700 shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-semibold truncate ${
              level >= 50
                ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
                : 'text-sage-900 dark:text-sage-100'
            }`}>
              {displayName}
            </p>
            {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
          </div>
          {u.username && <p className="text-xs text-bark-400 dark:text-sage-500 truncate">@{u.username}</p>}
          {/* Statistiche fisse: livello + badge rank */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-0.5 text-[10px] text-bark-400 dark:text-sage-500">
              <Sparkles className="w-2.5 h-2.5" /> Livello {level}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tierStyle.cls}`}>
              {tierStyle.label}
            </span>
          </div>
        </div>
        {/* Metrica principale tab Community: XP */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-sage-50 to-emerald-50 dark:from-sage-800 dark:to-emerald-900/20 rounded-full border border-sage-100 dark:border-sage-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-sage-700 dark:text-sage-200">{fmt(u.total_xp || 0)} XP</span>
          </div>
        </div>
      </Link>
    )
  }

  const emptyState = (icon: any, title: string, hint: string) => {
    const Icon = icon
    return (
      <div className="text-center py-16 bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800">
        <Icon className="w-14 h-14 text-sage-200 dark:text-sage-700 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-sage-800 dark:text-sage-200 mb-1">{title}</h2>
        <p className="text-sm text-bark-400 dark:text-sage-500 px-4">{hint}</p>
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">Classifica</h1>
      </div>

      {/* Tab principali */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'libri', label: 'Libri', icon: BookOpen },
          { key: 'autori', label: 'Autori', icon: Sparkles },
          { key: 'community', label: 'Community', icon: Users },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              mainTab === key
                ? 'bg-sage-600 text-white'
                : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 border border-sage-100 dark:border-sage-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Sotto-filtri */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {mainTab === 'libri' && ([
          { key: 'reads' as BookFilter, label: 'Più letti', icon: Eye },
          { key: 'likes' as BookFilter, label: 'Più votati', icon: Heart },
          { key: 'trending' as BookFilter, label: 'In tendenza', icon: TrendingUp },
          { key: 'new' as BookFilter, label: 'Nuovi', icon: Sparkles },
          { key: 'serializing' as BookFilter, label: 'Serializzazioni', icon: Layers },
        ]).map(({ key, label, icon }) => (
          <Pill key={key} active={bookFilter === key} onClick={() => setBookFilter(key)} icon={icon} label={label} />
        ))}
        {mainTab === 'autori' && ([
          { key: 'followers' as AuthorFilter, label: 'Più seguiti', icon: Users },
          { key: 'reads' as AuthorFilter, label: 'Più letti', icon: Eye },
          { key: 'active' as AuthorFilter, label: 'Più attivi', icon: PenTool },
          { key: 'new' as AuthorFilter, label: 'Nuovi', icon: UserPlus },
        ]).map(({ key, label, icon }) => (
          <Pill key={key} active={authorFilter === key} onClick={() => setAuthorFilter(key)} icon={icon} label={label} />
        ))}
        {mainTab === 'community' && ([
          { key: 'xp' as CommunityFilter, label: 'Top XP', icon: Sparkles },
          { key: 'active' as CommunityFilter, label: 'Più attivi', icon: Zap },
          { key: 'donors' as CommunityFilter, label: 'Top donatori', icon: Coins },
        ]).map(({ key, label, icon }) => (
          <Pill key={key} active={communityFilter === key} onClick={() => setCommunityFilter(key)} icon={icon} label={label} />
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
        </div>
      ) : items.length === 0 ? (
        mainTab === 'libri'
          ? emptyState(BookOpen, 'Nessun libro qui', 'Cambia filtro o torna più tardi.')
          : mainTab === 'autori'
            ? emptyState(Sparkles, 'Nessun autore qui', 'Cambia filtro o torna più tardi.')
            : emptyState(Users, 'Nessun dato ancora', 'Guadagna XP, commenta e supporta gli autori per apparire in classifica.')
      ) : (
        <div className="space-y-2">
          {mainTab === 'libri' && items.map((b, i) => renderBookCard(b, i))}
          {mainTab === 'autori' && items.map((a, i) => renderAuthorCard(a, i))}
          {mainTab === 'community' && items.map((u, i) => renderCommunityCard(u, i))}
        </div>
      )}
    </div>
  )
}
