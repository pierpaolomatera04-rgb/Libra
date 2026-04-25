'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'
import { ALL_BADGES, getBadgeColor, getXpLevel, XP_VALUES } from '@/lib/badges'
import { awardXp } from '@/lib/xp'
import { LevelBadge } from '@/components/ui/LevelBadge'
import BookCard from '@/components/book/BookCard'
import HorizontalCarousel from '@/components/ui/HorizontalCarousel'
import CitationComments from '@/components/CitationComments'
import { MACRO_AREAS } from '@/lib/genres'
import { toast } from 'sonner'
import {
  Flame, Loader2, UserPlus, UserCheck, UserMinus, BookOpen, Trophy,
  Users, Lock, Sparkles, Shield, Share2, Coins, X, Minus, Plus,
  Heart, Radio, Eye, Camera, Quote, MessageCircle, Repeat2, Bookmark, Trash2
} from 'lucide-react'

interface ProfileData {
  id: string
  name: string | null
  username: string
  avatar_url: string | null
  bio: string | null
  author_bio: string | null
  author_banner_url: string | null
  is_author: boolean
  author_pseudonym: string | null
  daily_streak: number
  total_xp: number
  longest_streak: number
  library_public: boolean
  created_at: string
  pages_read: number
  followers_count: number
  following_count: number
  books_completed: number
  badges: { badge_id: string; earned_at: string }[]
}

export default function UnifiedProfilePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const username = params.username as string
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const supabase = createClient()

  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [libraryBooks, setLibraryBooks] = useState<any[]>([])
  const [authorBooks, setAuthorBooks] = useState<any[]>([])
  const [macroReads, setMacroReads] = useState<Record<string, number>>({})
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)
  const [totalReads, setTotalReads] = useState(0)

  // Tip modal
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState(5)
  const [tipLoading, setTipLoading] = useState(false)
  const [spendableTokens, setSpendableTokens] = useState(0)

  // Tabs: Panoramica / Citazioni (pubbliche) / Frasi Salvate (private, solo self)
  const initialTab = (searchParams.get('tab') as 'overview' | 'citazioni' | 'frasi') || 'overview'
  const [activeTab, setActiveTab] = useState<'overview' | 'citazioni' | 'frasi'>(initialTab)
  const [highlights, setHighlights] = useState<any[]>([])
  const [highlightLikes, setHighlightLikes] = useState<Set<string>>(new Set())
  // Accordion commenti citazione: set di highlight aperti
  const [openCommentsFor, setOpenCommentsFor] = useState<Set<string>>(new Set())
  const [savedPhrases, setSavedPhrases] = useState<any[]>([])
  const [deletingPhraseId, setDeletingPhraseId] = useState<string | null>(null)

  const isOwnProfile = user?.id === profileData?.id

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)

      // Try by username first, then by UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)

      let pData: any = null
      if (!isUUID) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url, bio, author_bio, author_banner_url, is_author, author_pseudonym, daily_streak, total_xp, longest_streak, library_public, created_at, pages_read')
          .eq('username', username)
          .single()
        pData = data
      }
      if (!pData) {
        // Fallback: search by ID (for users without username)
        const { data } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url, bio, author_bio, author_banner_url, is_author, author_pseudonym, daily_streak, total_xp, longest_streak, library_public, created_at, pages_read')
          .eq('id', username)
          .single()
        pData = data
      }

      if (!pData) {
        setLoading(false)
        return
      }

      // Parallel fetches (wrapped in try/catch for tables that may not exist yet)
      let followersCount = 0
      let followingCount = 0
      let badgesList: any[] = []
      let booksCompleted = 0

      try {
        const [followersRes, followingRes, badgesRes] = await Promise.all([
          supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', pData.id),
          supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', pData.id),
          supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', pData.id),
        ])
        followersCount = followersRes.count || 0
        followingCount = followingRes.count || 0
        badgesList = badgesRes.data || []
      } catch { /* tables may not exist yet */ }

      // Also try the old follows table as fallback
      if (followersCount === 0) {
        try {
          const { count } = await supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', pData.id)
          if (count) followersCount = count
        } catch { /* old table may not exist */ }
      }

      // Count completed books
      try {
        const { data: progressData } = await supabase
          .from('reading_progress')
          .select('book_id, block_id')
          .eq('user_id', pData.id)

        if (progressData && progressData.length > 0) {
          const bookIds = Array.from(new Set(progressData.map((p: any) => p.book_id)))
          for (const bid of bookIds) {
            const { count: totalBlocks } = await supabase
              .from('blocks')
              .select('id', { count: 'exact', head: true })
              .eq('book_id', bid)
            const readBlocks = progressData.filter((p: any) => p.book_id === bid).length
            if (totalBlocks && readBlocks >= totalBlocks) booksCompleted++
          }
        }
      } catch { /* reading_progress may not exist */ }

      setProfileData({
        ...pData,
        followers_count: followersCount,
        following_count: followingCount,
        books_completed: booksCompleted,
        badges: badgesList,
      })

      // Check follow status (try both new and old tables)
      if (user && user.id !== pData.id) {
        try {
          const { data: followData } = await supabase
            .from('followers')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', pData.id)
            .single()
          setIsFollowing(!!followData)
        } catch {
          try {
            const { data: followData } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', pData.id)
              .single()
            setIsFollowing(!!followData)
          } catch { /* */ }
        }
      }

      // Fetch author's published books
      if (pData.is_author) {
        const { data: booksData } = await supabase
          .from('books')
          .select('*, author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)')
          .eq('author_id', pData.id)
          .in('status', ['published', 'ongoing', 'completed'])
          .order('published_at', { ascending: false })
        setAuthorBooks(booksData || [])
        setTotalReads((booksData || []).reduce((sum: number, b: any) => sum + (b.total_reads || 0), 0))
      }

      // Macro area reads for badge progress
      try {
        const { data: maReads } = await supabase.rpc('get_user_macro_area_reads', { p_user_id: pData.id })
        if (maReads) {
          const map: Record<string, number> = {}
          maReads.forEach((r: any) => { map[r.macro_category] = r.blocks_read })
          setMacroReads(map)
        }
      } catch { /* RPC may not exist yet */ }

      // Fetch public highlights (citazioni)
      try {
        const { data: hlData } = await supabase
          .from('highlights')
          .select('*, book:books!highlights_book_id_fkey(id, title, cover_image_url, genre, author:profiles!books_author_id_fkey(name, author_pseudonym))')
          .eq('user_id', pData.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50)
        setHighlights(hlData || [])

        // Check which highlights the current user has liked
        if (user && hlData && hlData.length > 0) {
          const hlIds = hlData.map((h: any) => h.id)
          const { data: likesData } = await supabase
            .from('highlight_likes')
            .select('highlight_id')
            .eq('user_id', user.id)
            .in('highlight_id', hlIds)
          setHighlightLikes(new Set((likesData || []).map((l: any) => l.highlight_id)))
        }
      } catch { /* highlights table may not exist yet */ }

      // Fetch private saved phrases (solo per il profilo proprietario)
      if (user && user.id === pData.id) {
        try {
          const { data: savedData } = await supabase
            .from('highlights')
            .select('id, content, created_at, book_id, block_id, block_number, book:books!highlights_book_id_fkey(id, title, cover_image_url, author:profiles!books_author_id_fkey(name, author_pseudonym))')
            .eq('user_id', pData.id)
            .eq('is_public', false)
            .order('created_at', { ascending: false })
            .limit(200)
          setSavedPhrases(savedData || [])
        } catch { /* noop */ }
      }

      // Fetch library if public (o sempre per il profilo proprio)
      if (pData.library_public !== false || (user && user.id === pData.id)) {
        const { data: libData } = await supabase
          .from('user_library')
          .select(`*, book:books!user_library_book_id_fkey(
            id, title, description, cover_image_url, genre,
            total_blocks, total_likes, total_reads, total_saves, total_comments,
            total_reviews, average_rating, unique_readers,
            trending_score, access_level, first_block_free, status, published_at,
            author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
          )`)
          .eq('user_id', pData.id)
          .in('status', ['reading', 'completed'])
          .order('updated_at', { ascending: false })
          .limit(12)
        setLibraryBooks(libData || [])
      }

      // Spendable tokens for tip
      if (user && user.id !== pData.id) {
        const { data: tokens } = await supabase
          .from('tokens')
          .select('amount, type, expires_at')
          .eq('user_id', user.id)
          .eq('spent', false)
          .in('type', ['MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN'])

        const now = new Date()
        const valid = (tokens || []).filter((t: any) => !t.expires_at || new Date(t.expires_at) > now)
        setSpendableTokens(valid.reduce((sum: number, t: any) => sum + t.amount, 0))
      }

      setLoading(false)
    }

    fetchProfile()
  }, [username, user])

  const handleFollow = async () => {
    if (!user) { toast.error('Accedi per seguire'); return }
    if (!profileData) return
    setFollowLoading(true)

    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', profileData.id)
      setIsFollowing(false)
      setProfileData(prev => prev ? { ...prev, followers_count: prev.followers_count - 1 } : null)
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: profileData.id })
      setIsFollowing(true)
      setProfileData(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null)

      // +5 XP solo la PRIMA volta che si segue questo specifico autore
      if (profileData.is_author) {
        const targetReason = `follow_author:${profileData.id}`
        const { data: prevAward } = await supabase
          .from('xp_event_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('reason', targetReason)
          .limit(1)
        if (!prevAward || prevAward.length === 0) {
          awardXp(supabase, user.id, XP_VALUES.FOLLOW_AUTHOR, targetReason, true)
        }
      }

      const actorName = myProfile?.author_pseudonym || myProfile?.name || 'Un utente'
      createNotification({
        supabase,
        recipientId: profileData.id,
        actorId: user.id,
        actorName,
        type: 'follow',
        title: 'Nuovo follower',
        message: `${actorName} ha iniziato a seguirti`,
        data: { follower_username: myProfile?.username },
      })
    }
    setFollowLoading(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profileData?.username}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiato!')
    } catch {
      toast.error('Impossibile copiare il link')
    }
  }

  const handleHighlightLike = async (hlId: string) => {
    if (!user) { toast.error('Accedi per mettere mi piace'); return }
    const isLiked = highlightLikes.has(hlId)
    if (isLiked) {
      await supabase.from('highlight_likes').delete().eq('user_id', user.id).eq('highlight_id', hlId)
      setHighlightLikes(prev => { const s = new Set(prev); s.delete(hlId); return s })
      setHighlights(prev => prev.map((h: any) => h.id === hlId ? { ...h, likes_count: Math.max(0, (h.likes_count || 0) - 1) } : h))
    } else {
      await supabase.from('highlight_likes').insert({ user_id: user.id, highlight_id: hlId })
      setHighlightLikes(prev => new Set(prev).add(hlId))
      setHighlights(prev => prev.map((h: any) => h.id === hlId ? { ...h, likes_count: (h.likes_count || 0) + 1 } : h))
    }
  }

  const handleHighlightReshare = async (hl: any) => {
    if (!user) { toast.error('Accedi per ricondividere'); return }
    try {
      await supabase.from('highlights').insert({
        user_id: user.id,
        book_id: hl.book_id,
        block_id: hl.block_id,
        block_number: hl.block_number,
        content: hl.content,
        color: hl.color,
        is_public: true,
      })
      await supabase.from('highlight_reshares').insert({ user_id: user.id, highlight_id: hl.id })
      toast.success('Citazione ricondivisa sul tuo profilo!')
    } catch {
      toast.error('Errore nella ricondivisione')
    }
  }

  const handleDeletePhrase = async (phraseId: string) => {
    if (!user) return
    if (!window.confirm('Eliminare questa frase salvata?')) return
    setDeletingPhraseId(phraseId)
    try {
      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', phraseId)
        .eq('user_id', user.id)
      if (error) throw error
      setSavedPhrases(prev => prev.filter(p => p.id !== phraseId))
      toast.success('Frase eliminata')
    } catch {
      toast.error('Errore durante l\'eliminazione')
    } finally {
      setDeletingPhraseId(null)
    }
  }

  const handleTip = async () => {
    if (!user || !profileData) return
    if (tipAmount < 1) { toast.error('Minimo 1 token'); return }
    if (tipAmount > spendableTokens) { toast.error('Token insufficienti'); return }

    setTipLoading(true)
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: profileData.id, amount: tipAmount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Errore invio mancia')
      } else {
        toast.success(`Mancia di ${tipAmount} token inviata!`)
        setShowTipModal(false)
        setSpendableTokens(prev => prev - tipAmount)
        setTipAmount(5)
        refreshProfile()
      }
    } catch {
      toast.error('Errore di rete')
    }
    setTipLoading(false)
  }

  const xpLevel = profileData ? getXpLevel(profileData.total_xp) : null
  const earnedBadgeIds = new Set(profileData?.badges.map(b => b.badge_id) || [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Users className="w-16 h-16 text-sage-200" />
        <h1 className="text-xl font-bold text-sage-800">Utente non trovato</h1>
        <Link href="/browse" className="text-sm text-sage-500 hover:text-sage-700">Torna a sfogliare</Link>
      </div>
    )
  }

  const displayName = profileData.author_pseudonym || profileData.name || profileData.username
  const bioText = profileData.author_bio || profileData.bio

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* ===== HEADER ===== */}
      <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 overflow-hidden mb-6">
        {/* Banner */}
        {profileData.author_banner_url ? (
          <div className="w-full h-36 sm:h-48">
            <img src={profileData.author_banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-28 sm:h-36 bg-gradient-to-r from-sage-200 via-sage-100 to-sage-200 dark:from-sage-800 dark:via-sage-900 dark:to-sage-800" />
        )}

        <div className="px-6 sm:px-8">
          {/* Avatar overlapping banner */}
          <div className="-mt-14 flex items-end justify-between">
            <div className="relative">
              {profileData.avatar_url ? (
                <img src={profileData.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#1e221c] shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-sage-200 dark:bg-sage-700 flex items-center justify-center text-3xl font-bold text-sage-600 dark:text-sage-300 border-4 border-white dark:border-[#1e221c] shadow-md">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {profileData.daily_streak > 0 && (
                <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                  <Flame className="w-3 h-3" />
                  {profileData.daily_streak}
                </div>
              )}
            </div>

            {/* Edit button for own profile (above the fold) */}
            {isOwnProfile && (
              <Link
                href="/profilo"
                className="mb-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-sage-50 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-sage-100 transition-colors border border-sage-200 dark:border-sage-700"
              >
                <Camera className="w-3.5 h-3.5" />
                Modifica profilo
              </Link>
            )}
          </div>

          <div className="pb-6 sm:pb-8 mt-4">
            {/* Name + Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">{displayName}</h1>
                <LevelBadge totalXp={profileData.total_xp} size="md" />
              </div>
              {profileData.is_author && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 rounded-full w-fit">
                  <Shield className="w-3 h-3" /> Autore
                </span>
              )}
            </div>
            <p className="text-sm text-bark-400 dark:text-sage-500 mt-0.5">@{profileData.username}</p>

            {bioText && (
              <p className="text-sm text-bark-600 dark:text-sage-400 mt-2 max-w-lg">{bioText}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-sage-900 dark:text-sage-100">{profileData.followers_count}</p>
                <p className="text-xs text-bark-400 dark:text-sage-500">Follower</p>
              </div>
              {profileData.is_author && (
                <div className="text-center">
                  <p className="text-lg font-bold text-sage-900 dark:text-sage-100">{authorBooks.length}</p>
                  <p className="text-xs text-bark-400 dark:text-sage-500">Libri pubblicati</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-lg font-bold text-sage-900 dark:text-sage-100">{(profileData.pages_read || 0).toLocaleString()}</p>
                <p className="text-xs text-bark-400 dark:text-sage-500">Pagine lette</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <p className="text-lg font-bold text-sage-900 dark:text-sage-100">{xpLevel?.level}</p>
                </div>
                <p className="text-xs text-bark-400 dark:text-sage-500">{xpLevel?.title}</p>
              </div>
            </div>

            {/* Action buttons */}
            {user && !isOwnProfile && (
              <div className="flex items-center flex-wrap gap-3 mt-5">
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isFollowing
                      ? 'bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                      : 'bg-sage-500 text-white hover:bg-sage-600'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isFollowing ? 'Seguito' : 'Segui'}
                </button>

                {profileData.is_author && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800"
                  >
                    <Coins className="w-4 h-4" />
                    Supporta
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors border border-sage-200 dark:border-sage-700"
                >
                  <Share2 className="w-4 h-4" />
                  Condividi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex items-center gap-1 mb-6 border-b border-sage-100 dark:border-sage-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'overview'
              ? 'border-sage-500 text-sage-700 dark:text-sage-300'
              : 'border-transparent text-bark-400 dark:text-sage-500 hover:text-sage-600 dark:hover:text-sage-400'
          }`}
        >
          Panoramica
        </button>
        <button
          onClick={() => setActiveTab('citazioni')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'citazioni'
              ? 'border-sage-500 text-sage-700 dark:text-sage-300'
              : 'border-transparent text-bark-400 dark:text-sage-500 hover:text-sage-600 dark:hover:text-sage-400'
          }`}
        >
          <Quote className="w-3.5 h-3.5" />
          Citazioni
          {highlights.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-sage-100 dark:bg-sage-800 rounded-full">{highlights.length}</span>
          )}
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('frasi')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'frasi'
                ? 'border-sage-500 text-sage-700 dark:text-sage-300'
                : 'border-transparent text-bark-400 dark:text-sage-500 hover:text-sage-600 dark:hover:text-sage-400'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Frasi Salvate
            {savedPhrases.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-sage-100 dark:bg-sage-800 rounded-full">{savedPhrases.length}</span>
            )}
          </button>
        )}
      </div>

      {/* ===== CITAZIONI TAB ===== */}
      {activeTab === 'citazioni' && (
        <div>
          {highlights.length === 0 ? (
            <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-12 text-center">
              <Quote className="w-12 h-12 text-sage-200 dark:text-sage-700 mx-auto mb-3" />
              <p className="text-sm text-bark-400 dark:text-sage-500">
                {isOwnProfile
                  ? 'Non hai ancora pubblicato citazioni. Mentre leggi, seleziona un passaggio e tocca "Pubblica" per condividerlo qui.'
                  : `${displayName} non ha ancora pubblicato citazioni`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {highlights.map((hl: any) => {
                const isLiked = highlightLikes.has(hl.id)
                const bookTitle = hl.book?.title || 'Libro'
                const bookAuthor = hl.book?.author?.author_pseudonym || hl.book?.author?.name || ''
                const deepLink = `/reader/${hl.book_id}/${hl.block_number}?highlight=${hl.id}`

                return (
                  <article
                    key={hl.id}
                    className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Cover strip + Quote */}
                    <div className="flex gap-4 p-5 sm:p-6">
                      {hl.book?.cover_image_url && (
                        <Link href={deepLink} className="flex-shrink-0 hidden sm:block">
                          <img
                            src={hl.book.cover_image_url}
                            alt={bookTitle}
                            className="w-16 h-24 rounded-lg object-cover shadow-sm"
                          />
                        </Link>
                      )}

                      <div className="flex-1 min-w-0">
                        <Link href={deepLink} className="block group">
                          <Quote className="w-5 h-5 text-sage-300 dark:text-sage-700 mb-2" />
                          <p
                            className="font-serif text-lg sm:text-xl leading-relaxed text-sage-900 dark:text-sage-100 italic group-hover:text-sage-700 dark:group-hover:text-sage-300 transition-colors"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                          >
                            &ldquo;{hl.content}&rdquo;
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-bark-400 dark:text-sage-500">
                            <BookOpen className="w-3 h-3" />
                            <span className="font-medium text-sage-600 dark:text-sage-400">{bookTitle}</span>
                            {bookAuthor && (
                              <>
                                <span>·</span>
                                <span>{bookAuthor}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>Blocco {hl.block_number}</span>
                          </div>
                        </Link>
                      </div>
                    </div>

                    {/* Social actions */}
                    <div className="flex items-center gap-1 px-4 sm:px-6 py-2 border-t border-sage-50 dark:border-sage-800/50 bg-sage-50/30 dark:bg-sage-900/20">
                      <button
                        onClick={() => handleHighlightLike(hl.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isLiked
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
                            : 'text-bark-400 dark:text-sage-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                        {hl.likes_count || 0}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setOpenCommentsFor((prev) => {
                            const next = new Set(prev)
                            if (next.has(hl.id)) next.delete(hl.id)
                            else next.add(hl.id)
                            return next
                          })
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          openCommentsFor.has(hl.id)
                            ? 'text-sage-700 dark:text-sage-200 bg-sage-100 dark:bg-sage-800'
                            : 'text-bark-400 dark:text-sage-500 hover:text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-800'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Commenta</span>
                        {(hl.citation_comments_count || 0) > 0 && (
                          <span className="font-semibold">({hl.citation_comments_count})</span>
                        )}
                      </button>

                      {!isOwnProfile && (
                        <button
                          onClick={() => handleHighlightReshare(hl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-bark-400 dark:text-sage-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
                        >
                          <Repeat2 className="w-3.5 h-3.5" />
                          {hl.reshares_count || 0}
                        </button>
                      )}

                      <Link
                        href={deepLink}
                        className="ml-auto text-xs text-sage-500 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-200 font-medium px-3 py-1.5"
                      >
                        Leggi nel contesto &rarr;
                      </Link>
                    </div>

                    {/* Sezione commenti inline — accordion */}
                    <CitationComments
                      highlightId={hl.id}
                      open={openCommentsFor.has(hl.id)}
                      onCountChange={(delta) => {
                        setHighlights((prev) =>
                          prev.map((h) =>
                            h.id === hl.id
                              ? { ...h, citation_comments_count: Math.max(0, (h.citation_comments_count || 0) + delta) }
                              : h
                          )
                        )
                      }}
                    />
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== FRASI SALVATE TAB (privato, solo self) ===== */}
      {activeTab === 'frasi' && isOwnProfile && (
        <div>
          {savedPhrases.length === 0 ? (
            <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-12 text-center">
              <Bookmark className="w-12 h-12 text-sage-200 dark:text-sage-700 mx-auto mb-3" />
              <p className="text-sm text-bark-400 dark:text-sage-500 mb-2 font-semibold">
                Il tuo archivio è vuoto
              </p>
              <p className="text-xs text-bark-400 dark:text-sage-500 max-w-sm mx-auto">
                Mentre leggi, sottolinea un passaggio e tocca &ldquo;Salva&rdquo;: lo ritroverai qui, privato e sempre a portata di mano.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPhrases.map((phrase: any) => {
                const bookTitle = phrase.book?.title || 'Libro'
                const bookAuthor = phrase.book?.author?.author_pseudonym || phrase.book?.author?.name || ''
                const deepLink = `/reader/${phrase.book_id}/${phrase.block_number}?highlight=${phrase.id}`
                const savedDate = new Date(phrase.created_at).toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                const isDeleting = deletingPhraseId === phrase.id

                return (
                  <article
                    key={phrase.id}
                    className="group bg-white dark:bg-[#1e221c] rounded-xl border border-sage-100 dark:border-sage-800 p-4 sm:p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {phrase.book?.cover_image_url && (
                        <Link href={deepLink} className="flex-shrink-0 hidden sm:block">
                          <img
                            src={phrase.book.cover_image_url}
                            alt={bookTitle}
                            className="w-12 h-18 rounded-md object-cover shadow-sm"
                          />
                        </Link>
                      )}

                      <div className="flex-1 min-w-0">
                        <Link href={deepLink} className="block">
                          <p
                            className="text-sm sm:text-base text-sage-900 dark:text-sage-100 leading-relaxed italic mb-3"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                          >
                            &ldquo;{phrase.content}&rdquo;
                          </p>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] sm:text-xs text-bark-400 dark:text-sage-500">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="font-medium text-sage-600 dark:text-sage-400 truncate max-w-[180px]">
                              {bookTitle}
                            </span>
                            {bookAuthor && (
                              <>
                                <span>·</span>
                                <span className="truncate">{bookAuthor}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>Blocco {phrase.block_number}</span>
                            <span>·</span>
                            <span>{savedDate}</span>
                          </div>
                        </Link>
                      </div>

                      <button
                        onClick={() => handleDeletePhrase(phrase.id)}
                        disabled={isDeleting}
                        className="flex-shrink-0 p-2 -m-2 text-bark-300 dark:text-sage-600 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Elimina frase"
                        aria-label="Elimina frase"
                      >
                        {isDeleting
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== OVERVIEW TAB CONTENT ===== */}
      {activeTab === 'overview' && (
      <>
      {/* ===== OPERE PUBBLICATE (Priorita 1) ===== */}
      {profileData.is_author && authorBooks.length > 0 && (
        <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-sage-500" />
            <h2 className="text-base font-bold text-sage-900 dark:text-sage-100">Opere pubblicate</h2>
            <span className="text-xs text-bark-400 dark:text-sage-500 ml-auto">{authorBooks.length} libri</span>
          </div>

          <HorizontalCarousel>
            {authorBooks.map((book) => (
              <div key={book.id} className="flex-shrink-0 w-36 sm:w-44">
                <BookCard book={book} />
              </div>
            ))}
          </HorizontalCarousel>
        </div>
      )}

      {/* ===== GAMIFICATION (Priorita 2) ===== */}
      {/* XP + Streak bar */}
      {xpLevel && (
        <div className={`rounded-2xl border p-6 mb-6 ${
          xpLevel.level >= 50
            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-700'
            : 'bg-white dark:bg-[#1e221c] border-sage-100 dark:border-sage-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${xpLevel.level >= 50 ? 'text-yellow-500' : 'text-amber-500'}`} />
              <h2 className={`text-lg font-bold ${
                xpLevel.level >= 50
                  ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
                  : 'text-sage-900 dark:text-sage-100'
              }`}>
                Livello {xpLevel.level}/50 — {xpLevel.title}
              </h2>
            </div>
            {profileData.daily_streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-200 dark:border-orange-800">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{profileData.daily_streak} giorni</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-bark-400 dark:text-sage-500 mb-1.5">
            <span>{profileData.total_xp.toLocaleString()} XP totali</span>
            {xpLevel.level < 50 ? (
              <span>{xpLevel.currentXp}/{xpLevel.nextLevelXp} XP al prossimo livello</span>
            ) : (
              <span className="text-yellow-600 font-semibold">Livello massimo raggiunto!</span>
            )}
          </div>
          <div className="h-2.5 bg-sage-100 dark:bg-sage-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                xpLevel.level >= 50
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-sage-400 to-sage-600'
              }`}
              style={{ width: `${Math.min(100, xpLevel.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Badge Trophy Case */}
      <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-sage-900 dark:text-sage-100">Bacheca Trofei</h2>
          <span className="text-xs text-bark-400 dark:text-sage-500 ml-auto">
            {earnedBadgeIds.size}/{ALL_BADGES.length} sbloccati
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {MACRO_AREAS.map(ma => {
            const level1 = ALL_BADGES.find(b => b.id === `${ma.value}_level1`)!
            const level2 = ALL_BADGES.find(b => b.id === `${ma.value}_level2`)!
            const hasL1 = earnedBadgeIds.has(level1.id)
            const hasL2 = earnedBadgeIds.has(level2.id)
            const reads = macroReads[ma.value] || 0
            const color = getBadgeColor(level1.id)

            return (
              <div key={ma.value} className="space-y-2">
                <p className="text-[10px] font-medium text-bark-400 dark:text-sage-500 text-center truncate">{ma.icon} {ma.label}</p>

                <button
                  onClick={() => setSelectedBadge(selectedBadge === level1.id ? null : level1.id)}
                  className={`w-full p-3 rounded-xl border text-center transition-all ${
                    hasL1
                      ? `${color.bg} ${color.border} ${color.text} shadow-md ${color.glow}`
                      : 'bg-gray-50 dark:bg-sage-900/30 border-gray-200 dark:border-sage-800 text-gray-400 dark:text-sage-600'
                  }`}
                >
                  <span className={`text-2xl ${hasL1 ? '' : 'grayscale opacity-40'}`}>{level1.icon}</span>
                  <p className="text-[10px] font-medium mt-1 truncate">{level1.name}</p>
                </button>
                {selectedBadge === level1.id && !hasL1 && (
                  <p className="text-[10px] text-center text-bark-400">{reads}/3 blocchi</p>
                )}

                <button
                  onClick={() => setSelectedBadge(selectedBadge === level2.id ? null : level2.id)}
                  className={`w-full p-3 rounded-xl border text-center transition-all ${
                    hasL2
                      ? `${color.bg} ${color.border} ${color.text} shadow-md ${color.glow}`
                      : 'bg-gray-50 dark:bg-sage-900/30 border-gray-200 dark:border-sage-800 text-gray-400 dark:text-sage-600'
                  }`}
                >
                  <span className={`text-2xl ${hasL2 ? '' : 'grayscale opacity-40'}`}>{level2.icon}</span>
                  <p className="text-[10px] font-medium mt-1 truncate">{level2.name}</p>
                </button>
                {selectedBadge === level2.id && !hasL2 && (
                  <p className="text-[10px] text-center text-bark-400">{reads}/10 blocchi</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== ATTIVITA LETTURA (Priorita 3) ===== */}
      {(profileData.library_public !== false || isOwnProfile) && (
        <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-sage-500" />
            <h2 className="text-lg font-bold text-sage-900 dark:text-sage-100">Libreria personale</h2>
            {!profileData.library_public && isOwnProfile && (
              <span className="flex items-center gap-1 text-xs text-bark-400 ml-auto">
                <Lock className="w-3 h-3" /> Privata
              </span>
            )}
          </div>

          {libraryBooks.length === 0 ? (
            <p className="text-center text-sm text-bark-400 dark:text-sage-500 py-8">
              {profileData.library_public === false && !isOwnProfile
                ? 'Questa libreria e privata'
                : 'Nessun libro nella libreria'}
            </p>
          ) : (
            <HorizontalCarousel>
              {libraryBooks.map(entry =>
                entry.book ? (
                  <div key={entry.id} className="flex-shrink-0 w-36 sm:w-44">
                    <BookCard book={entry.book} />
                  </div>
                ) : null
              )}
            </HorizontalCarousel>
          )}
        </div>
      )}

      </>
      )}

      {/* ===== TIP MODAL ===== */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTipModal(false)}>
          <div className="bg-white dark:bg-[#1e221c] rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-sage-900 dark:text-sage-100">Supporta {displayName}</h3>
              <button onClick={() => setShowTipModal(false)} className="text-bark-300 hover:text-bark-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-bark-400 dark:text-sage-500 mb-5">
              Invia una mancia in token. L&apos;autore riceve il 90% del valore.
              I Welcome Token non possono essere usati.
            </p>

            <div className="mb-4">
              <label className="text-xs font-medium text-bark-400 dark:text-sage-500 mb-2 block">IMPORTO (token)</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTipAmount(Math.max(1, tipAmount - 1))}
                  className="w-10 h-10 rounded-xl border border-sage-200 dark:border-sage-700 flex items-center justify-center hover:bg-sage-50 dark:hover:bg-sage-800"
                >
                  <Minus className="w-4 h-4 text-sage-600 dark:text-sage-400" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center text-2xl font-bold text-sage-900 dark:text-sage-100 border border-sage-200 dark:border-sage-700 rounded-xl py-2 outline-none focus:border-sage-400 bg-white dark:bg-[#161a14]"
                />
                <button
                  onClick={() => setTipAmount(tipAmount + 1)}
                  className="w-10 h-10 rounded-xl border border-sage-200 dark:border-sage-700 flex items-center justify-center hover:bg-sage-50 dark:hover:bg-sage-800"
                >
                  <Plus className="w-4 h-4 text-sage-600 dark:text-sage-400" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-5">
              {[1, 5, 10, 20].map(val => (
                <button
                  key={val}
                  onClick={() => setTipAmount(val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    tipAmount === val
                      ? 'bg-sage-500 text-white'
                      : 'bg-sage-50 dark:bg-sage-800 text-sage-700 dark:text-sage-300 hover:bg-sage-100'
                  }`}
                >
                  {val} tk
                </button>
              ))}
            </div>

            <div className="bg-sage-50 dark:bg-sage-900/30 rounded-xl p-3 mb-5">
              <div className="flex justify-between text-xs text-bark-400 dark:text-sage-500">
                <span>Token disponibili</span>
                <span className={`font-semibold ${tipAmount > spendableTokens ? 'text-red-500' : 'text-sage-700 dark:text-sage-300'}`}>{spendableTokens} tk</span>
              </div>
              <div className="flex justify-between text-xs text-bark-400 dark:text-sage-500 mt-1">
                <span>L&apos;autore riceve</span>
                <span className="font-semibold text-sage-700 dark:text-sage-300">&euro;{(tipAmount * 0.10 * 0.90).toFixed(2)}</span>
              </div>
              {tipAmount > spendableTokens && (
                <Link href="/wallet" className="block text-xs text-red-500 mt-2 font-medium hover:text-red-600 underline">
                  Token insufficienti. Acquista token dal wallet &rarr;
                </Link>
              )}
            </div>

            <button
              onClick={handleTip}
              disabled={tipLoading || tipAmount < 1 || tipAmount > spendableTokens}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {tipLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  Invia {tipAmount} token
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
