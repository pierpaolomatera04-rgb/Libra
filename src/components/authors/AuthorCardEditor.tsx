'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { X, Check, Loader2, Camera, BookOpen, Users, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  CARD_COLOR_PRESETS,
  CardColorPreset,
  getPreset,
  presetFromMacros,
} from './authorCardBg'
import { getRank } from './authorRank'

interface Props {
  open: boolean
  onClose: () => void
  defaults: {
    name: string | null
    username: string | null
    author_pseudonym: string | null
    author_bio: string | null
    avatar_url: string | null
    profile_card_color: CardColorPreset | null
    total_xp: number
    booksByMacro: Record<string, number>
    totalBooks: number
    totalFollowers: number
    avgRating: number | null
  }
  onSaved?: () => void
}

export default function AuthorCardEditor({ open, onClose, defaults, onSaved }: Props) {
  const { user, updateProfile } = useAuth()
  const supabase = createClient()

  const [name, setName] = useState(defaults.name || '')
  const [username, setUsername] = useState(defaults.username || '')
  const [bio, setBio] = useState(defaults.author_bio || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaults.avatar_url)
  const [color, setColor] = useState<CardColorPreset | null>(defaults.profile_card_color)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(defaults.name || '')
    setUsername(defaults.username || '')
    setBio(defaults.author_bio || '')
    setAvatarUrl(defaults.avatar_url)
    setColor(defaults.profile_card_color)
  }, [open, defaults])

  const autoPreset = presetFromMacros(defaults.booksByMacro)
  const effectivePreset: CardColorPreset = color || autoPreset

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const path = `${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } else {
      toast.error('Upload avatar non riuscito')
    }
    setUploading(false)
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await updateProfile({
      name: name.trim() || null,
      username: username.trim() || null,
      author_bio: bio.trim() || null,
      avatar_url: avatarUrl,
      profile_card_color: color,
    } as any)
    setSaving(false)
    if (error) {
      toast.error('Errore nel salvataggio')
      return
    }
    toast.success('Profilo aggiornato')
    onSaved?.()
    onClose()
  }

  if (!open) return null

  const displayName = defaults.author_pseudonym || name || 'Nome autore'
  const preset = getPreset(effectivePreset)
  const rank = getRank(defaults.total_xp)

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1e221c] rounded-2xl shadow-2xl max-w-3xl w-full my-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-sage-100 dark:hover:bg-sage-800 z-10"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5 text-bark-400" />
        </button>

        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-sage-900 dark:text-sage-100 mb-4">
            Personalizza il tuo profilo
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Colonna form */}
            <div className="space-y-5">
              {/* Sfondo */}
              <div>
                <p className="text-xs font-semibold text-sage-900 dark:text-sage-100 mb-2">
                  Sfondo card
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {CARD_COLOR_PRESETS.map((p) => {
                    const selected = effectivePreset === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setColor(p.key)}
                        title={p.label}
                        className="relative w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          background: p.gradient,
                          borderColor: selected ? '#111' : 'rgba(0,0,0,0.1)',
                        }}
                      >
                        {selected && (
                          <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                        )}
                      </button>
                    )
                  })}
                  {color !== null && (
                    <button
                      type="button"
                      onClick={() => setColor(null)}
                      className="text-[11px] text-bark-500 dark:text-sage-400 underline hover:text-bark-700 ml-1"
                    >
                      Reset automatico
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-bark-400 dark:text-sage-500 mt-1">
                  {color ? 'Preset personalizzato' : 'Automatico dal genere prevalente'}
                </p>
              </div>

              {/* Foto profilo */}
              <div>
                <p className="text-xs font-semibold text-sage-900 dark:text-sage-100 mb-2">
                  Foto profilo
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-sage-100 dark:bg-sage-700 flex items-center justify-center border-2 border-sage-200 dark:border-sage-700">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-sage-600">{(name || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-800 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    Cambia foto
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                </div>
              </div>

              {/* Testi */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-sage-900 dark:text-sage-100">Nome visualizzato</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-sage-200 dark:border-sage-700 bg-white dark:bg-[#252525] text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sage-900 dark:text-sage-100">@username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    maxLength={30}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-sage-200 dark:border-sage-700 bg-white dark:bg-[#252525] text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sage-900 dark:text-sage-100">
                    Bio breve <span className="text-[11px] font-normal text-bark-400">({bio.length}/60)</span>
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 60))}
                    maxLength={60}
                    placeholder="Una frase che ti descrive"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-sage-200 dark:border-sage-700 bg-white dark:bg-[#252525] text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                  />
                </div>
              </div>
            </div>

            {/* Colonna anteprima */}
            <div>
              <p className="text-xs font-semibold text-sage-900 dark:text-sage-100 mb-2">Anteprima</p>
              <div className="flex justify-center">
                <div
                  className="relative w-[180px] rounded-2xl overflow-hidden shadow-lg flex flex-col items-center px-3 pt-5 pb-3"
                  style={{ height: 280, background: preset.gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-sage-100 flex items-center justify-center border-2 border-white/70">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-sage-700">{(displayName || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <h4 className="relative text-white font-bold text-sm mt-2 text-center truncate w-full">
                    {displayName || '—'}
                  </h4>
                  <p className="relative text-[11px] text-white/70 text-center truncate w-full" style={{ minHeight: 14 }}>
                    {username ? `@${username}` : '\u00A0'}
                  </p>
                  <p className="relative text-[10px] text-white/80 text-center line-clamp-2 w-full mt-1" style={{ minHeight: 24 }}>
                    {bio || '\u00A0'}
                  </p>
                  <span className={`relative inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${rank.chip}`}>
                    {rank.label}
                  </span>
                  <div className="relative flex items-center justify-center gap-2 mt-1.5 text-[10px] text-white/90">
                    <span className="inline-flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" />{defaults.totalBooks}</span>
                    <span className="inline-flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{defaults.totalFollowers}</span>
                    <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />{defaults.avgRating ? defaults.avgRating.toFixed(1) : '—'}</span>
                  </div>
                  <div className="relative mt-auto w-full pt-2">
                    <div className="w-full h-7 rounded-full bg-white text-sage-800 text-[10px] font-bold flex items-center justify-center">
                      Segui
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-bark-500 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salva modifiche
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
