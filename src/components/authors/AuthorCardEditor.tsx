'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { X, Check, Loader2, Camera, BookOpen, Users, Star, ImageIcon, Trash2, Award, Pencil } from 'lucide-react'
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
  const { user, profile, updateProfile } = useAuth()
  const supabase = createClient()

  const [name, setName] = useState(defaults.name || '')
  const [username, setUsername] = useState(defaults.username || '')
  const [bio, setBio] = useState(defaults.author_bio || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaults.avatar_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(profile?.author_banner_url || null)
  const [color, setColor] = useState<CardColorPreset | null>(defaults.profile_card_color)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileAvatarRef = useRef<HTMLInputElement>(null)
  const fileBannerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(defaults.name || '')
    setUsername(defaults.username || '')
    setBio(defaults.author_bio || '')
    setAvatarUrl(defaults.avatar_url)
    setBannerUrl(profile?.author_banner_url || null)
    setColor(defaults.profile_card_color)
  }, [open, defaults, profile?.author_banner_url])

  const autoPreset = presetFromMacros(defaults.booksByMacro)
  const effectivePreset: CardColorPreset = color || autoPreset
  const preset = getPreset(effectivePreset)
  const rank = getRank(defaults.total_xp)
  const displayName = defaults.author_pseudonym || name || 'Nome autore'
  const showUsername = !!username && username.toLowerCase() !== displayName.toLowerCase()

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    const path = `${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } else {
      toast.error('Upload avatar non riuscito')
    }
    setUploadingAvatar(false)
  }

  const handleBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingBanner(true)
    const path = `${user.id}/banner_${Date.now()}.${file.name.split('.').pop()}`
    // Bucket 'avatars' — riusiamo lo stesso bucket pubblico
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setBannerUrl(data.publicUrl)
    } else {
      toast.error('Upload banner non riuscito')
    }
    setUploadingBanner(false)
  }

  const removeBanner = () => setBannerUrl(null)

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await updateProfile({
      name: name.trim() || null,
      username: username.trim() || null,
      author_bio: bio.trim() || null,
      avatar_url: avatarUrl,
      author_banner_url: bannerUrl,
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
            Personalizza la tua card
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Colonna form */}
            <div className="space-y-5">
              {/* Fascia (banner) */}
              <div>
                <p className="text-xs font-semibold text-sage-900 dark:text-sage-100 mb-2">
                  Fascia in cima
                </p>

                {/* Preset colori pastello */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <button
                    type="button"
                    onClick={() => setColor(null)}
                    title="Colore default (automatico dal genere)"
                    className="relative w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${getPreset(autoPreset).bannerColor} 50%, #f0f0f0 50%)`,
                      borderColor: color === null ? '#111' : 'rgba(0,0,0,0.1)',
                    }}
                  >
                    {color === null && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                  {CARD_COLOR_PRESETS.map((p) => {
                    const selected = color === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setColor(p.key)}
                        title={p.label}
                        className="relative w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: p.bannerColor,
                          borderColor: selected ? '#111' : 'rgba(0,0,0,0.1)',
                        }}
                      >
                        {selected && (
                          <Check className="absolute inset-0 m-auto w-4 h-4 text-bark-700" />
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-bark-400 dark:text-sage-500 mb-2">
                  {color ? `Preset: ${getPreset(color).label}` : 'Default automatico dal genere prevalente'}
                </p>

                {/* Foto banner */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileBannerRef.current?.click()}
                    disabled={uploadingBanner}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-800 disabled:opacity-50"
                  >
                    {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {bannerUrl ? 'Cambia foto banner' : 'Carica foto banner'}
                  </button>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={removeBanner}
                      title="Rimuovi banner"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <input ref={fileBannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
                </div>
                <p className="text-[11px] text-bark-400 dark:text-sage-500 mt-1">
                  La foto banner ha priorita sul colore preset
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
                    onClick={() => fileAvatarRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sage-200 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-800 disabled:opacity-50"
                  >
                    {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    Cambia foto
                  </button>
                  <input ref={fileAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
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

            {/* Colonna anteprima — replica esatta della nuova card */}
            <div>
              <p className="text-xs font-semibold text-sage-900 dark:text-sage-100 mb-2">Anteprima</p>
              <div className="flex justify-center">
                <div
                  className="relative rounded-xl overflow-hidden flex flex-col"
                  style={{
                    width: 175,
                    height: 255,
                    backgroundColor: preset.bodyTintColor,
                    border: '1px solid #E8E8E8',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Fascia */}
                  <div
                    className="relative w-full"
                    style={{
                      height: 60,
                      backgroundColor: bannerUrl ? undefined : preset.bannerColor,
                      backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!bannerUrl && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{
                          top: '100%',
                          height: 40,
                          background: `linear-gradient(to bottom, ${preset.bannerColor} 0%, ${preset.bodyTintColor} 100%)`,
                        }}
                      />
                    )}
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/85 flex items-center justify-center">
                      <Pencil className="w-3 h-3 text-bark-600" />
                    </div>
                  </div>

                  {/* Avatar */}
                  <div className="relative z-10 flex justify-center" style={{ marginTop: -28 }}>
                    <div
                      className="rounded-full overflow-hidden flex items-center justify-center bg-sage-100"
                      style={{ width: 56, height: 56, border: '3px solid #FFFFFF', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-sage-700">{(displayName || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  {/* Corpo */}
                  <div className="relative flex flex-col items-center px-2 pt-1 pb-2 flex-1 min-h-0">
                    <h3 className="font-bold text-[13px] text-center leading-tight w-full truncate" style={{ color: '#1A1A1A' }}>
                      {displayName || '—'}
                    </h3>
                    <p className="text-[11px] text-center truncate w-full leading-tight" style={{ color: '#888888', minHeight: 13 }}>
                      {showUsername ? `@${username}` : ''}
                    </p>
                    <p className="text-[11px] text-center line-clamp-2 w-full px-1 mt-1 leading-tight" style={{ color: '#666666', minHeight: 28 }}>
                      {bio || ''}
                    </p>
                    <div className="flex items-center justify-center mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight ${rank.chip}`}>
                        {rank.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] mt-1.5" style={{ color: '#666666' }}>
                      <span className="inline-flex items-center gap-0.5"><BookOpen className="w-3 h-3" /><span className="font-semibold">{defaults.totalBooks}</span></span>
                      <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" /><span className="font-semibold">{defaults.totalFollowers}</span></span>
                      <span className="inline-flex items-center gap-0.5"><Star className={`w-3 h-3 ${defaults.avgRating ? 'text-amber-400 fill-amber-400' : ''}`} /><span className="font-semibold">{defaults.avgRating ? defaults.avgRating.toFixed(1) : '—'}</span></span>
                    </div>
                    <div className="mt-auto w-[80%] pt-1.5">
                      <div
                        className="w-full rounded-full text-[12px] font-bold flex items-center justify-center bg-white text-sage-700 border border-sage-500"
                        style={{ height: 28 }}
                      >
                        Segui
                      </div>
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
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
