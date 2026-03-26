'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import {
  BarChart3, Eye, Heart, MessageCircle, Users, TrendingUp,
  BookOpen, Loader2, ArrowUp, ArrowDown, Minus
} from 'lucide-react'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [books, setBooks] = useState<any[]>([])
  const [totalStats, setTotalStats] = useState({
    reads: 0, likes: 0, comments: 0, followers: 0, trending: 0, completionRate: 0
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
          trending: Math.round(booksData.reduce((sum: number, b: any) => sum + (b.trending_score || 0), 0) / Math.max(booksData.length, 1)),
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

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Letture totali', value: totalStats.reads.toLocaleString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Like totali', value: totalStats.likes.toLocaleString(), icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Commenti', value: totalStats.comments.toLocaleString(), icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Followers', value: totalStats.followers.toLocaleString(), icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Trending medio', value: totalStats.trending.toString(), icon: TrendingUp, color: 'text-sage-600', bg: 'bg-sage-50' },
          { label: 'Tasso completamento', value: `${totalStats.completionRate}%`, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-sage-100 p-5">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-sage-900">{stat.value}</p>
            <p className="text-xs text-bark-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Classifica libri per performance */}
      <div className="bg-white rounded-2xl border border-sage-100 p-6">
        <h2 className="text-lg font-bold text-sage-900 mb-4">Performance per libro</h2>

        {books.length === 0 ? (
          <p className="text-center text-sm text-bark-400 py-8">Nessun libro pubblicato ancora</p>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-bark-400 uppercase tracking-wider">
              <div className="col-span-5">Libro</div>
              <div className="col-span-2 text-center">Letture</div>
              <div className="col-span-1 text-center">Like</div>
              <div className="col-span-2 text-center">Commenti</div>
              <div className="col-span-2 text-center">Trending</div>
            </div>

            {books.map((book, index) => {
              const maxReads = Math.max(...books.map((b: any) => b.total_reads || 1))
              const barWidth = ((book.total_reads || 0) / maxReads) * 100

              return (
                <div key={book.id} className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl hover:bg-sage-50 transition-colors">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-bark-300 w-5 text-center">{index + 1}</span>
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt="" className="w-8 h-11 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-sage-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-sage-800 truncate">{book.title}</p>
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
                      {Math.round(book.trending_score || 0)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
