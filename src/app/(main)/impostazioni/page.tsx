'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Settings, Bell, Shield, Palette, Trash2, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ImpostazioniPage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Cambio password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Preferenze
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error('La nuova password deve avere almeno 6 caratteri')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Le password non coincidono')
      return
    }

    setChangingPassword(true)

    // Verifica la password attuale facendo un login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    })

    if (signInError) {
      toast.error('La password attuale non è corretta')
      setChangingPassword(false)
      return
    }

    // Aggiorna la password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error('Errore nell\'aggiornamento della password')
    } else {
      toast.success('Password aggiornata con successo!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }

    setChangingPassword(false)
  }

  const handleSavePreferences = async () => {
    setSavingPrefs(true)
    // Qui salveremmo le preferenze nel profilo
    await new Promise(resolve => setTimeout(resolve, 500))
    toast.success('Preferenze salvate')
    setSavingPrefs(false)
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e perderai tutti i tuoi dati, libri e token.'
    )

    if (!confirmed) return

    const doubleConfirm = window.confirm(
      'Ultima conferma: vuoi davvero eliminare il tuo account in modo permanente?'
    )

    if (!doubleConfirm) return

    toast.error('Per eliminare il tuo account contatta il supporto.')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sage-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-7 h-7 text-sage-600" />
          <h1 className="text-2xl font-bold text-sage-900">Impostazioni</h1>
        </div>

        {/* Info account */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 mb-6">
          <h2 className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sage-500" />
            Account
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-sage-50">
              <span className="text-sm text-bark-500">Email</span>
              <span className="text-sm font-medium text-sage-800">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-sage-50">
              <span className="text-sm text-bark-500">Nome</span>
              <span className="text-sm font-medium text-sage-800">{profile?.name || 'Non impostato'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-sage-50">
              <span className="text-sm text-bark-500">Username</span>
              <span className="text-sm font-medium text-sage-800">{profile?.username || 'Non impostato'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-sage-50">
              <span className="text-sm text-bark-500">Piano</span>
              <span className="text-sm font-medium text-sage-800 capitalize">{profile?.subscription_plan || 'free'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-bark-500">Autore</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${profile?.is_author ? 'bg-sage-100 text-sage-700' : 'bg-bark-100 text-bark-500'}`}>
                {profile?.is_author ? 'Sì' : 'No'}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/profilo')}
            className="mt-4 text-sm text-sage-600 hover:text-sage-700 font-medium"
          >
            Modifica profilo →
          </button>
        </div>

        {/* Cambio password */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 mb-6">
          <h2 className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sage-500" />
            Cambia password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1">Password attuale</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-cream-50 focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bark-400 hover:text-bark-600"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1">Nuova password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-cream-50 focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none text-sm pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bark-400 hover:text-bark-600"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-red-500 mt-1">Minimo 6 caratteri</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1">Conferma nuova password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-cream-50 focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none text-sm"
                required
              />
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Le password non coincidono</p>
              )}
            </div>

            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="px-6 py-2.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aggiornamento...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Aggiorna password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Notifiche */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 mb-6">
          <h2 className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-sage-500" />
            Notifiche
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sage-800">Notifiche email</p>
                <p className="text-xs text-bark-400">Ricevi aggiornamenti sui libri che segui</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailNotifications ? 'bg-sage-500' : 'bg-bark-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="mt-4 px-6 py-2.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Salva preferenze
          </button>
        </div>

        {/* Aspetto */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 mb-6">
          <h2 className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-sage-500" />
            Aspetto
          </h2>
          <p className="text-sm text-bark-500">
            La modalità scura sarà disponibile prossimamente.
          </p>
        </div>

        {/* Zona pericolosa */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 mb-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Zona pericolosa
          </h2>
          <p className="text-sm text-bark-500 mb-4">
            L&apos;eliminazione dell&apos;account è permanente. Tutti i tuoi dati, libri pubblicati e token verranno persi.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors text-sm"
          >
            Elimina account
          </button>
        </div>
      </div>
    </div>
  )
}
