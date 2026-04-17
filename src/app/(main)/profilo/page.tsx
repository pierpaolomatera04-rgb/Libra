'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import {
  User, Mail, Camera, Save, Loader2, Eye, EyeOff,
  AtSign, ImageIcon, Trash2, AlertCircle, CheckCircle2, X
} from 'lucide-react'

// Toast component inline
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border animate-slide-up ${
      type === 'success'
        ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" /> : <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const supabase = createClient()

  const [name, setName] = useState(profile?.name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState((profile as any)?.bio || '')
  const [email, setEmail] = useState(user?.email || '')
  const [libraryPublic, setLibraryPublic] = useState((profile as any)?.library_public !== false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const emailChanged = email !== (user?.email || '')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  const handleSave = async () => {
    setSaving(true)

    // Save profile fields
    const { error } = await updateProfile({ name, username, bio, library_public: libraryPublic } as any)
    if (error) {
      showToast(error.includes('duplicate') || error.includes('unique') ? 'Username già in uso, scegline un altro' : error, 'error')
      setSaving(false)
      return
    }

    // Handle email change
    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser({ email })
      if (emailError) {
        showToast('Errore cambio email: ' + emailError.message, 'error')
        setSaving(false)
        return
      }
      showToast('Profilo aggiornato! Controlla la nuova email per confermare il cambio.', 'success')
    } else {
      showToast('Profilo aggiornato!', 'success')
    }

    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)

    const path = `${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: data.publicUrl } as any)
      showToast('Avatar aggiornato!', 'success')
    } else {
      showToast('Errore upload avatar', 'error')
    }
    setUploadingAvatar(false)
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingBanner(true)

    const path = `${user.id}/banner_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ author_banner_url: data.publicUrl } as any)
      showToast('Copertina aggiornata!', 'success')
    } else {
      showToast('Errore upload copertina', 'error')
    }
    setUploadingBanner(false)
  }

  const handleRemoveBanner = async () => {
    await updateProfile({ author_banner_url: null } as any)
    showToast('Copertina rimossa', 'success')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-sage-900 dark:text-sage-100">Modifica profilo</h1>

      {/* ── CARD 1: Visual (Banner + Avatar) ── */}
      <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 overflow-hidden">
        {/* Banner */}
        <div className="relative h-40 sm:h-48 bg-gradient-to-br from-sage-100 to-sage-200 dark:from-sage-800 dark:to-sage-900">
          {profile?.author_banner_url ? (
            <img
              src={profile.author_banner_url}
              alt="Copertina"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-sage-300 dark:text-sage-600" />
            </div>
          )}

          {/* Banner actions */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {profile?.author_banner_url && (
              <button
                onClick={handleRemoveBanner}
                className="px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-black/70 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Rimuovi
              </button>
            )}
            <label className="px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-black/70 transition-colors cursor-pointer flex items-center gap-1.5">
              {uploadingBanner ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              Cambia copertina
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={uploadingBanner} />
            </label>
          </div>
        </div>

        {/* Avatar overlapping banner */}
        <div className="px-6 -mt-10 pb-6">
          <div className="relative w-20 h-20">
            <div className="w-20 h-20 rounded-full bg-sage-200 dark:bg-sage-700 border-4 border-white dark:border-[#1e221c] flex items-center justify-center overflow-hidden shadow-md">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-sage-600 dark:text-sage-300">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-sage-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-sage-600 transition-colors shadow-sm">
              {uploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
            </label>
          </div>
          <p className="mt-2 text-xs text-bark-400 dark:text-sage-500">
            Clicca sulle icone per cambiare avatar o copertina
          </p>
        </div>
      </div>

      {/* ── CARD 2: Dati Pubblici ── */}
      <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-sage-700 dark:text-sage-300 uppercase tracking-wide">Dati pubblici</h2>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-sage-800 dark:text-sage-200 mb-1.5">Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 dark:text-sage-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Il tuo nome"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 dark:border-sage-700 focus:border-sage-400 dark:focus:border-sage-500 focus:ring-2 focus:ring-sage-200/50 dark:focus:ring-sage-700/50 outline-none text-sm bg-white dark:bg-[#161a14] text-bark-700 dark:text-sage-200 transition-colors"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-sage-800 dark:text-sage-200 mb-1.5">Username</label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 dark:text-sage-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="il_tuo_username"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 dark:border-sage-700 focus:border-sage-400 dark:focus:border-sage-500 focus:ring-2 focus:ring-sage-200/50 dark:focus:ring-sage-700/50 outline-none text-sm bg-white dark:bg-[#161a14] text-bark-700 dark:text-sage-200 transition-colors"
            />
          </div>
          <p className="text-xs text-bark-400 dark:text-sage-500 mt-1">Solo lettere minuscole, numeri e underscore</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-sage-800 dark:text-sage-200 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Raccontaci qualcosa di te..."
            rows={3}
            maxLength={250}
            className="w-full px-4 py-2.5 rounded-xl border border-sage-200 dark:border-sage-700 focus:border-sage-400 dark:focus:border-sage-500 focus:ring-2 focus:ring-sage-200/50 dark:focus:ring-sage-700/50 outline-none text-sm resize-none bg-white dark:bg-[#161a14] text-bark-700 dark:text-sage-200 transition-colors"
          />
          <p className={`text-xs mt-1 ${bio.length > 230 ? 'text-amber-500' : 'text-bark-400 dark:text-sage-500'}`}>
            {bio.length}/250
          </p>
        </div>
      </div>

      {/* ── CARD 3: Account & Privacy ── */}
      <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-sage-700 dark:text-sage-300 uppercase tracking-wide">Account e privacy</h2>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-sage-800 dark:text-sage-200 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 dark:text-sage-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sage-200 dark:border-sage-700 focus:border-sage-400 dark:focus:border-sage-500 focus:ring-2 focus:ring-sage-200/50 dark:focus:ring-sage-700/50 outline-none text-sm bg-white dark:bg-[#161a14] text-bark-700 dark:text-sage-200 transition-colors"
            />
          </div>
          {emailChanged && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>Riceverai un&apos;email di conferma al nuovo indirizzo per completare il cambio.</p>
            </div>
          )}
        </div>

        {/* Library visibility toggle */}
        <div className="flex items-center justify-between p-4 bg-sage-50/70 dark:bg-sage-900/20 rounded-xl">
          <div>
            <p className="text-sm font-medium text-sage-800 dark:text-sage-200">Libreria pubblica</p>
            <p className="text-xs text-bark-400 dark:text-sage-500 mt-0.5">Permetti agli altri di vedere i libri che stai leggendo</p>
          </div>
          <button
            onClick={() => setLibraryPublic(!libraryPublic)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              libraryPublic
                ? 'bg-sage-500 text-white'
                : 'bg-bark-100 dark:bg-sage-800 text-bark-500 dark:text-sage-400'
            }`}
          >
            {libraryPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {libraryPublic ? 'Pubblica' : 'Privata'}
          </button>
        </div>
      </div>

      {/* ── Save Button ── */}
      <div className="sticky bottom-4 z-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-sage-500 text-white rounded-2xl font-semibold hover:bg-sage-600 disabled:opacity-50 transition-colors shadow-lg shadow-sage-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva modifiche
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
