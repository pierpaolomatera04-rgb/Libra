'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Rocket, Coins, Gift, Loader2, BookOpen, Clock, TrendingUp,
  Zap, X, Info, Eye, CheckCircle2, ArrowRight,
} from 'lucide-react'

type BookRow = {
  id: string
  title: string
  cover_image_url: string | null
  total_reads: number
  boost_expires_at: string | null
  boost_multiplier: number | null
  status: string
}

type BoostHistory = {
  id: string
  book_id: string
  tokens_spent: number
  tokens_from_bonus: number
  tokens_from_purchased: number
  duration_days: number
  multiplier: number
  reads_at_start: number
  started_at: string
  expires_at: string
  created_at: string
  is_active: boolean
  reads_delta: number
  book_title: string | null
  book_cover: string | null
  book_total_reads: number
}

type Balance = {
  bonus: number
  purchased: number
  total: number
  tippable: number
  boostable: number
}

function formatRemaining(expiresAt: string): { text: string; hours: number } {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return { text: 'Scaduto', hours: 0 }
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(ms / (1000 * 60)))
    return { text: `${minutes} min`, hours: 0 }
  }
  if (hours < 24) return { text: `${hours}h`, hours }
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return { text: remHours > 0 ? `${days}g ${remHours}h` : `${days}g`, hours }
}

export default function PromuoviPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [books, setBooks] = useState<BookRow[]>([])
  const [balance, setBalance] = useState<Balance>({
    bonus: 0, purchased: 0, total: 0, tippable: 0, boostable: 0,
  })
  const [history, setHistory] = useState<BoostHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null)
  const [modalTokens, setModalTokens] = useState(10)
  const [modalDays, setModalDays] = useState(3)
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Libri dell'autore — tutti i libri dell'utente loggato, a prescindere dallo status
      const { data: booksData, error: booksErr } = await supabase
        .from('books')
        .select('id, title, cover_image_url, total_reads, boost_expires_at, boost_multiplier, status')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (booksErr) {
        console.error('❌ Errore fetch libri promuovi:', booksErr.message)
      }
      setBooks((booksData as BookRow[]) || [])

      // Saldo segmentato via RPC
      const { data: balanceData } = await supabase.rpc('get_token_balance_split', {
        p_user_id: user.id,
      })
      if (balanceData) {
        setBalance({
          bonus: balanceData.bonus || 0,
          purchased: balanceData.purchased || 0,
          total: balanceData.total || 0,
          tippable: balanceData.tippable || 0,
          boostable: balanceData.boostable || 0,
        })
      }

      // Storico boost
      const res = await fetch('/api/author-boost?limit=20')
      if (res.ok) {
        const json = await res.json()
        setHistory(json.boosts || [])
      }
    } catch (err) {
      console.error('Errore fetch promuovi:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const openBoostModal = (book: BookRow) => {
    setSelectedBook(book)
    setModalTokens(Math.min(30, Math.max(10, balance.boostable)))
    setModalDays(3)
  }

  const closeModal = () => {
    if (submitting) return
    setSelectedBook(null)
  }

  const handleBoost = async () => {
    if (!selectedBook) return
    if (modalTokens < 10) {
      toast.error('Minimo 10 token')
      return
    }
    if (modalDays < 1 || modalDays > 30) {
      toast.error('Durata: 1-30 giorni')
      return
    }
    if (modalTokens > balance.boostable) {
      toast.error('Token insufficienti')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/author-boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBook.id, tokens: modalTokens, days: modalDays }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Boost non riuscito')
        return
      }
      toast.success(`Boost attivo! ${json.duration_days} ${json.duration_days === 1 ? 'giorno' : 'giorni'} ×${Number(json.multiplier).toFixed(1)}`)
      setSelectedBook(null)
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  if (!profile?.is_author) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Rocket className="w-16 h-16 text-sage-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-sage-900 mb-3">Solo per autori</h1>
        <p className="text-bark-500">Questa sezione è dedicata agli autori che vogliono promuovere i propri libri.</p>
      </div>
    )
  }

  const modalBonusUsed = Math.min(modalTokens, balance.bonus)
  const modalRealUsed = Math.max(0, modalTokens - modalBonusUsed)
  const tokensPerDay = modalDays > 0 ? modalTokens / modalDays : 0
  const computedMultiplier = Math.min(5.0, Math.max(1.1, 1 + tokensPerDay * 0.1))
  const canAfford = modalTokens >= 10 && modalTokens <= balance.boostable && modalDays >= 1 && modalDays <= 30
  const tokensError = modalTokens < 10
    ? 'Minimo 10 token'
    : modalTokens > balance.boostable
      ? `Massimo ${balance.boostable} (saldo disponibile)`
      : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Rocket className="w-7 h-7 text-sage-600" />
        <h1 className="text-2xl font-bold text-sage-900">Promuovi i tuoi libri</h1>
      </div>
      <p className="text-sm text-bark-500 mb-8">
        Usa i tuoi token per dare più visibilità ai tuoi libri. 10 token = 1 giorno di boost con moltiplicatore ×2.0 sul visibility_score.
      </p>

      {/* Saldo token — bonus vs reali */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-sage-50 border border-sage-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Token reali</span>
          </div>
          <p className="text-3xl font-black text-emerald-900">{balance.purchased.toLocaleString()}</p>
          <p className="text-xs text-emerald-700/80 mt-1">
            Acquistati con soldi veri — usabili per boost e mance
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Token bonus</span>
          </div>
          <p className="text-3xl font-black text-amber-900">{balance.bonus.toLocaleString()}</p>
          <p className="text-xs text-amber-700/80 mt-1">
            Premio / omaggio — solo boost, non mance
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          Il sistema usa prima i <strong>token bonus</strong>, poi i <strong>token reali</strong>.
          Durante il boost il libro apparirà in evidenza con visibilità raddoppiata finché non scade.
        </div>
      </div>

      {/* Lista libri */}
      <h2 className="text-lg font-bold text-sage-900 mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-sage-600" />
        I tuoi libri
      </h2>

      {books.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sage-100 p-10 text-center">
          <BookOpen className="w-10 h-10 text-sage-200 mx-auto mb-3" />
          <p className="text-sm text-bark-400 mb-3">Non hai ancora pubblicato libri</p>
          <Link href="/pubblica" className="inline-flex items-center gap-1.5 text-sm text-sage-600 font-semibold hover:text-sage-700">
            Pubblica il primo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {books.map((book) => {
            const isActive = book.boost_expires_at && new Date(book.boost_expires_at).getTime() > Date.now()
            const remaining = book.boost_expires_at ? formatRemaining(book.boost_expires_at) : null
            return (
              <div
                key={book.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 border-amber-300 shadow-sm'
                    : 'bg-white border-sage-100'
                }`}
              >
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt="" className="w-14 h-20 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-20 rounded-lg bg-sage-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-sage-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sage-900 truncate">{book.title}</p>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                        <Zap className="w-3 h-3" /> Boost attivo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-bark-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {book.total_reads || 0} letture
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      <TrendingUp className="w-3 h-3" /> {book.status}
                    </span>
                    {isActive && remaining && (
                      <span className="flex items-center gap-1 text-amber-700 font-semibold">
                        <Clock className="w-3 h-3" /> {remaining.text} rimasti
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openBoostModal(book)}
                  disabled={balance.boostable < 10}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sage-500 text-white font-semibold text-sm hover:bg-sage-600 transition-colors disabled:bg-sage-200 disabled:cursor-not-allowed shrink-0"
                >
                  <Rocket className="w-4 h-4" />
                  {isActive ? 'Estendi' : 'Boosta'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Storico boost */}
      <h2 className="text-lg font-bold text-sage-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-sage-600" />
        Storico boost
      </h2>

      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center">
          <p className="text-sm text-bark-400">Nessun boost effettuato finora</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sage-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sage-50 text-xs uppercase text-bark-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Libro</th>
                <th className="text-left px-4 py-3 font-semibold">Token</th>
                <th className="text-left px-4 py-3 font-semibold">Durata</th>
                <th className="text-left px-4 py-3 font-semibold">Letture aggiunte</th>
                <th className="text-left px-4 py-3 font-semibold">Stato</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const startedStr = new Date(h.started_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <tr key={h.id} className="border-t border-sage-100 hover:bg-sage-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {h.book_cover ? (
                          <img src={h.book_cover} alt="" className="w-8 h-11 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-11 rounded bg-sage-100 flex items-center justify-center shrink-0">
                            <BookOpen className="w-3 h-3 text-sage-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sage-800 truncate">{h.book_title || '—'}</p>
                          <p className="text-[10px] text-bark-400">{startedStr}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-sage-900">{h.tokens_spent}</p>
                      <p className="text-[10px] text-bark-400">
                        {h.tokens_from_bonus}b + {h.tokens_from_purchased}r
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{h.duration_days} {h.duration_days === 1 ? 'giorno' : 'giorni'}</p>
                      <p className="text-[10px] text-bark-400">×{Number(h.multiplier).toFixed(1)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-bold ${h.reads_delta > 0 ? 'text-emerald-700' : 'text-bark-400'}`}>
                        <TrendingUp className="w-3 h-3" />
                        +{h.reads_delta}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {h.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          <Zap className="w-3 h-3" /> Attivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-sage-100 text-bark-500 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Terminato
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale boost */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-sage-100 transition-colors"
              disabled={submitting}
            >
              <X className="w-4 h-4 text-bark-500" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-sage-900">Boosta il tuo libro</h3>
                <p className="text-xs text-bark-500 truncate">{selectedBook.title}</p>
              </div>
            </div>

            {/* Saldo disponibile */}
            <div className="flex items-center justify-between bg-sage-50 rounded-xl px-4 py-3 mb-5 text-xs">
              <div>
                <p className="text-bark-500">Disponibili per boost</p>
                <p className="font-bold text-sage-900 text-base">
                  {balance.boostable.toLocaleString()} token
                </p>
              </div>
              <div className="text-right">
                <p className="text-bark-500">
                  <span className="text-amber-700 font-semibold">{balance.bonus}</span> bonus +
                  <span className="text-emerald-700 font-semibold ml-1">{balance.purchased}</span> reali
                </p>
              </div>
            </div>

            {/* Durata — slider + input */}
            <label className="block text-xs font-semibold uppercase tracking-wider text-bark-500 mb-2">
              Durata boost (1-30 giorni)
            </label>
            <div className="flex items-center gap-3 mb-5">
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={modalDays}
                onChange={(e) => setModalDays(Number(e.target.value))}
                disabled={submitting}
                className="flex-1 accent-sage-600"
              />
              <input
                type="number"
                min={1}
                max={30}
                value={modalDays}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(30, Math.floor(Number(e.target.value))))
                  setModalDays(Number.isFinite(v) ? v : 1)
                }}
                disabled={submitting}
                className="w-20 border-2 border-sage-200 rounded-xl px-3 py-2 text-center font-bold text-sm focus:border-sage-500 outline-none"
              />
              <span className="text-xs text-bark-500 font-medium">
                {modalDays === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>

            {/* Token — input libero con +/- */}
            <label className="block text-xs font-semibold uppercase tracking-wider text-bark-500 mb-2">
              Token da spendere (min 10 · max {balance.boostable})
            </label>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => setModalTokens(Math.max(10, modalTokens - 1))}
                disabled={submitting || modalTokens <= 10}
                className="w-10 h-10 rounded-xl bg-sage-100 hover:bg-sage-200 font-bold text-sage-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >−</button>
              <input
                type="number"
                min={10}
                max={balance.boostable}
                value={modalTokens}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value))
                  setModalTokens(Number.isFinite(v) ? v : 10)
                }}
                disabled={submitting}
                className={`flex-1 border-2 rounded-xl px-4 py-2 text-center font-bold text-lg outline-none transition ${
                  tokensError ? 'border-red-300 focus:border-red-500' : 'border-sage-200 focus:border-sage-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setModalTokens(Math.min(balance.boostable, modalTokens + 1))}
                disabled={submitting || modalTokens >= balance.boostable}
                className="w-10 h-10 rounded-xl bg-sage-100 hover:bg-sage-200 font-bold text-sage-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >+</button>
            </div>
            {tokensError && (
              <p className="text-xs text-red-600 mb-3 font-medium">{tokensError}</p>
            )}
            {!tokensError && <div className="mb-4" />}

            {/* Anteprima dinamica */}
            <div className={`rounded-2xl p-4 mb-5 border-2 ${
              canAfford
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {canAfford ? (
                <>
                  <p className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    In evidenza per {modalDays} {modalDays === 1 ? 'giorno' : 'giorni'} con {tokensPerDay.toFixed(1)} token/giorno
                  </p>
                  <p className="text-xs text-amber-800/80 mb-2">
                    Visibility score ×{computedMultiplier.toFixed(1)} fino a {new Date(Date.now() + modalDays * 86400000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="border-t border-amber-200/50 pt-2 text-xs text-amber-900 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Token bonus usati</span>
                      <span className="font-bold">{modalBonusUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Token reali usati</span>
                      <span className="font-bold">{modalRealUsed}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-amber-200/40 mt-1">
                      <span className="font-semibold">Totale</span>
                      <span className="font-bold">{modalTokens} tk</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm font-bold text-red-800">
                  {tokensError || 'Configurazione non valida'}
                </p>
              )}
            </div>

            <button
              onClick={handleBoost}
              disabled={!canAfford || submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Attivazione...</>
              ) : (
                <><Rocket className="w-4 h-4" /> Conferma boost</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
