'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Loader2, BookOpen, ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia',
  'Erotico', 'Commedia', 'Drammatico', 'Altro'
]

const MIN_GENRES = 3

export default function ReaderGenreOnboardingPage() {
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Se l'utente ha gia' completato l'onboarding (o ha gia' generi),
  // saltiamo direttamente alla scoperta.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (profile?.completed_onboarding && (profile.preferred_genres?.length ?? 0) > 0) {
      router.replace('/browse')
    }
  }, [authLoading, user, profile, router])

  const toggle = (g: string) => {
    setSelected((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  const enough = selected.length >= MIN_GENRES

  const handleSubmit = async () => {
    if (!user) {
      router.replace('/login')
      return
    }
    if (!enough) {
      toast.error(`Seleziona almeno ${MIN_GENRES} generi per continuare`)
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_genres: selected,
        completed_onboarding: true,
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Errore: ' + error.message)
      setSubmitting(false)
      return
    }

    // Pulisci eventuali flag pendenti (lato lettore)
    try {
      window.localStorage.removeItem('libra_pending_author')
    } catch {
      /* ignore */
    }

    await refreshProfile()
    window.location.href = '/browse'
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-cream-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-sage-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-sage-900">
            Cosa ami leggere?
          </h1>
          <p className="text-bark-500 mt-2 text-sm sm:text-base">
            Scegli almeno <strong>{MIN_GENRES} generi</strong>. Useremo i tuoi gusti per
            costruire la sezione <em>Consigliati per te</em>.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-sage-100 p-6 sm:p-8 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-medium text-sage-800 mb-4">
            <BookOpen className="w-4 h-4" />
            I tuoi generi preferiti
          </label>

          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const on = selected.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(g)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    on
                      ? 'bg-sage-500 text-white shadow-sm scale-[1.03]'
                      : 'bg-sage-50 text-bark-500 hover:bg-sage-100 border border-sage-200'
                  }`}
                >
                  {g}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className={enough ? 'text-sage-600 font-medium' : 'text-bark-400'}>
              {selected.length} / {MIN_GENRES} richiesti
              {selected.length > 0 && ` — ${selected.join(', ')}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!enough || submitting}
            className="mt-6 w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              <>
                Continua
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {!enough && (
            <p className="text-xs text-bark-400 text-center mt-3">
              Aggiungi {MIN_GENRES - selected.length} {MIN_GENRES - selected.length === 1 ? 'genere' : 'generi'} per continuare.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
