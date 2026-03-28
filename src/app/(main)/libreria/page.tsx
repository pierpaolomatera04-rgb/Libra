'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { BookOpen, Clock, Check, Bookmark, Search, Radio, Sparkles } from 'lucide-react'

type Tab = 'reading' | 'saved' | 'completed' | 'serial'

export default function LibraryPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('reading')
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const fetchLibrary = async () => {
      setLoading(true)

      if (tab === 'serial') {
        // Fetch books in active serialization from user's library
        const { data } = await supabase
          .from('user_library')
          .select(`
            *,
            book:books!user_library_book_id_fkey(
              id, title, cover_image_url, total_blocks, genre, status,
              author:profiles!books_author_id_fkey(name, author_pseudonym)
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'reading')
          .order('updated_at', { ascending: false })

        // Filter to only ongoing/published books and check for new blocks
        const serialBooks = (data || []).filter(
          (item: any) => item.book?.status === 'ongoing' || item.book?.status === 'published'
        ).map((item: any) => {
          const totalBlocks = item.book?.total_blocks || 0
          const lastReadBlock = item.last_read_block || 0
          const hasNewBlocks = totalBlocks > lastReadBlock
          const newBlockCount = Math.max(0, totalBlocks - lastReadBlock)
          return { ...item, hasNewBlocks, newBlockCount }
        })

        setBooks(serialBooks)
      } else {
        let query = supabase
          .from('user_library')
          .select(`
            *,
            book:books!user_library_book_id_fkey(
              id, title, cover_image_url, total_blocks, genre,
              author:profiles!books_author_id_fkey(name, author_pseudonym)
            )
          `)
          .eq('user_id', user.id)

        // "Salvati" shows both saved and reading books
        if (tab === 'saved') {
          query = query.in('status', ['saved', 'reading'])
        } else {
          query = query.eq('status', tab)
        }

        const { data } = await query.order('updated_at', { ascending: false })

        setBooks(data || [])
      }

      setLoading(false)
    }
    fetchLibrary()
  }, [user, tab, supabase])

  const tabs = [
    { key: 'reading' as Tab, label: 'In lettura', icon: Clock },
    { key: 'serial' as Tab, label: 'Serializzazioni', icon: Radio },
    { key: 'saved' as Tab, label: 'Salvati', icon: Bookmark },
    { key: 'completed' as Tab, label: 'Completati', icon: Check },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-sage-900 mb-6">La mia libreria</h1>

      <div className="flex items-center gap-2 mb-8">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key ? 'bg-sage-500 text-white' : 'bg-white text-bark-500 border border-sage-200 hover:bg-sage-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-sage-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-22 bg-sage-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sage-100 rounded w-3/4" />
                  <div className="h-3 bg-sage-50 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-sage-200 mx-auto mb-4" />
          <p className="text-bark-500">Nessun libro {tab === 'reading' ? 'in lettura' : tab === 'serial' ? 'in serializzazione attiva' : tab === 'saved' ? 'salvato' : 'completato'}</p>
          <Link href="/browse" className="text-sage-600 font-medium text-sm mt-2 inline-block">
            Esplora il catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((item) => (
            <Link
              key={item.id}
              href={`/reader/${item.book?.id}/1`}
              className="bg-white rounded-xl border border-sage-100 p-4 hover:border-sage-300 hover:shadow-sm transition-all relative"
            >
              {/* New block indicator for serializations */}
              {tab === 'serial' && item.hasNewBlocks && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-sage-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  {item.newBlockCount} {item.newBlockCount === 1 ? 'nuovo' : 'nuovi'}
                </div>
              )}
              <div className="flex gap-3">
                {item.book?.cover_image_url ? (
                  <img src={item.book.cover_image_url} alt="" className="w-16 h-22 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-22 rounded-lg bg-sage-100 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-sage-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sage-800 truncate">{item.book?.title}</p>
                  <p className="text-xs text-bark-400 mt-0.5">
                    {item.book?.author?.author_pseudonym || item.book?.author?.name}
                  </p>
                  {item.progress_percentage > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sage-500 rounded-full" style={{ width: `${item.progress_percentage}%` }} />
                      </div>
                      <p className="text-[10px] text-bark-400 mt-1">{Math.round(item.progress_percentage)}% completato</p>
                    </div>
                  )}
                  {tab === 'serial' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
                        <Radio className="w-3 h-3" />
                        In corso
                      </span>
                      {item.book?.genre && (
                        <span className="text-[10px] px-2 py-0.5 bg-sage-50 text-sage-600 rounded-full">
                          {item.book.genre}
                        </span>
                      )}
                    </div>
                  )}
                  {tab !== 'serial' && item.book?.genre && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-sage-50 text-sage-600 rounded-full">
                      {item.book.genre}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
