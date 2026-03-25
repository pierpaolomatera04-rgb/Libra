'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { PenTool, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthorOnboardingPage() {
  const [pseudonym, setPseudonym] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pseudonym.trim()) {
      toast.error('Inserisci un nome d\'arte')
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
        })
        .eq('id', user.id)

      if (error) {
        console.error('Errore onboarding autore:', error)
        toast.error('Errore durante la registrazione come autore: ' + error.message)
        setLoading(false)
        return
      }

      // Aggiorna il profilo nel context
      try {
        await refreshProfile()
      } catch {
        // Ignora errori di refresh, il profilo si aggiornerà al prossimo caricamento
      }

      toast.success('Benvenuto come autore!')
      router.push('/dashboard')
    } catch (err) {
      console.error('Errore imprevisto:', err)
      toast.error('Si è verificato un errore. Riprova.')
      setLoading(false)
    }
  }

  if (profile?.is_author) {
    router.push('/dashboard')
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
          Pubblica le tue storie a blocchi e raggiungi lettori in tutta Italia
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-sage-100 p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">
            Nome d&apos;arte / Pseudonimo *
          </label>
          <input
            type="text"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            placeholder="Come vuoi essere conosciuto?"
            required
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Racconta qualcosa di te ai lettori..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !pseudonym.trim()}
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
