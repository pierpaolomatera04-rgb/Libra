'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import {
  BookOpen, Plus, Eye, Heart, MessageCircle, TrendingUp,
  Calendar, Loader2, Trash2, Edit3, Bookmark, Pencil, Check, X
} from 'lucide-react'
import { getGenreTagColor } from '@/lib/genres'

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

export default function OperePage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed' | 'draft'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ bookId: string; field: 'title' | 'genre' } | null>(null)
  const [editingValue, setEditingValue] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    const fetchBooks = async () => {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*, blocks(count)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Errore fetch libri:', error.message)
        }
        setBooks(data || [])
      } catch (err) {
        console.error('Errore imprevisto opere:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBooks()
  }, [user, authLoading])

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

    setDeletingId(bookId)
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
    setDeletingId(null)
  }

  const startEditing = (bookId: string, field: 'title' | 'genre', currentValue: string) => {
    setEditingField({ bookId, field })
    setEditingValue(currentValue || '')
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditingValue('')
  }

  const saveEditing = async () => {
    if (!editingField) return
    const { bookId, field } = editingField
    const trimmed = editingValue.trim()
    if (field === 'title' && !trimmed) return

    const { error } = await supabase
      .from('books')
      .update({ [field]: trimmed || null })
      .eq('id', bookId)
      .eq('author_id', user?.id)

    if (!error) {
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, [field]: trimmed || null } : b))
    }
    cancelEditing()
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
            const isEditingTitle = editingField?.bookId === book.id && editingField?.field === 'title'
            const isEditingGenre = editingField?.bookId === book.id && editingField?.field === 'genre'
            return (
              <div key={book.id} className="bg-white rounded-2xl border border-sage-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex gap-4">
                  {/* Cover */}
                  <div className="flex-shrink-0">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt="" className="w-20 h-28 rounded-xl object-cover" />
                    ) : (
                      <div className="w-20 h-28 rounded-xl bg-sage-100 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-sage-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: title + date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Titolo inline edit */}
                        {isEditingTitle ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing() }}
                              className="text-base font-semibold text-sage-900 border border-sage-300 rounded-lg px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-sage-400"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-sage-600 hover:text-sage-800"><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEditing} className="p-1 text-bark-400 hover:text-bark-600"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <h3 className="text-base font-semibold text-sage-900 truncate">{book.title}</h3>
                            <button
                              onClick={() => startEditing(book.id, 'title', book.title)}
                              className="p-0.5 text-bark-300 hover:text-sage-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Badges: stato + genere inline edit */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.class}`}>
                            {badge.label}
                          </span>
                          {isEditingGenre ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing() }}
                                placeholder="Genere"
                                className="text-[11px] border border-sage-300 rounded-full px-2 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-sage-400"
                                autoFocus
                              />
                              <button onClick={saveEditing} className="p-0.5 text-sage-600 hover:text-sage-800"><Check className="w-3 h-3" /></button>
                              <button onClick={cancelEditing} className="p-0.5 text-bark-400 hover:text-bark-600"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group/genre">
                              {book.genre ? (
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getGenreTagColor(book.genre)}`}>
                                  {book.genre}
                                </span>
                              ) : (
                                <span className="text-[11px] text-bark-300 italic">Nessun genere</span>
                              )}
                              <button
                                onClick={() => startEditing(book.id, 'genre', book.genre || '')}
                                className="p-0.5 text-bark-300 hover:text-sage-600 opacity-0 group-hover/genre:opacity-100 transition-opacity"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Data pubblicazione top-right */}
                      <span className="text-[11px] text-bark-400 whitespace-nowrap flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(book.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>

                    {book.description && (
                      <p className="text-xs text-bark-500 mt-2 line-clamp-2">{book.description}</p>
                    )}

                    {/* Stats con label */}
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3">
                      <span className="text-xs text-bark-500">
                        <Eye className="w-3.5 h-3.5 text-bark-400 inline mr-1" />
                        {formatNum(book.total_reads || 0)} Visualizzazioni
                      </span>
                      <span className="text-xs text-bark-500">
                        <Heart className="w-3.5 h-3.5 text-bark-400 inline mr-1" />
                        {formatNum(book.total_likes || 0)} Like
                      </span>
                      <span className="text-xs text-bark-500">
                        <MessageCircle className="w-3.5 h-3.5 text-bark-400 inline mr-1" />
                        {formatNum(book.total_comments || 0)} Commenti
                      </span>
                      <span className="text-xs text-bark-500">
                        <Bookmark className="w-3.5 h-3.5 text-bark-400 inline mr-1" />
                        {formatNum(book.total_saves || 0)} Salvati
                      </span>
                    </div>

                    {/* Azioni esplicite */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Link
                        href={`/libro/${book.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-bark-600 bg-sage-50 hover:bg-sage-100 rounded-lg transition-colors border border-sage-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Visualizza Anteprima
                      </Link>
                      <Link
                        href={`/dashboard/opere/${book.id}/edit`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-bark-600 bg-sage-50 hover:bg-sage-100 rounded-lg transition-colors border border-sage-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Gestisci / Modifica
                      </Link>
                      <button
                        onClick={() => handleDelete(book.id, book.title)}
                        disabled={deletingId === book.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                      >
                        {deletingId === book.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Elimina
                      </button>
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
