'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { BookOpen, Clock, Check, Bookmark, Globe2, Lock } from 'lucide-react'
import BookCard from '@/components/book/BookCard'
import { toast } from 'sonner'

type Tab = 'reading' | 'saved' | 'completed'

export default function LibraryPage() {
  const { user, profile, updateProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('reading')
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [libraryPublic, setLibraryPublic] = useState<boolean>(true)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const supabase = createClient()

  // Sincronizza lo stato locale con il profilo quando arriva
  useEffect(() => {
    if (profile) {
      setLibraryPublic((profile as any).library_public !== false)
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    const fetchLibrary = async () => {
      setLoading(true)

      let query = supabase
        .from('user_library')
        .select(`
          *,
          book:books!user_library_book_id_fkey(
            id, title, description, cover_image_url, genre,
            total_blocks, total_likes, total_reads, total_saves,
            trending_score, access_level, first_block_free, status, published_at,
            author:profiles!books_author_id_fkey(id, name, username, author_pseudonym, avatar_url)
          )
        `)
        .eq('user_id', user.id)

      if (tab === 'saved') {
        query = query.in('status', ['saved', 'reading'])
      } else {
        query = query.eq('status', tab)
      }

      const { data } = await query.order('updated_at', { ascending: false })

      setBooks(data || [])
      setLoading(false)
    }
    fetchLibrary()
  }, [user, tab, supabase])

  const toggleLibraryPublic = async () => {
    const next = !libraryPublic
    setLibraryPublic(next) // ottimistico: cambia UI subito
    setSavingVisibility(true)
    const { error } = await updateProfile({ library_public: next } as any)
    setSavingVisibility(false)
    if (error) {
      setLibraryPublic(!next) // rollback
      toast.error('Impossibile aggiornare la visibilità')
    } else {
      toast.success(next ? 'Libreria pubblica' : 'Libreria privata')
    }
  }

  const tabs = [
    { key: 'reading' as Tab, label: 'In lettura', icon: Clock },
    { key: 'saved' as Tab, label: 'Salvati', icon: Bookmark },
    { key: 'completed' as Tab, label: 'Completati', icon: Check },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">La mia libreria</h1>

        {/* Toggle visibilità libreria */}
        <button
          onClick={toggleLibraryPublic}
          disabled={savingVisibility}
          className={`group flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all ${
            libraryPublic
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-600'
          } disabled:opacity-70`}
          aria-pressed={libraryPublic}
          title={libraryPublic
            ? 'I tuoi libri sono visibili sul tuo profilo'
            : 'I tuoi libri sono nascosti dal tuo profilo'}
        >
          {libraryPublic ? (
            <Globe2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <Lock className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">
            <span className={libraryPublic ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}>Pubblica</span>
            <span className="mx-1 text-bark-300">/</span>
            <span className={!libraryPublic ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>Privata</span>
          </span>
          {/* Switch visivo */}
          <span
            className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
              libraryPublic ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                libraryPublic ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </button>
      </div>

      <p className="text-xs text-bark-400 dark:text-sage-500 mb-6 -mt-2">
        {libraryPublic
          ? 'Gli altri utenti possono vedere i tuoi libri salvati visitando il tuo profilo.'
          : 'La tua libreria è nascosta: nessun altro utente può vedere i libri che stai leggendo o hai salvato.'}
      </p>

      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key ? 'bg-sage-500 text-white' : 'bg-white dark:bg-[#1e221c] text-bark-500 dark:text-sage-400 border border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 p-3">
              <div className="w-[130px] aspect-[2/3] bg-sage-100 rounded animate-pulse" />
              <div className="h-3 w-24 bg-sage-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-sage-200 mx-auto mb-4" />
          <p className="text-bark-500">Nessun libro {tab === 'reading' ? 'in lettura' : tab === 'saved' ? 'salvato' : 'completato'}</p>
          <Link href="/browse" className="text-sage-600 font-medium text-sm mt-2 inline-block">
            Esplora il catalogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {books.map((item) =>
            item.book ? <BookCard key={item.id} book={item.book} /> : null
          )}
        </div>
      )}
    </div>
  )
}
