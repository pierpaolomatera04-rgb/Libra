'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Camera, Loader2, CheckCircle, UserCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfiloAutorePage() {
  const { user, profile, refreshProfile } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pseudonym, setPseudonym] = useState(profile?.author_pseudonym || '')
  const [bio, setBio] = useState(profile?.author_bio || '')
  const [name, setName] = useState(profile?.name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'immagine deve essere massimo 5MB')
      return
    }

    setUploadingAvatar(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Errore nel caricamento dell\'immagine')
      setUploadingAvatar(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (error) {
      toast.error('Errore nell\'aggiornamento del profilo')
    } else {
      toast.success('Foto profilo aggiornata!')
      await refreshProfile()
    }

    setUploadingAvatar(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!pseudonym.trim()) {
      toast.error('Il nome d\'arte è obbligatorio')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim() || null,
        username: username.trim() || null,
        author_pseudonym: pseudonym.trim(),
        author_bio: bio.trim() || null,
      })
      .eq('id', user.id)

    if (error) {
      if (error.message.includes('unique')) {
        toast.error('Questo username è già in uso')
      } else {
        toast.error('Errore nel salvataggio: ' + error.message)
      }
    } else {
      toast.success('Profilo aggiornato!')
      await refreshProfile()
    }

    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <UserCircle className="w-7 h-7 text-sage-600" />
        <h1 className="text-2xl font-bold text-sage-900">Profilo autore</h1>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-sage-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-400 uppercase tracking-wider mb-4">Foto profilo</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-sage-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-sage-200 flex items-center justify-center border-4 border-sage-100">
                <span className="text-3xl font-bold text-white">
                  {profile?.author_pseudonym?.charAt(0)?.toUpperCase() || profile?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-sage-500 text-white rounded-full flex items-center justify-center hover:bg-sage-600 transition-colors shadow-lg"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-sage-800">
              {profile?.author_pseudonym || profile?.name || 'Autore'}
            </p>
            <p className="text-xs text-bark-400 mt-1">
              JPG, PNG o GIF. Max 5MB.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-sage-600 font-medium mt-2 hover:text-sage-700"
            >
              Cambia foto
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-sage-100 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-bark-400 uppercase tracking-wider mb-2">Informazioni</h2>

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
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm bg-cream-50"
          />
          <p className="text-xs text-bark-400 mt-1">Questo è il nome che vedranno i lettori</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">Nome reale</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Il tuo nome reale (opzionale)"
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm bg-cream-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">Username</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bark-400 text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm bg-cream-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-800 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Racconta qualcosa di te ai lettori... Cosa scrivi? Cosa ti ispira?"
            rows={5}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm resize-y bg-cream-50"
          />
          <p className="text-xs text-bark-400 mt-1 text-right">{bio.length}/500</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-bark-400 bg-sage-50 p-3 rounded-xl">
          <span className="text-sage-500">📧</span>
          Email: <span className="font-medium text-sage-700">{user?.email}</span>
          <span className="text-bark-300">(non modificabile)</span>
        </div>

        <button
          type="submit"
          disabled={saving || !pseudonym.trim()}
          className="w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Salva modifiche
            </>
          )}
        </button>
      </form>
    </div>
  )
}
