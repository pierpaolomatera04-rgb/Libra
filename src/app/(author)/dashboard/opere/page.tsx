'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import {
  BookOpen, Plus, Eye, Heart, MessageCircle, TrendingUp,
  Calendar, Loader2, MoreVertical, Trash2, Edit3
} from 'lucide-react'

export default function OperePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed' | 'draft'>('all')

  useEffect(() => {
    if (!user) return
    const fetchBooks = async () => {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*, blocks(count)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Errore fetch libri:', error.message)
        }
        setBooks(data || [])
      } catch (err) {
        console.error('💥 Errore imprevisto opere:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBooks()
  }, [user])

  const filteredBooks = filter === 'all'
    ? books
    : books.filter(b => {
        if (filter === 'ongoing') return b.status === 'ongoing' || b.status === 'published'
        return b.status === filter
      })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
      case 'published':
        return { label: 'In corso', class: 'bg-sage-100 text-sage-700' }
      case 'completed':
        return { label: 'Completato', class: 'bg-blue-100 text-blue-700' }
      case 'draft':
        return { label: 'Bozza', class: 'bg-amber-100 text-amber-700' }
      default:
        return { label: status, class: 'bg-bark-100 text-bark-600' }
    }
  }

  const handleDelete = async (bookId: string, title: string) => {
    const confirmed = window.confirm(`Sei sicuro di voler eliminare "${title}"? Questa azione è irreversibile.`)
    if (!confirmed) return

    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)
      .eq('author_id', user?.id)

    if (error) {
      alert('Errore nell\'eliminazione: ' + error.message)
    } else {
      setBooks(prev => prev.filter(b => b.id !== bookId))
    }
    setMenuOpen(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Le mie opere</h1>
          <p className="text-sm text-bark-400 mt-1">{books.length} {books.length === 1 ? 'libro' : 'libri'} pubblicati</p>
        </div>
        <Link
          href="/pubblica"
          className="flex items-center gap-2 px-5 py-2.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuovo libro
        </Link>
      </div>

      {/* Filtri */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { key: 'all' as const, label: 'Tutti' },
          { key: 'ongoing' as const, label: 'In corso' },
          { key: 'completed' as const, label: 'Completati' },
          { key: 'draft' as const, label: 'Bozze' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-sage-500 text-white'
                : 'bg-white text-bark-500 hover:bg-sage-50 border border-sage-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista libri */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-sage-100">
          <BookOpen className="w-16 h-16 text-sage-200 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-sage-800 mb-2">
            {filter === 'all' ? 'Nessun libro ancora' : 'Nessun libro in questa categoria'}
          </h2>
          <p className="text-sm text-bark-400 mb-6">
            {filter === 'all' ? 'Pubblica il tuo primo libro e inizia a raggiungere lettori!' : 'Prova a cambiare filtro'}
          </p>
          {filter === 'all' && (
            <Link
              href="/pubblica"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600"
            >
              <Plus className="w-4 h-4" />
              Pubblica il primo libro
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBooks.map((book) => {
            const badge = getStatusBadge(book.status)
            return (
              <div key={book.id} className="bg-white rounded-2xl border border-sage-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex gap-4">
                  {/* Cover */}
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt="" className="w-20 h-28 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-28 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-8 h-8 text-sage-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-sage-900 truncate">{book.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.class}`}>
                            {badge.label}
                          </span>
                          {book.genre && (
                            <span className="text-[11px] text-bark-400 px-2 py-0.5 rounded-full bg-bark-50">
                              {book.genre}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === book.id ? null : book.id)}
                          className="p-1.5 rounded-lg hover:bg-sage-50 text-bark-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === book.id && (
                          <>
                            <div className="fixed inset-0" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-sage-100 py-1 z-10">
                              <Link
                                href={`/reader/${book.id}/first`}
                                onClick={() => setMenuOpen(null)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-bark-600 hover:bg-sage-50"
                              >
                                <Eye className="w-4 h-4" />
                                Visualizza
                              </Link>
                              <Link
                                href={`/pubblica?edit=${book.id}`}
                                onClick={() => setMenuOpen(null)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-bark-600 hover:bg-sage-50"
                              >
                                <Edit3 className="w-4 h-4" />
                                Modifica
                              </Link>
                              <button
                                onClick={() => handleDelete(book.id, book.title)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Elimina
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {book.description && (
                      <p className="text-xs text-bark-500 mt-2 line-clamp-2">{book.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-xs text-bark-400">
                        <Eye className="w-3.5 h-3.5" />
                        {book.total_reads || 0}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-bark-400">
                        <Heart className="w-3.5 h-3.5" />
                        {book.total_likes || 0}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-bark-400">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {book.total_comments || 0}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-bark-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {Math.round(book.trending_score || 0)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-bark-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(book.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
