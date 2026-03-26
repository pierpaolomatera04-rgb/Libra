'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Settings, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ImpostazioniAutorePage() {
  const { user, profile, refreshProfile } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleDisableAuthor = async () => {
    const confirmed = window.confirm(
      'Vuoi disattivare il tuo profilo autore? I tuoi libri rimarranno visibili ma non potrai pubblicarne di nuovi.'
    )
    if (!confirmed) return

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ is_author: false })
      .eq('id', user?.id)

    if (error) {
      toast.error('Errore nella disattivazione')
    } else {
      toast.success('Profilo autore disattivato')
      await refreshProfile()
      router.push('/browse')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-7 h-7 text-sage-600" />
        <h1 className="text-2xl font-bold text-sage-900">Impostazioni autore</h1>
      </div>

      {/* Info account */}
      <div className="bg-white rounded-2xl border border-sage-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-400 uppercase tracking-wider mb-4">Il tuo account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-sage-50">
            <span className="text-sm text-bark-500">Email</span>
            <span className="text-sm font-medium text-sage-800">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-sage-50">
            <span className="text-sm text-bark-500">Pseudonimo</span>
            <span className="text-sm font-medium text-sage-800">{profile?.author_pseudonym || '-'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-sage-50">
            <span className="text-sm text-bark-500">Piano</span>
            <span className="text-sm font-medium text-sage-800 capitalize">{profile?.subscription_plan || 'free'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-bark-500">Membro dal</span>
            <span className="text-sm font-medium text-sage-800">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Link utili */}
      <div className="bg-white rounded-2xl border border-sage-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-400 uppercase tracking-wider mb-4">Link rapidi</h2>
        <div className="space-y-2">
          <button
            onClick={() => router.push('/dashboard/profilo-autore')}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-sage-50 text-sm text-sage-700 font-medium transition-colors"
          >
            Modifica profilo autore →
          </button>
          <button
            onClick={() => router.push('/impostazioni')}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-sage-50 text-sm text-sage-700 font-medium transition-colors"
          >
            Impostazioni account generali →
          </button>
        </div>
      </div>

      {/* Disattiva profilo autore */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Zona pericolosa
        </h2>
        <p className="text-sm text-bark-500 mb-4">
          Se disattivi il profilo autore, i tuoi libri resteranno visibili ai lettori ma non potrai pubblicarne di nuovi.
          Potrai riattivarlo in qualsiasi momento.
        </p>
        <button
          onClick={handleDisableAuthor}
          disabled={saving}
          className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          Disattiva profilo autore
        </button>
      </div>
    </div>
  )
}
