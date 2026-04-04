'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, BookOpen, Crown,
  Unlock, Sparkles, Coins, ImagePlus, Info,
  Edit3, Check, X, Calendar, Layers
} from 'lucide-react'

import { MACRO_AREAS, getMacroAreaByValue, getMacroAreaByGenre } from '@/lib/genres'

const MOODS = [
  'Emozionante', 'Misterioso', 'Romantico', 'Avventuroso',
  'Cupo', 'Divertente', 'Riflessivo', 'Intenso'
]

export default function BookEditPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [book, setBook] = useState<any>(null)
  const [blockCount, setBlockCount] = useState(0)
  const [blocks, setBlocks] = useState<any[]>([])
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null)

  // Editable fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [macroCategory, setMacroCategory] = useState('')
  const [genre, setGenre] = useState('')
  const [mood, setMood] = useState('')
  const [accessLevel, setAccessLevel] = useState<'open' | 'silver_choice' | 'gold_exclusive'>('open')
  const [tokenPrice, setTokenPrice] = useState(5)
  const [priceFull, setPriceFull] = useState(50)
  const [firstBlockFree, setFirstBlockFree] = useState(true)
  const [newCover, setNewCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !bookId) return
    const fetchBook = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('books')
        .select('*, blocks(count)')
        .eq('id', bookId)
        .single()

      if (error || !data) {
        toast.error('Libro non trovato')
        router.push('/dashboard/opere')
        return
      }

      if (data.author_id !== user.id) {
        toast.error('Non hai i permessi per modificare questo libro')
        router.push('/dashboard/opere')
        return
      }

      setBook(data)
      setTitle(data.title || '')
      setDescription(data.description || '')
      setGenre(data.genre || '')
      // Derive macroCategory from genre or from saved macro_category
      const savedMacro = data.macro_category || getMacroAreaByGenre(data.genre)?.value || ''
      setMacroCategory(savedMacro)
      setMood(data.mood || '')
      setAccessLevel(data.access_level || 'open')
      setTokenPrice(data.token_price_per_block || 5)
      setPriceFull(data.price_full || 50)
      setFirstBlockFree(data.first_block_free ?? true)
      setCoverPreview(data.cover_image_url || null)
      setBlockCount(data.blocks?.[0]?.count || data.total_blocks || 0)

      // Fetch blocks
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('id, block_number, title, word_count, is_released, scheduled_date, released_at')
        .eq('book_id', bookId)
        .order('block_number')

      if (blocksData) setBlocks(blocksData)

      setLoading(false)
    }
    fetchBook()
  }, [user, bookId])

  const startEditingBlock = (block: any) => {
    setEditingBlockId(block.id)
    setEditingTitle(block.title || '')
  }

  const cancelEditingBlock = () => {
    setEditingBlockId(null)
    setEditingTitle('')
  }

  const saveBlockTitle = async (blockId: string) => {
    setSavingBlockId(blockId)
    const trimmed = editingTitle.trim()
    const { error } = await supabase
      .from('blocks')
      .update({ title: trimmed || null })
      .eq('id', blockId)

    if (error) {
      toast.error('Errore nel salvataggio del titolo')
    } else {
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, title: trimmed || null } : b))
      toast.success('Titolo aggiornato')
    }
    setEditingBlockId(null)
    setEditingTitle('')
    setSavingBlockId(null)
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewCover(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const paidBlocks = firstBlockFree ? Math.max(0, blockCount - 1) : blockCount
  const totalPrice = tokenPrice * paidBlocks
  const isFormValid = title.trim().length > 0

  const handleSave = async () => {
    if (!isFormValid || !user) return
    setSaving(true)

    try {
      let coverUrl = book?.cover_image_url || null

      // Upload new cover if changed
      if (newCover) {
        const fileName = `covers/${user.id}/${bookId}-${Date.now()}.${newCover.name.split('.').pop()}`
        const { error: uploadError } = await supabase.storage
          .from('books')
          .upload(fileName, newCover, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('books').getPublicUrl(fileName)
          coverUrl = urlData.publicUrl
        }
      }

      // Update book record
      const finalTokenPrice = accessLevel === 'open' ? 0 : tokenPrice
      const { error } = await supabase
        .from('books')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          macro_category: macroCategory || null,
          genre,
          mood: mood || null,
          cover_image_url: coverUrl,
          access_level: accessLevel,
          token_price_per_block: finalTokenPrice,
          price_full: accessLevel === 'open' ? 0 : priceFull,
          first_block_free: firstBlockFree,
        })
        .eq('id', bookId)
        .eq('author_id', user.id)

      if (error) {
        toast.error('Errore nel salvataggio: ' + error.message)
        setSaving(false)
        return
      }

      // Update block prices
      const newBlockPrice = accessLevel === 'open' ? 0 : finalTokenPrice
      const { data: blocks } = await supabase
        .from('blocks')
        .select('id, block_number, token_price')
        .eq('book_id', bookId)
        .order('block_number')

      if (blocks) {
        for (const block of blocks) {
          const price = (firstBlockFree && block.block_number === 1) ? 0 : newBlockPrice
          if (block.token_price !== price) {
            await supabase
              .from('blocks')
              .update({ token_price: price })
              .eq('id', block.id)
          }
        }
      }

      toast.success('Libro aggiornato con successo!')
      router.push('/dashboard/opere')
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Errore imprevisto durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  if (!book) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/opere')}
          className="p-2 rounded-xl hover:bg-sage-50 text-bark-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-sage-900">Modifica libro</h1>
          <p className="text-sm text-bark-400">{blockCount} blocchi pubblicati</p>
        </div>
      </div>

      {/* Section 1: Dettagli */}
      <section className="bg-white rounded-2xl border border-sage-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-sage-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sage-500" /> Dettagli
        </h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bark-600">Titolo *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-sage-50/50 text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-300 text-sm"
            placeholder="Titolo del libro"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bark-600">Trama / Descrizione</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-sage-50/50 text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-300 text-sm resize-none"
            placeholder="Scrivi una breve trama..."
          />
        </div>

        {/* Macro-Area */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bark-600">Reparto (Macro-Area)</label>
          <div className="flex flex-wrap gap-2">
            {MACRO_AREAS.map((macro) => (
              <button
                key={macro.value}
                type="button"
                onClick={() => { setMacroCategory(macro.value); setGenre('') }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  macroCategory === macro.value
                    ? `${macro.color.bg} ${macro.color.text} border-transparent`
                    : `${macro.color.bgLight} ${macro.color.textLight} ${macro.color.border} hover:opacity-80`
                }`}
              >
                <span>{macro.icon}</span>
                {macro.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sotto-genere */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bark-600">Sotto-genere</label>
            {macroCategory ? (
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-sage-50/50 text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-300 text-sm"
              >
                <option value="">Seleziona...</option>
                {getMacroAreaByValue(macroCategory)?.subGenres.map(sg => (
                  <option key={sg.value} value={sg.value}>{sg.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-bark-400 py-2">Scegli prima il reparto</p>
            )}
          </div>

          {/* Mood */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bark-600">Mood</label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-sage-50/50 text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-300 text-sm"
            >
              <option value="">Seleziona...</option>
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Cover */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bark-600">Copertina</label>
          <div className="flex items-center gap-4">
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-20 h-28 object-cover rounded-xl border border-sage-200" />
            ) : (
              <div className="w-20 h-28 rounded-xl bg-sage-100 border border-dashed border-sage-300 flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-sage-300" />
              </div>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-sage-200 text-bark-600 hover:bg-sage-50 transition-colors flex items-center gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              {coverPreview ? 'Cambia' : 'Carica'}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
          </div>
        </div>
      </section>

      {/* Section 2: Blocchi — titoli inline editing */}
      {blocks.length > 0 && (
        <section className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-sage-800 dark:text-sage-200 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sage-500" /> Blocchi ({blocks.length})
            </h2>
            <p className="text-xs text-bark-400 dark:text-sage-500">Clicca sulla matita per rinominare</p>
          </div>

          <div className="divide-y divide-sage-50 dark:divide-sage-800 rounded-xl border border-sage-100 dark:border-sage-800 overflow-hidden">
            {blocks.map((block) => {
              const isEditing = editingBlockId === block.id
              const isSaving = savingBlockId === block.id
              const wordCount = block.word_count || 0
              const readMin = Math.ceil(wordCount / 200)

              return (
                <div key={block.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1e221c] hover:bg-sage-50/50 dark:hover:bg-sage-800/30 transition-colors">
                  {/* Numero blocco */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    block.is_released
                      ? 'bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300'
                      : 'bg-bark-100 dark:bg-sage-900 text-bark-400 dark:text-sage-500'
                  }`}>
                    {block.block_number}
                  </div>

                  {/* Titolo / Input editing */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveBlockTitle(block.id)
                            if (e.key === 'Escape') cancelEditingBlock()
                          }}
                          placeholder={`Blocco ${block.block_number}`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-sage-300 dark:border-sage-600 bg-white dark:bg-[#252525] text-sm text-sage-900 dark:text-sage-100 focus:outline-none focus:ring-2 focus:ring-sage-300"
                        />
                        <button
                          onClick={() => saveBlockTitle(block.id)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={cancelEditingBlock}
                          className="p-1.5 rounded-lg text-bark-400 hover:bg-sage-100 dark:hover:bg-sage-800 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <p className="text-sm font-medium text-sage-800 dark:text-sage-200 truncate">
                          {block.title
                            ? `${block.block_number}. ${block.title}`
                            : `Blocco ${block.block_number}`
                          }
                        </p>
                        <button
                          onClick={() => startEditingBlock(block)}
                          className="opacity-0 group-hover/title:opacity-100 p-1 rounded text-bark-400 hover:text-sage-600 dark:hover:text-sage-300 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-bark-400 dark:text-sage-500 mt-0.5">
                      {wordCount.toLocaleString()} parole &middot; ~{readMin} min
                    </p>
                  </div>

                  {/* Stato */}
                  <div className="flex-shrink-0">
                    {block.is_released ? (
                      <span className="text-[11px] font-medium text-sage-600 dark:text-sage-400 bg-sage-50 dark:bg-sage-800 px-2 py-1 rounded-full">
                        Pubblicato
                      </span>
                    ) : block.scheduled_date ? (
                      <span className="text-[11px] text-bark-400 dark:text-sage-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(block.scheduled_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-bark-300 dark:text-sage-600">Bozza</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Section 3: Tier */}
      <section className="bg-white rounded-2xl border border-sage-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-sage-800 flex items-center gap-2">
          <Crown className="w-5 h-5 text-sage-500" /> Livello di accesso
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'open', label: 'Free', desc: 'Gratuito per tutti. Guadagni da mance.', icon: Unlock, color: 'sage' },
            { value: 'silver_choice', label: 'Silver', desc: 'Incluso in Silver/Gold. Free pagano in token.', icon: Sparkles, color: 'slate' },
            { value: 'gold_exclusive', label: 'Gold', desc: 'Solo Gold. Altri pagano in token.', icon: Crown, color: 'amber' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setAccessLevel(opt.value as any)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                accessLevel === opt.value
                  ? 'border-sage-500 bg-sage-50 ring-1 ring-sage-200'
                  : 'border-sage-100 hover:border-sage-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <opt.icon className={`w-4 h-4 ${accessLevel === opt.value ? 'text-sage-600' : 'text-bark-400'}`} />
                <span className="font-semibold text-sm text-sage-900">{opt.label}</span>
              </div>
              <p className="text-xs text-bark-400 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Section 3: Pricing - only for paid tiers */}
      {accessLevel !== 'open' && (
        <section className="bg-white rounded-2xl border border-sage-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-sage-800 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" /> Prezzo in token
          </h2>

          {/* Price slider */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sage-600">{tokenPrice}</span>
              <span className="text-sm text-bark-400">token/blocco</span>
              <span className="text-sm text-bark-300 ml-1">= €{(tokenPrice * 0.10).toFixed(2)}</span>
            </div>

            <input
              type="range"
              min={5}
              max={30}
              value={tokenPrice}
              onChange={(e) => setTokenPrice(parseInt(e.target.value))}
              className="w-full accent-sage-500"
            />

            <div className="flex justify-between text-xs text-bark-300">
              <span>5 token (€0,50)</span>
              <span>30 token (€3,00)</span>
            </div>
          </div>

          {/* Price full book */}
          <div className="space-y-3 pt-3 border-t border-sage-100">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sage-600">{priceFull}</span>
              <span className="text-sm text-bark-400">token/libro completo</span>
              <span className="text-sm text-bark-300 ml-1">= €{(priceFull * 0.10).toFixed(2)}</span>
            </div>

            <input
              type="range"
              min={20}
              max={200}
              value={priceFull}
              onChange={(e) => setPriceFull(parseInt(e.target.value))}
              className="w-full accent-sage-500"
            />

            <div className="flex justify-between text-xs text-bark-300">
              <span>20 token (€2,00)</span>
              <span>200 token (€20,00)</span>
            </div>
            <p className="text-xs text-bark-400">
              Prezzo per acquistare il libro intero con un unico acquisto.
            </p>
          </div>

          {/* First block free toggle */}
          <div className="flex items-center justify-between py-3 border-t border-sage-100">
            <div>
              <p className="text-sm font-medium text-sage-800">Primo blocco gratuito</p>
              <p className="text-xs text-bark-400 mt-0.5">Permette ai lettori di provare prima di acquistare</p>
            </div>
            <button
              onClick={() => setFirstBlockFree(!firstBlockFree)}
              className={`relative w-12 h-7 rounded-full transition-colors ${firstBlockFree ? 'bg-sage-500' : 'bg-bark-200'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${firstBlockFree ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Summary */}
          {paidBlocks > 0 && tokenPrice > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sage-50 rounded-xl p-4">
                <p className="text-xs text-bark-400 mb-1">Prezzo totale libro</p>
                <p className="text-xl font-bold text-sage-900">{totalPrice} <span className="text-sm font-normal text-bark-400">token</span></p>
                <p className="text-xs text-bark-300 mt-0.5">{paidBlocks} blocchi a pagamento</p>
              </div>
              <div className="bg-sage-50 rounded-xl p-4">
                <p className="text-xs text-bark-400 mb-1">Guadagno stimato</p>
                <p className="text-xl font-bold text-sage-600">€{(totalPrice * 0.10 * 0.70).toFixed(2)}</p>
                <p className="text-xs text-bark-300 mt-0.5">70% payout per unlock</p>
              </div>
            </div>
          )}
        </section>
      )}

      {accessLevel === 'open' && (
        <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-sage-500 shrink-0 mt-0.5" />
          <p className="text-sm text-bark-500 leading-relaxed">
            Con il tier <strong className="text-sage-700">Free</strong>, tutti i blocchi saranno accessibili gratuitamente. Puoi guadagnare tramite le mance dei lettori.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-sage-100">
        <button
          onClick={() => router.push('/dashboard/opere')}
          className="px-5 py-2.5 text-sm font-medium rounded-xl border border-sage-200 text-bark-500 hover:bg-sage-50 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-sage-500 text-white hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva modifiche
        </button>
      </div>
    </div>
  )
}
