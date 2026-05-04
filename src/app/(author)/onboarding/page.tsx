'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { PenTool, ArrowRight, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia',
  'Erotico', 'Commedia', 'Drammatico', 'Altro'
]

export default function AuthorOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <AuthorOnboardingInner />
    </Suspense>
  )
}

function AuthorOnboardingInner() {
  const searchParams = useSearchParams()
  const prefilledPen = searchParams.get('pen') || ''
  const [pseudonym, setPseudonym] = useState(prefilledPen)
  const [bio, setBio] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Redirect se già autore
  useEffect(() => {
    if (!authLoading && profile?.is_author) {
      router.push('/dashboard')
    }
  }, [authLoading, profile, router])

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : prev.length < 5
          ? [...prev, genre]
          : prev
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pseudonym.trim()) {
      toast.error('Inserisci un nome d\'arte')
      return
    }

    if (selectedGenres.length === 0) {
      toast.error('Seleziona almeno un genere')
      return
    }

    if (!user) {
      toast.error('Devi effettuare il login')
      router.push('/login')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_author: true,
          author_pseudonym: pseudonym.trim(),
          author_bio: bio.trim() || null,
          preferred_genres: selectedGenres,
        })
        .eq('id', user.id)

      if (error) {
        console.error('Errore onboarding autore:', error)
        alert('Errore durante la registrazione: ' + error.message)
        setLoading(false)
        return
      }

      // Pulisci il flag pending author (settato durante /signup?author=1)
      try {
        window.localStorage.removeItem('libra_pending_author')
      } catch {
        /* ignore */
      }

      // Redirect immediato - il profilo si aggiornerà al caricamento della dashboard
      // Non chiamiamo refreshProfile() per evitare blocchi
      alert('Benvenuto come autore!')
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error('Errore imprevisto:', err)
      alert('Errore: ' + (err?.message || 'Riprova'))
      setLoading(false)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  // Se già autore, non mostrare nulla (il redirect è in useEffect)
  if (profile?.is_author) {
    return null
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-4">
          <PenTool className="w-8 h-8 text-sage-600" />
        </div>
        <h1 className="text-2xl font-bold text-sage-900">Diventa autore su Libra</h1>
        <p className="text-bark-500 mt-2">
          Completa il tuo profilo autore per iniziare a pubblicare
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-sage-100 p-8 space-y-6">
        {/* Nome d'arte */}
        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">
            Nome d&apos;arte / Pseudonimo *
          </label>
          <input
            type="text"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            placeholder="Come vuoi essere conosciuto dai lettori?"
            required
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Racconta qualcosa di te ai lettori... Cosa scrivi? Cosa ti ispira?"
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm resize-y"
          />
          <p className="text-xs text-bark-400 mt-1 text-right">{bio.length}/500</p>
        </div>

        {/* Generi */}
        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">
            <BookOpen className="w-4 h-4 inline mr-1" />
            Che genere scrivi? *
          </label>
          <p className="text-xs text-bark-400 mb-3">Seleziona fino a 5 generi</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => {
              const selected = selectedGenres.includes(genre)
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selected
                      ? 'bg-sage-500 text-white shadow-sm'
                      : 'bg-sage-50 text-bark-500 hover:bg-sage-100 border border-sage-200'
                  }`}
                >
                  {genre}
                </button>
              )
            })}
          </div>
          {selectedGenres.length > 0 && (
            <p className="text-xs text-sage-600 mt-2">
              {selectedGenres.length}/5 selezionati: {selectedGenres.join(', ')}
            </p>
          )}
        </div>

        {/* Email (readonly) */}
        <div className="flex items-center gap-2 text-xs text-bark-400 bg-sage-50 p-3 rounded-xl">
          <span>📧</span>
          Email associata: <span className="font-medium text-sage-700">{user?.email}</span>
        </div>

        <button
          type="submit"
          disabled={loading || !pseudonym.trim() || selectedGenres.length === 0}
          className="w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registrazione in corso...
            </>
          ) : (
            <>
              Inizia a pubblicare
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
