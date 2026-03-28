'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import BookCard from '@/components/book/BookCard'
import {
  UserPlus, UserCheck, Heart, Share2, BookOpen, Eye, Users,
  Loader2, X, Coins, Minus, Plus, Radio
} from 'lucide-react'

type BookTab = 'published' | 'ongoing'

export default function AuthorProfilePage() {
  const params = useParams()
  const authorId = params.authorId as string
  const { user, refreshProfile } = useAuth()
  const supabase = createClient()

  const [author, setAuthor] = useState<any>(null)
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [totalReads, setTotalReads] = useState(0)
  const [bookTab, setBookTab] = useState<BookTab>('published')

  // Tip modal
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState(5)
  const [tipLoading, setTipLoading] = useState(false)
  const [spendableTokens, setSpendableTokens] = useState(0)

  const fetchAuthor = useCallback(async () => {
    setLoading(true)

    const { data: authorData } = await supabase
      .from('profiles')
      .select('id, name, author_pseudonym, avatar_url, author_bio, author_banner_url, is_author')
      .eq('id', authorId)
      .single()

    if (!authorData || !authorData.is_author) {
      setLoading(false)
      return
    }
    setAuthor(authorData)

    // Fetch books
    const { data: booksData } = await supabase
      .from('books')
      .select(`
        *,
        author:profiles!books_author_id_fkey(id, name, author_pseudonym, avatar_url)
      `)
      .eq('author_id', authorId)
      .in('status', ['published', 'ongoing', 'completed'])
      .order('published_at', { ascending: false })

    setBooks(booksData || [])
    setTotalReads((booksData || []).reduce((sum: number, b: any) => sum + (b.total_reads || 0), 0))

    // Followers count
    const { count } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', authorId)

    setFollowersCount(count || 0)

    // Check if current user follows
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', authorId)
        .single()

      setIsFollowing(!!followData)

      // Fetch spendable tokens (exclude WELCOME)
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
  }, [authorId, user, supabase])

  useEffect(() => {
    fetchAuthor()
  }, [fetchAuthor])

  const handleFollow = async () => {
    if (!user) {
      toast.error('Accedi per seguire gli autori')
      return
    }
    setFollowLoading(true)

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', authorId)
      setIsFollowing(false)
      setFollowersCount(prev => prev - 1)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: authorId })
      setIsFollowing(true)
      setFollowersCount(prev => prev + 1)
    }

    setFollowLoading(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/autore/${authorId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiato!')
    } catch {
      toast.error('Impossibile copiare il link')
    }
  }

  const handleTip = async () => {
    if (!user) {
      toast.error('Accedi per inviare una mancia')
      return
    }
    if (tipAmount < 1) {
      toast.error('Minimo 1 token')
      return
    }
    if (tipAmount > spendableTokens) {
      toast.error('Token insufficienti')
      return
    }

    setTipLoading(true)
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId, amount: tipAmount }),
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

  const publishedBooks = books.filter(b => b.status === 'completed')
  const ongoingBooks = books.filter(b => b.status === 'ongoing' || b.status === 'published')
  const displayBooks = bookTab === 'published' ? publishedBooks : ongoingBooks
  const authorName = author?.author_pseudonym || author?.name || 'Autore'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  if (!author) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 text-sage-200 mx-auto mb-4" />
        <p className="text-bark-500 text-lg">Autore non trovato</p>
        <Link href="/autori" className="text-sage-600 font-medium text-sm mt-2 inline-block">
          Torna agli autori
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header profilo */}
      <div className="bg-white rounded-2xl border border-sage-100 overflow-hidden mb-8">
        {/* Banner */}
        {author.author_banner_url ? (
          <div className="w-full h-40 sm:h-52">
            <img
              src={author.author_banner_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-28 sm:h-36 bg-gradient-to-r from-sage-200 via-sage-100 to-sage-200" />
        )}

        <div className="p-6 sm:p-8 -mt-12 sm:-mt-14">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={authorName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-sage-100 flex items-center justify-center border-4 border-white shadow-md">
              <span className="text-3xl font-bold text-sage-500">
                {authorName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 text-center sm:text-left pt-2 sm:pt-4">
            <h1 className="text-2xl font-bold text-sage-900">{authorName}</h1>
            {author.author_bio && (
              <p className="text-sm text-bark-500 mt-2 max-w-lg">{author.author_bio}</p>
            )}

            {/* Contatori */}
            <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-sage-900">{followersCount}</p>
                <p className="text-xs text-bark-400">Follower</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-sage-900">{books.length}</p>
                <p className="text-xs text-bark-400">Libri</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-sage-900">{totalReads.toLocaleString()}</p>
                <p className="text-xs text-bark-400">Pagine lette</p>
              </div>
            </div>

            {/* Azioni */}
            {user?.id !== authorId && (
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-5">
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isFollowing
                      ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
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

                <button
                  onClick={() => setShowTipModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  <Coins className="w-4 h-4" />
                  Supporta
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-bark-500 hover:bg-sage-50 transition-colors border border-sage-200"
                >
                  <Share2 className="w-4 h-4" />
                  Condividi
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Tabs libri */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setBookTab('published')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            bookTab === 'published'
              ? 'bg-sage-500 text-white'
              : 'bg-white text-bark-500 border border-sage-200 hover:bg-sage-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Pubblicati ({publishedBooks.length})
        </button>
        <button
          onClick={() => setBookTab('ongoing')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            bookTab === 'ongoing'
              ? 'bg-sage-500 text-white'
              : 'bg-white text-bark-500 border border-sage-200 hover:bg-sage-50'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          In corso ({ongoingBooks.length})
        </button>
      </div>

      {/* Griglia libri */}
      {displayBooks.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-sage-200 mx-auto mb-3" />
          <p className="text-bark-400 text-sm">
            {bookTab === 'published' ? 'Nessun libro completato' : 'Nessuna serializzazione attiva'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayBooks.map((book) => (
            <div key={book.id}>
              <BookCard book={book} />
              {bookTab === 'ongoing' && (
                <div className="mt-2 px-2">
                  <div className="flex items-center justify-between text-xs text-bark-400">
                    <span>{book.total_blocks || 0}/16 blocchi</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Radio className="w-3 h-3" />
                      In corso
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale Mancia */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTipModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-sage-900">Supporta {authorName}</h3>
              <button onClick={() => setShowTipModal(false)} className="text-bark-300 hover:text-bark-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-bark-400 mb-5">
              Invia una mancia in token. L&apos;autore riceve l&apos;80% del valore.
              I Welcome Token non possono essere usati.
            </p>

            {/* Selezione importo */}
            <div className="mb-4">
              <label className="text-xs font-medium text-bark-400 mb-2 block">IMPORTO (token)</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTipAmount(Math.max(1, tipAmount - 1))}
                  className="w-10 h-10 rounded-xl border border-sage-200 flex items-center justify-center hover:bg-sage-50 transition-colors"
                >
                  <Minus className="w-4 h-4 text-sage-600" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={spendableTokens}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(Math.max(1, Math.min(spendableTokens, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center text-2xl font-bold text-sage-900 border border-sage-200 rounded-xl py-2 outline-none focus:border-sage-400"
                />
                <button
                  onClick={() => setTipAmount(Math.min(spendableTokens, tipAmount + 1))}
                  className="w-10 h-10 rounded-xl border border-sage-200 flex items-center justify-center hover:bg-sage-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-sage-600" />
                </button>
              </div>
            </div>

            {/* Preset */}
            <div className="flex gap-2 mb-5">
              {[1, 5, 10, 20].map(val => (
                <button
                  key={val}
                  onClick={() => setTipAmount(Math.min(val, spendableTokens))}
                  disabled={val > spendableTokens}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    tipAmount === val
                      ? 'bg-sage-500 text-white'
                      : 'bg-sage-50 text-sage-700 hover:bg-sage-100 disabled:opacity-40'
                  }`}
                >
                  {val} tk
                </button>
              ))}
            </div>

            <div className="bg-sage-50 rounded-xl p-3 mb-5">
              <div className="flex justify-between text-xs text-bark-400">
                <span>Token disponibili</span>
                <span className="font-semibold text-sage-700">{spendableTokens} tk</span>
              </div>
              <div className="flex justify-between text-xs text-bark-400 mt-1">
                <span>L&apos;autore riceve</span>
                <span className="font-semibold text-sage-700">€{(tipAmount * 0.10 * 0.80).toFixed(2)}</span>
              </div>
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
