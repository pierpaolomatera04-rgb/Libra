'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Coins, BookOpen, Loader2, TrendingUp, Unlock, Gift } from 'lucide-react'

export default function GuadagniPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [books, setBooks] = useState<any[]>([])
  const [donations, setDonations] = useState<any[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchEarnings = async () => {
      // Guadagni dai libri
      const { data: booksData } = await supabase
        .from('books')
        .select('id, title, total_earnings, total_reads, cover_image_url')
        .eq('author_id', user.id)
        .order('total_earnings', { ascending: false })

      // Donazioni ricevute
      const { data: donationsData } = await supabase
        .from('donations')
        .select('*, donor:profiles!donor_id(name, author_pseudonym, avatar_url)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (booksData) {
        setBooks(booksData)
        setTotalEarnings(booksData.reduce((sum: number, b: any) => sum + Number(b.total_earnings || 0), 0))
      }
      setDonations(donationsData || [])
      setLoading(false)
    }
    fetchEarnings()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Coins className="w-7 h-7 text-sage-600" />
        <h1 className="text-2xl font-bold text-sage-900">Guadagni</h1>
      </div>

      {/* Totale */}
      <div className="bg-sage-500 rounded-2xl p-4 sm:p-6 text-white mb-6 sm:mb-8 overflow-hidden min-w-0">
        <p className="text-sage-200 text-sm mb-1">Guadagno totale</p>
        <p className="text-3xl sm:text-4xl font-bold break-words">{totalEarnings.toLocaleString()} token</p>
        <p className="text-sage-200 text-xs mt-2">
          Guadagnati dagli sblocchi dei blocchi e dalle donazioni dei lettori
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Per libro */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4 sm:p-6 overflow-hidden min-w-0">
          <h2 className="text-lg font-bold text-sage-900 mb-4 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-sage-500" />
            Guadagni per libro
          </h2>

          {books.length === 0 ? (
            <p className="text-center text-sm text-bark-400 py-8">Nessun guadagno ancora</p>
          ) : (
            <div className="space-y-3">
              {books.map((book) => (
                <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sage-50 transition-colors">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt="" className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-sage-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p
                      className="text-sm font-medium text-sage-800"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                    >
                      {book.title}
                    </p>
                    <p className="text-xs text-bark-400">{book.total_reads || 0} letture</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-sage-600 whitespace-nowrap">{Number(book.total_earnings || 0)} tk</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Donazioni */}
        <div className="bg-white rounded-2xl border border-sage-100 p-4 sm:p-6 overflow-hidden min-w-0">
          <h2 className="text-lg font-bold text-sage-900 mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Donazioni ricevute
          </h2>

          {donations.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-10 h-10 text-sage-200 mx-auto mb-3" />
              <p className="text-sm text-bark-400">Nessuna donazione ancora</p>
              <p className="text-xs text-bark-300 mt-1">I lettori potranno donarti token per supportarti</p>
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((don) => (
                <div key={don.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sage-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p
                      className="text-sm font-medium text-sage-800"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                    >
                      {don.donor?.author_pseudonym || don.donor?.name || 'Anonimo'}
                    </p>
                    {don.message && (
                      <p
                        className="text-xs text-bark-400"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                      >
                        {don.message}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-amber-600 whitespace-nowrap">+{don.amount} tk</p>
                    <p className="text-[10px] text-bark-400">
                      {new Date(don.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
