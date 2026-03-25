'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import {
  BookOpen, Users, Coins, TrendingUp, Eye, Plus,
  BarChart3, MessageCircle, Settings, PenTool, ArrowRight
} from 'lucide-react'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalReads: 0,
    totalLikes: 0,
    totalEarnings: 0,
    totalFollowers: 0,
    totalComments: 0,
  })
  const [recentBooks, setRecentBooks] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      // Libri dell'autore
      const { data: books } = await supabase
        .from('books')
        .select('id, title, total_reads, total_likes, total_earnings, total_comments, status, cover_image_url, trending_score')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (books) {
        setRecentBooks(books.slice(0, 5))
        setStats(prev => ({
          ...prev,
          totalBooks: books.length,
          totalReads: books.reduce((sum, b) => sum + (b.total_reads || 0), 0),
          totalLikes: books.reduce((sum, b) => sum + (b.total_likes || 0), 0),
          totalEarnings: books.reduce((sum, b) => sum + Number(b.total_earnings || 0), 0),
          totalComments: books.reduce((sum, b) => sum + (b.total_comments || 0), 0),
        }))
      }

      // Followers
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user.id)

      setStats(prev => ({ ...prev, totalFollowers: count || 0 }))
    }

    fetchStats()
  }, [user, supabase])

  if (!profile?.is_author) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <PenTool className="w-16 h-16 text-sage-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-sage-900 mb-3">Diventa autore</h1>
        <p className="text-bark-500 mb-8">
          Pubblica le tue storie a blocchi e raggiungi migliaia di lettori
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600"
        >
          Inizia ora
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Dashboard Autore</h1>
          <p className="text-sm text-bark-400 mt-1">
            Ciao {profile.author_pseudonym || profile.name}!
          </p>
        </div>
        <Link
          href="/pubblica"
          className="flex items-center gap-2 px-5 py-2.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Pubblica libro
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Libri', value: stats.totalBooks, icon: BookOpen, color: 'text-sage-600' },
          { label: 'Letture', value: stats.totalReads.toLocaleString(), icon: Eye, color: 'text-blue-500' },
          { label: 'Like', value: stats.totalLikes.toLocaleString(), icon: TrendingUp, color: 'text-red-500' },
          { label: 'Commenti', value: stats.totalComments.toLocaleString(), icon: MessageCircle, color: 'text-amber-500' },
          { label: 'Followers', value: stats.totalFollowers.toLocaleString(), icon: Users, color: 'text-purple-500' },
          { label: 'Guadagni', value: `${stats.totalEarnings} tk`, icon: Coins, color: 'text-sage-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-sage-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-bark-400">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-sage-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent books */}
        <div className="bg-white rounded-2xl border border-sage-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-sage-900">I tuoi libri</h2>
            <Link href="/dashboard/opere" className="text-sm text-sage-600 hover:text-sage-700">
              Vedi tutti
            </Link>
          </div>

          {recentBooks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-sage-200 mx-auto mb-3" />
              <p className="text-sm text-bark-400">Nessun libro ancora</p>
              <Link href="/pubblica" className="text-sm text-sage-600 font-medium mt-2 inline-block">
                Pubblica il primo
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBooks.map((book) => (
                <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sage-50 transition-colors">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt="" className="w-10 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-sage-100 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-sage-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sage-800 truncate">{book.title}</p>
                    <div className="flex items-center gap-3 text-xs text-bark-400 mt-0.5">
                      <span>{book.total_reads || 0} letture</span>
                      <span>{book.total_likes || 0} like</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        book.status === 'published' || book.status === 'ongoing'
                          ? 'bg-sage-100 text-sage-700'
                          : book.status === 'draft'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-bark-100 text-bark-600'
                      }`}>
                        {book.status === 'ongoing' ? 'In corso' : book.status === 'draft' ? 'Bozza' : book.status === 'completed' ? 'Completato' : book.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-sage-100 p-6">
          <h2 className="text-lg font-bold text-sage-900 mb-4">Azioni rapide</h2>
          <div className="space-y-2">
            {[
              { href: '/pubblica', label: 'Pubblica un nuovo libro', icon: Plus, desc: 'Carica e pubblica il tuo prossimo libro' },
              { href: '/dashboard/opere', label: 'Gestisci opere', icon: BookOpen, desc: 'Modifica, elimina o metti in pausa' },
              { href: '/dashboard/guadagni', label: 'Guadagni', icon: Coins, desc: 'Visualizza i tuoi guadagni in token' },
              { href: '/dashboard/analytics', label: 'Statistiche', icon: BarChart3, desc: 'Analisi dettagliate dei tuoi libri' },
              { href: '/dashboard/commenti', label: 'Commenti', icon: MessageCircle, desc: 'Rispondi ai tuoi lettori' },
              { href: '/dashboard/impostazioni', label: 'Impostazioni autore', icon: Settings, desc: 'Pseudonimo, bio, link social' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-sage-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-sage-50 group-hover:bg-sage-100 rounded-xl flex items-center justify-center transition-colors">
                  <action.icon className="w-5 h-5 text-sage-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-sage-800">{action.label}</p>
                  <p className="text-xs text-bark-400">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-bark-300 group-hover:text-sage-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
