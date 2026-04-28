'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import {
  BarChart3, Eye, Heart, MessageCircle, Users,
  BookOpen, Loader2, ArrowUp, ArrowDown, Minus, Bookmark
} from 'lucide-react'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [books, setBooks] = useState<any[]>([])
  const [totalStats, setTotalStats] = useState({
    reads: 0, likes: 0, comments: 0, followers: 0, saves: 0, completionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchAnalytics = async () => {
      // Libri con stats
      const { data: booksData } = await supabase
        .from('books')
        .select('id, title, total_reads, total_likes, total_comments, total_saves, trending_score, total_blocks, cover_image_url, status')
        .eq('author_id', user.id)
        .order('total_reads', { ascending: false })

      // Followers
      const { count: followersCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user.id)

      // Block reads per completion rate
      const { count: completedReads } = await supabase
        .from('block_reads')
        .select('id', { count: 'exact', head: true })
        .eq('read_completed', true)
        .in('book_id', (booksData || []).map((b: any) => b.id))

      const totalReadsCount = (booksData || []).reduce((sum: number, b: any) => sum + (b.total_reads || 0), 0)

      if (booksData) {
        setBooks(booksData)
        setTotalStats({
          reads: totalReadsCount,
          likes: booksData.reduce((sum: number, b: any) => sum + (b.total_likes || 0), 0),
          comments: booksData.reduce((sum: number, b: any) => sum + (b.total_comments || 0), 0),
          followers: followersCount || 0,
          saves: booksData.reduce((sum: number, b: any) => sum + (b.total_saves || 0), 0),
          completionRate: totalReadsCount > 0 ? Math.round(((completedReads || 0) / totalReadsCount) * 100) : 0,
        })
      }

      setLoading(false)
    }
    fetchAnalytics()
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
        <BarChart3 className="w-7 h-7 text-sage-600" />
        <h1 className="text-2xl font-bold text-sage-900">Statistiche</h1>
      </div>

      {/* Overview cards — mobile compatto (max ~80px), desktop esteso con descrizioni */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Pagine lette', desc: 'Pagine lette dai tuoi lettori — base per il calcolo dei tuoi guadagni', value: totalStats.reads.toLocaleString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50', href: null },
          { label: 'Like totali', desc: null, value: totalStats.likes.toLocaleString(), icon: Heart, color: 'text-red-500', bg: 'bg-red-50', href: null },
          { label: 'Commenti', desc: null, value: totalStats.comments.toLocaleString(), icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-50', href: '/dashboard/commenti' },
          { label: 'Followers', desc: null, value: totalStats.followers.toLocaleString(), icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', href: null },
          { label: 'Salvataggi', desc: 'Quante volte i lettori hanno salvato i tuoi libri nella loro libreria', value: totalStats.saves.toLocaleString(), icon: Bookmark, color: 'text-sage-600', bg: 'bg-sage-50', href: null },
          { label: 'Completamento', desc: 'Percentuale di blocchi letti fino alla fine rispetto al totale delle letture', value: `${totalStats.completionRate}%`, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50', href: null },
        ].map((stat) => {
          const content = (
            <div className={`bg-white rounded-xl sm:rounded-2xl border border-sage-100 p-3 sm:p-5 flex flex-col ${stat.href ? 'hover:border-sage-300 hover:shadow-sm cursor-pointer' : ''} transition-all`}>
              {/* Mobile: layout compatto su una riga (icona + valore + label) */}
              <div className="sm:hidden flex items-center gap-2" style={{ maxHeight: 80 }}>
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[22px] leading-none font-bold text-sage-900 truncate">{stat.value}</p>
                  <p className="text-[11px] text-bark-500 font-medium truncate mt-1">{stat.label}</p>
                </div>
              </div>
              {/* Desktop: layout originale con descrizione */}
              <div className="hidden sm:flex sm:flex-col" style={{ minHeight: '180px' }}>
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-sage-900">{stat.value}</p>
                <p className="text-xs text-bark-500 font-medium mt-1">{stat.label}</p>
                <div className="mt-1.5" style={{ minHeight: '2.5rem' }}>
                  {stat.desc && (
                    <p className="text-[10px] text-bark-400 leading-relaxed line-clamp-3">{stat.desc}</p>
                  )}
                </div>
              </div>
            </div>
          )
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>{content}</Link>
          ) : (
            <div key={stat.label}>{content}</div>
          )
        })}
      </div>

      {/* Classifica libri per performance */}
      <div className="bg-white rounded-2xl border border-sage-100 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-sage-900 mb-4">Performance per libro</h2>

        {books.length === 0 ? (
          <p className="text-center text-sm text-bark-400 py-8">Nessun libro pubblicato ancora</p>
        ) : (
          <>
            {/* Desktop ≥640px: tabella a griglia (layout originale) */}
            <div className="hidden sm:block space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-bark-400 uppercase tracking-wider">
                <div className="col-span-5">Libro</div>
                <div className="col-span-2 text-center">Pagine lette</div>
                <div className="col-span-1 text-center">Like</div>
                <div className="col-span-2 text-center">Commenti</div>
                <div className="col-span-2 text-center">Salvataggi</div>
              </div>

              {books.map((book, index) => {
                const maxReads = Math.max(...books.map((b: any) => b.total_reads || 1))
                const barWidth = ((book.total_reads || 0) / maxReads) * 100

                return (
                  <div key={book.id} className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl hover:bg-sage-50 transition-colors">
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-bark-300 w-5 text-center">{index + 1}</span>
                      <Link href={`/libro/${book.id}`} className="flex-shrink-0">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt="" className="w-8 h-11 rounded-lg object-cover hover:opacity-80 transition-opacity" />
                        ) : (
                          <div className="w-8 h-11 rounded-lg bg-sage-100 flex items-center justify-center hover:bg-sage-200 transition-colors">
                            <BookOpen className="w-3.5 h-3.5 text-sage-400" />
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/libro/${book.id}`} className="text-sm font-medium text-sage-800 truncate block hover:text-sage-600 transition-colors">{book.title}</Link>
                        <div className="w-full bg-sage-100 rounded-full h-1 mt-1.5">
                          <div className="bg-sage-400 h-1 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-sm font-semibold text-sage-800">
                      {(book.total_reads || 0).toLocaleString()}
                    </div>
                    <div className="col-span-1 text-center text-sm text-bark-500">
                      {book.total_likes || 0}
                    </div>
                    <div className="col-span-2 text-center text-sm text-bark-500">
                      {book.total_comments || 0}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-semibold text-sage-600">
                        {book.total_saves || 0}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mobile <640px: card verticali */}
            <div className="sm:hidden space-y-2.5">
              {books.map((book, index) => {
                const maxReads = Math.max(...books.map((b: any) => b.total_reads || 1))
                const barWidth = ((book.total_reads || 0) / maxReads) * 100

                return (
                  <Link
                    key={book.id}
                    href={`/libro/${book.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-sage-100 hover:border-sage-300 hover:bg-sage-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-bark-300 w-4 text-center flex-shrink-0 mt-0.5 tabular-nums">
                      {index + 1}
                    </span>
                    <div className="flex-shrink-0">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt="" className="w-10 h-14 rounded-md object-cover" />
                      ) : (
                        <div className="w-10 h-14 rounded-md bg-sage-100 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-sage-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Titolo: a capo se necessario, mai troncato */}
                      <p className="text-sm font-semibold text-sage-800 leading-tight break-words">
                        {book.title}
                      </p>
                      {/* Stats inline con icone */}
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-1.5 text-[11px] text-bark-500">
                        <span className="inline-flex items-center gap-0.5" title="Pagine lette">
                          <Eye className="w-3 h-3" />
                          <span className="font-semibold text-sage-800">{(book.total_reads || 0).toLocaleString()}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5" title="Like">
                          <Heart className="w-3 h-3" />
                          <span className="font-medium">{book.total_likes || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5" title="Commenti">
                          <MessageCircle className="w-3 h-3" />
                          <span className="font-medium">{book.total_comments || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5" title="Salvataggi">
                          <Bookmark className="w-3 h-3" />
                          <span className="font-medium">{book.total_saves || 0}</span>
                        </span>
                      </div>
                      {/* Barra avanzamento relativa */}
                      <div className="w-full bg-sage-100 rounded-full h-1 mt-2">
                        <div className="bg-sage-400 h-1 rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
