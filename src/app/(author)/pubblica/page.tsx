'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { splitTextIntoBlocks, suggestBlockCount, type Block } from '@/lib/block-splitter'
import { toast } from 'sonner'
import {
  Upload, FileText, Scissors, Eye, BookOpen, Calendar,
  Coins, Check, ArrowLeft, ArrowRight, Loader2, X,
  ChevronUp, ChevronDown, Trash2, Edit3, Save, RotateCcw,
  GripVertical, AlertTriangle, Shield
} from 'lucide-react'

// ============================================
// TIPI
// ============================================
interface WizardData {
  file: File | null
  extractedText: string
  blocks: Block[]
  title: string
  description: string
  genre: string
  mood: string
  coverImage: File | null
  coverPreview: string | null
  accessLevel: 'open' | 'silver_choice' | 'gold_exclusive'
  tokenPricePerBlock: number
  priceFull: number
  firstBlockFree: boolean
  scheduledDays: number[] // indici dei giorni selezionati (0 = oggi)
}

const INITIAL_DATA: WizardData = {
  file: null,
  extractedText: '',
  blocks: [],
  title: '',
  description: '',
  genre: '',
  mood: '',
  coverImage: null,
  coverPreview: null,
  accessLevel: 'open',
  tokenPricePerBlock: 10,
  priceFull: 50,
  firstBlockFree: true,
  scheduledDays: [],
}

const STEPS = [
  { id: 1, label: 'Carica file', icon: Upload },
  { id: 2, label: 'Blocchi', icon: Scissors },
  { id: 3, label: 'Revisiona', icon: Eye },
  { id: 4, label: 'Dettagli', icon: BookOpen },
  { id: 5, label: 'Calendario', icon: Calendar },
  { id: 6, label: 'Tier', icon: Shield },
  { id: 7, label: 'Prezzo', icon: Coins },
  { id: 8, label: 'Pubblica', icon: Check },
]

const GENRES = [
  'Fantasy', 'Romanzo', 'Thriller', 'Horror', 'Sci-Fi',
  'Avventura', 'Giallo', 'Storico', 'Poesia', 'Biografia', 'Altro'
]

const MOODS = [
  'Emozionante', 'Misterioso', 'Romantico', 'Avventuroso',
  'Cupo', 'Divertente', 'Riflessivo', 'Intenso'
]

export default function PublishPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [blockCount, setBlockCount] = useState(10)
  const [editingBlock, setEditingBlock] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================
  // STEP 1: UPLOAD FILE
  // ============================================
  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    const validExts = ['.pdf', '.docx', '.txt']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error('Formato non supportato. Usa PDF, DOCX o TXT.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Il file supera i 50MB.')
      return
    }

    setUploading(true)
    setData(prev => ({ ...prev, file }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Errore estrazione testo')
      }

      const suggested = suggestBlockCount(result.characterCount)
      setBlockCount(suggested)

      const blocks = splitTextIntoBlocks(result.text, suggested)

      setData(prev => ({
        ...prev,
        extractedText: result.text,
        blocks,
        title: file.name.replace(/\.(pdf|docx|txt)$/i, ''),
      }))

      toast.success(`File caricato! ${result.wordCount.toLocaleString()} parole estratte.`)
      setStep(2)
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il caricamento')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  // ============================================
  // STEP 2: CONFIGURA BLOCCHI
  // ============================================
  const recalculateBlocks = useCallback((count: number) => {
    if (!data.extractedText) return
    setBlockCount(count)
    const blocks = splitTextIntoBlocks(data.extractedText, count)
    setData(prev => ({ ...prev, blocks }))
  }, [data.extractedText])

  // ============================================
  // STEP 3: REVISIONA BLOCCHI
  // ============================================
  const startEditBlock = (blockNum: number) => {
    const block = data.blocks.find(b => b.number === blockNum)
    if (block) {
      setEditingBlock(blockNum)
      setEditContent(block.content)
    }
  }

  const saveEditBlock = () => {
    if (editingBlock === null) return
    const wordCount = editContent.trim().split(/\s+/).filter(Boolean).length
    if (wordCount < 3000) {
      toast.error('Il blocco è troppo corto — durata minima 15 minuti di lettura (circa 3.000 parole)')
      return
    }
    setData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.number === editingBlock
          ? {
              ...b,
              content: editContent,
              characterCount: editContent.length,
              wordCount,
            }
          : b
      ),
    }))
    setEditingBlock(null)
    setEditContent('')
    toast.success('Blocco aggiornato')
  }

  const mergeBlocks = (blockNum: number) => {
    const idx = data.blocks.findIndex(b => b.number === blockNum)
    if (idx < data.blocks.length - 1) {
      const merged = data.blocks[idx].content + '\n\n' + data.blocks[idx + 1].content
      const newBlocks = data.blocks
        .filter((_, i) => i !== idx + 1)
        .map((b, i) => ({
          ...b,
          number: i + 1,
          ...(i === idx ? {
            content: merged,
            characterCount: merged.length,
            wordCount: merged.split(/\s+/).length,
            title: b.title,
          } : {}),
        }))
      setData(prev => ({ ...prev, blocks: newBlocks }))
      toast.success('Blocchi uniti')
    }
  }

  const splitBlock = (blockNum: number) => {
    const block = data.blocks.find(b => b.number === blockNum)
    if (!block) return

    // Verifica che entrambe le metà avranno almeno 3000 parole
    const totalWords = block.content.trim().split(/\s+/).filter(Boolean).length
    if (totalWords < 6000) {
      toast.error('Non puoi dividere: entrambi i blocchi risultanti devono avere almeno 3.000 parole')
      return
    }

    const mid = Math.floor(block.content.length / 2)
    // Trova il punto migliore per dividere (fine paragrafo o frase)
    let splitPoint = block.content.indexOf('\n\n', mid - 200)
    if (splitPoint === -1 || splitPoint > mid + 200) {
      const sentEnd = block.content.substring(mid - 200, mid + 200).search(/[.!?]\s/)
      splitPoint = sentEnd !== -1 ? mid - 200 + sentEnd + 2 : mid
    }

    const part1 = block.content.substring(0, splitPoint).trim()
    const part2 = block.content.substring(splitPoint).trim()

    const newBlocks = [
      ...data.blocks.slice(0, blockNum - 1),
      { ...block, content: part1, characterCount: part1.length, wordCount: part1.split(/\s+/).length },
      { number: blockNum + 1, title: `Blocco ${blockNum + 1}`, content: part2, characterCount: part2.length, wordCount: part2.split(/\s+/).length, startsAtChapter: false },
      ...data.blocks.slice(blockNum),
    ].map((b, i) => ({ ...b, number: i + 1 }))

    setData(prev => ({ ...prev, blocks: newBlocks }))
    toast.success('Blocco diviso')
  }

  const deleteBlock = (blockNum: number) => {
    if (data.blocks.length <= 2) {
      toast.error('Servono almeno 2 blocchi')
      return
    }
    const newBlocks = data.blocks
      .filter(b => b.number !== blockNum)
      .map((b, i) => ({ ...b, number: i + 1 }))
    setData(prev => ({ ...prev, blocks: newBlocks }))
    toast.success('Blocco eliminato')
  }

  // ============================================
  // STEP 5: CALENDARIO
  // ============================================
  const toggleDay = (dayIndex: number) => {
    setData(prev => {
      const current = prev.scheduledDays
      if (current.includes(dayIndex)) {
        return { ...prev, scheduledDays: current.filter(d => d !== dayIndex) }
      }

      // Controlla: max 2 per settimana
      const weekNum = Math.floor(dayIndex / 7)
      const daysInSameWeek = current.filter(d => Math.floor(d / 7) === weekNum)
      if (daysInSameWeek.length >= 2) {
        toast.error('Massimo 2 uscite a settimana!')
        return prev
      }

      // Max totale = numero blocchi
      if (current.length >= prev.blocks.length) {
        toast.error('Hai selezionato abbastanza date per tutti i blocchi')
        return prev
      }

      return { ...prev, scheduledDays: [...current, dayIndex].sort((a, b) => a - b) }
    })
  }

  // ============================================
  // STEP 7: PUBBLICA
  // ============================================
  const handlePublish = async () => {
    if (!user || !profile) {
      alert('Devi essere autenticato per pubblicare.')
      return
    }

    if (data.scheduledDays.length < data.blocks.length) {
      alert(`Seleziona ${data.blocks.length} date nel calendario (una per blocco)`)
      return
    }

    // Validazione: max 16 blocchi
    if (data.blocks.length > 16) {
      toast.error('Un libro può avere massimo 16 blocchi.')
      return
    }

    // Validazione: minimo 3000 parole per blocco
    const shortBlock = data.blocks.find(b => b.content.trim().split(/\s+/).filter(Boolean).length < 3000)
    if (shortBlock) {
      toast.error(`Blocco ${shortBlock.number} troppo corto — minimo 3.000 parole (15 min di lettura)`)
      return
    }

    setPublishing(true)

    try {
      // 1. Upload cover
      let coverUrl = null
      if (data.coverImage) {
        console.log('📸 Upload cover...')
        const ext = data.coverImage.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(path, data.coverImage)

        if (uploadError) {
          console.error('⚠️ Errore upload cover:', JSON.stringify(uploadError))
        } else {
          const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
          coverUrl = urlData.publicUrl
          console.log('✅ Cover caricata:', coverUrl)
        }
      }

      // 2. Calcola date
      const today = new Date()
      const scheduledDates = data.scheduledDays.map(dayIndex => {
        const date = new Date(today)
        date.setDate(date.getDate() + dayIndex)
        return date.toISOString()
      })
      console.log('📅 Date calcolate:', scheduledDates.length)

      // 3. Inserisci libro
      const bookPayload = {
        author_id: user.id,
        title: data.title,
        description: data.description || null,
        cover_image_url: coverUrl,
        genre: data.genre,
        mood: data.mood || null,
        total_blocks: data.blocks.length,
        access_level: data.accessLevel,
        token_price_per_block: data.accessLevel === 'open' ? 0 : data.tokenPricePerBlock,
        price_full: data.accessLevel === 'open' ? 0 : data.priceFull,
        first_block_free: data.accessLevel === 'open' ? true : data.firstBlockFree,
        status: 'ongoing',
        scheduled_releases: scheduledDates,
        publication_start_date: scheduledDates[0],
        publication_end_date: scheduledDates[scheduledDates.length - 1],
        published_at: new Date().toISOString(),
        serialization_start: new Date().toISOString(),
        serialization_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // max 2 mesi
      }
      console.log('📚 Inserimento libro...')

      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert(bookPayload)
        .select()
        .single()

      if (bookError) {
        console.error('❌ ERRORE LIBRO:', JSON.stringify(bookError))
        alert('Errore creazione libro: ' + (bookError.message || bookError.details || bookError.hint || 'Errore sconosciuto'))
        setPublishing(false)
        return
      }
      console.log('✅ Libro creato:', book.id)

      // 3b. Validazione backend: max blocchi e limite settimanale
      const { data: validation, error: valError } = await supabase
        .rpc('validate_block_publication', {
          p_book_id: book.id,
          p_author_id: user.id,
          p_block_count: data.blocks.length,
        })

      if (valError) {
        console.warn('⚠️ Validazione RPC non disponibile, proseguo:', valError.message)
      } else if (validation && !validation.valid) {
        console.error('❌ VALIDAZIONE FALLITA:', validation)
        toast.error(validation.message || 'Errore di validazione pubblicazione')
        await supabase.from('books').delete().eq('id', book.id)
        setPublishing(false)
        return
      }

      // 4. Inserisci blocchi
      const blocksToInsert = data.blocks.map((block, index) => ({
        book_id: book.id,
        block_number: block.number,
        title: block.title || `Blocco ${block.number}`,
        content: block.content,
        character_count: block.characterCount,
        word_count: block.wordCount,
        token_price: data.accessLevel === 'open' ? 0 : data.tokenPricePerBlock,
        scheduled_date: scheduledDates[index] || null,
        is_released: index === 0,
        released_at: index === 0 ? new Date().toISOString() : null,
      }))
      console.log('📝 Inserimento', blocksToInsert.length, 'blocchi...')

      const { error: blocksError } = await supabase
        .from('blocks')
        .insert(blocksToInsert)

      if (blocksError) {
        console.error('❌ ERRORE BLOCCHI:', JSON.stringify(blocksError))
        alert('Errore creazione blocchi: ' + (blocksError.message || blocksError.details || 'Errore sconosciuto'))
        await supabase.from('books').delete().eq('id', book.id)
        setPublishing(false)
        return
      }
      console.log('✅ Blocchi creati')

      // 5. Upload file originale (opzionale, con timeout 10s)
      if (data.file) {
        console.log('📁 Upload file originale...')
        try {
          const filePath = `${user.id}/${book.id}/${data.file.name}`
          const uploadPromise = supabase.storage.from('book-files').upload(filePath, data.file)
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout upload file')), 10000))
          await Promise.race([uploadPromise, timeoutPromise])
          console.log('✅ File caricato')
        } catch (e: any) {
          console.warn('⚠️ Upload file fallito (non bloccante):', e?.message)
        }
      }

      // SUCCESSO
      console.log('🎉 PUBBLICAZIONE COMPLETATA')
      alert('Libro pubblicato con successo!')
      setTimeout(() => {
        window.location.href = '/dashboard/opere'
      }, 300)

    } catch (err: any) {
      console.error('💥 ERRORE IMPREVISTO:', err)
      alert('Errore imprevisto: ' + (err?.message || String(err)))
    } finally {
      setPublishing(false)
    }
  }

  // ============================================
  // NAVIGAZIONE
  // ============================================
  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return data.blocks.length > 0
      case 2: return data.blocks.length >= 2
      case 3: return true
      case 4: return data.title.length > 0 && data.genre.length > 0 && data.description.trim().length >= 150 && data.coverImage !== null
      case 5: return data.scheduledDays.length === data.blocks.length
      case 6: return true // Tier
      case 7: return true // Price
      default: return false
    }
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="bg-white border-b border-sage-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-bark-500 hover:text-sage-700 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
            <h1 className="text-lg font-bold text-sage-900">Pubblica un libro</h1>
            <div className="text-sm text-bark-400">Passo {step} di {data.accessLevel === 'open' ? 7 : 8}</div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1">
            {STEPS.filter(s => !(s.id === 7 && data.accessLevel === 'open')).map((s) => (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    s.id <= step ? 'bg-sage-500' : 'bg-sage-100'
                  }`}
                />
                <span className={`text-[10px] hidden sm:block ${s.id <= step ? 'text-sage-700 font-medium' : 'text-bark-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ---- STEP 1: UPLOAD ---- */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Carica il tuo libro</h2>
              <p className="text-bark-500 mt-2">Supporta PDF, DOCX e TXT (max 50MB)</p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                uploading ? 'border-sage-400 bg-sage-50' : 'border-sage-200 hover:border-sage-400 hover:bg-sage-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />

              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 text-sage-500 mx-auto animate-spin" />
                  <p className="text-sage-700 font-medium">Estrazione testo in corso...</p>
                  <p className="text-sm text-bark-400">Potrebbe richiedere qualche secondo per file grandi</p>
                </div>
              ) : data.file ? (
                <div className="space-y-3">
                  <FileText className="w-12 h-12 text-sage-500 mx-auto" />
                  <p className="text-sage-800 font-medium">{data.file.name}</p>
                  <p className="text-sm text-bark-400">
                    {data.extractedText.split(/\s+/).length.toLocaleString()} parole estratte &bull; {data.blocks.length} blocchi
                  </p>
                  <button className="text-sm text-sage-600 hover:text-sage-700 underline">
                    Cambia file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-sage-300 mx-auto" />
                  <p className="text-sage-800 font-medium">Trascina il tuo file qui</p>
                  <p className="text-sm text-bark-400">oppure clicca per selezionarlo</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- STEP 2: CONFIGURA BLOCCHI ---- */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Dividi in blocchi</h2>
              <p className="text-bark-500 mt-2">
                Il tuo libro verrà diviso automaticamente. Usa lo slider per cambiare il numero di blocchi.
              </p>
            </div>

            {/* Blocchi consigliati */}
            <div className="p-4 bg-sage-50 rounded-xl mb-6 flex items-center gap-3">
              <Scissors className="w-5 h-5 text-sage-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-sage-700">
                  Consigliati: <strong>{suggestBlockCount(data.extractedText.length)} blocchi</strong>
                </p>
                <p className="text-xs text-bark-400">
                  Basato su {data.extractedText.split(/\s+/).length.toLocaleString()} parole totali (~4.000 caratteri/blocco)
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sage-100 p-8">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-sage-800">Numero di blocchi</label>
                  <span className="text-2xl font-bold text-sage-600">{blockCount}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={Math.min(16, Math.floor(data.extractedText.length / 500))}
                  value={blockCount}
                  onChange={(e) => recalculateBlocks(parseInt(e.target.value))}
                  className="w-full accent-sage-500"
                />
                <div className="flex justify-between text-xs text-bark-400 mt-1">
                  <span>Pochi blocchi (più lunghi)</span>
                  <span>Tanti blocchi (più corti)</span>
                </div>
              </div>

              {/* Tempo totale stimato */}
              <div className="p-3 bg-cream-200 rounded-xl mb-6 text-center">
                <p className="text-xs text-bark-400">Tempo di lettura totale stimato</p>
                <p className="text-lg font-bold text-sage-700">
                  ~{Math.ceil(data.extractedText.split(/\s+/).length / 200)} minuti
                </p>
                <p className="text-xs text-bark-400">
                  (~{Math.ceil(data.extractedText.split(/\s+/).length / 200 / data.blocks.length)} min per blocco)
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-sage-800">Anteprima blocchi:</p>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {data.blocks.map((block) => {
                    const readingMin = Math.max(1, Math.ceil(block.wordCount / 200))
                    return (
                      <div
                        key={block.number}
                        className="flex items-center justify-between p-3 bg-sage-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-sage-200 rounded-lg flex items-center justify-center text-sm font-bold text-sage-700">
                            {block.number}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-sage-800">{block.title}</p>
                            <p className="text-xs text-bark-400">
                              {block.wordCount.toLocaleString()} parole &bull; ~{readingMin} min di lettura
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {block.startsAtChapter && (
                            <span className="text-xs bg-sage-200 text-sage-700 px-2 py-0.5 rounded-full">
                              Capitolo
                            </span>
                          )}
                          <span className="text-[10px] text-bark-300">
                            {block.characterCount.toLocaleString()} car.
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP 3: REVISIONA BLOCCHI ---- */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Revisiona i blocchi</h2>
              <p className="text-bark-500 mt-2">
                Controlla ogni blocco. Puoi modificare il testo, unire o dividere blocchi, e riordinare.
              </p>
            </div>

            <div className="space-y-4">
              {data.blocks.map((block) => (
                <div
                  key={block.number}
                  className="bg-white rounded-2xl border border-sage-100 overflow-hidden"
                >
                  {/* Block header */}
                  <div className="flex items-center justify-between p-4 border-b border-sage-50 bg-sage-50/50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-bark-300" />
                      <span className="w-8 h-8 bg-sage-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {block.number}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-sage-800">{block.title}</p>
                        <p className="text-xs text-bark-400">
                          {block.wordCount} parole &bull; ~{Math.ceil(block.wordCount / 200)} min lettura
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditBlock(block.number)}
                        className="p-2 text-bark-400 hover:text-sage-600 hover:bg-sage-100 rounded-lg transition-colors"
                        title="Modifica testo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => splitBlock(block.number)}
                        className="p-2 text-bark-400 hover:text-sage-600 hover:bg-sage-100 rounded-lg transition-colors"
                        title="Dividi blocco"
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                      {block.number < data.blocks.length && (
                        <button
                          onClick={() => mergeBlocks(block.number)}
                          className="p-2 text-bark-400 hover:text-sage-600 hover:bg-sage-100 rounded-lg transition-colors"
                          title="Unisci col successivo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteBlock(block.number)}
                        className="p-2 text-bark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina blocco"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Block content */}
                  {editingBlock === block.number ? (
                    <div className="p-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 p-4 border border-sage-200 rounded-xl text-sm font-serif leading-relaxed resize-y focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none"
                      />
                      <div className="mt-3">
                        {(() => {
                          const wc = editContent.trim().split(/\s+/).filter(Boolean).length
                          const isTooShort = wc < 3000
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <p className={`text-xs ${isTooShort ? 'text-red-500 font-medium' : 'text-bark-400'}`}>
                                  {wc.toLocaleString()} / 3.000 parole {isTooShort ? '— troppo corto' : ''}
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setEditingBlock(null); setEditContent('') }}
                                    className="px-4 py-2 text-sm text-bark-500 hover:bg-sage-50 rounded-lg"
                                  >
                                    Annulla
                                  </button>
                                  <button
                                    onClick={saveEditBlock}
                                    disabled={isTooShort}
                                    className="flex items-center gap-1 px-4 py-2 text-sm bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    Salva
                                  </button>
                                </div>
                              </div>
                              {isTooShort && (
                                <p className="text-xs text-red-500 mt-1">
                                  Durata minima 15 minuti di lettura (circa 3.000 parole)
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="max-h-32 overflow-hidden relative">
                        <p className="text-sm text-bark-600 font-serif leading-relaxed whitespace-pre-wrap">
                          {block.content.substring(0, 500)}
                          {block.content.length > 500 && '...'}
                        </p>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white" />
                      </div>

                      {/* Avviso se blocco troppo corto */}
                      {block.wordCount < 3000 && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-700">
                            Blocco troppo corto: {block.wordCount.toLocaleString()} / 3.000 parole — durata minima 15 min di lettura
                          </p>
                        </div>
                      )}

                      {/* Avviso se finisce a metà frase */}
                      {block.number < data.blocks.length && !/[.!?…»"']\s*$/.test(block.content.trim()) && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-amber-700">
                            Questo blocco potrebbe finire a metà frase. Clicca su &quot;Modifica&quot; per correggerlo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-sage-50 rounded-xl">
              <button
                onClick={() => recalculateBlocks(blockCount)}
                className="flex items-center gap-2 text-sm text-sage-600 hover:text-sage-700"
              >
                <RotateCcw className="w-4 h-4" />
                Ricalcola blocchi automaticamente
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 4: DETTAGLI ---- */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Dettagli del libro</h2>
              <p className="text-bark-500 mt-2">Aggiungi le informazioni che i lettori vedranno</p>
            </div>

            <div className="bg-white rounded-2xl border border-sage-100 p-8 space-y-6">
              {/* Titolo */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Titolo *</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Il titolo del tuo libro"
                  className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none text-sm"
                />
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Descrizione *</label>
                <textarea
                  value={data.description}
                  onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Di cosa parla il tuo libro? Cattura l'attenzione dei lettori... (minimo 150 caratteri)"
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none text-sm resize-y ${
                    data.description.trim().length > 0 && data.description.trim().length < 150
                      ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-200'
                      : 'border-sage-200 focus:border-sage-400 focus:ring-sage-200'
                  }`}
                />
                <div className="flex justify-between mt-1.5">
                  <p className={`text-xs ${
                    data.description.trim().length >= 150 ? 'text-green-600' : 'text-bark-400'
                  }`}>
                    {data.description.trim().length >= 150 ? '✓' : '✎'} {data.description.trim().length}/150 caratteri {data.description.trim().length < 150 ? '(minimo)' : ''}
                  </p>
                </div>
              </div>

              {/* Genere */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Genere *</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setData(prev => ({ ...prev, genre: g }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        data.genre === g
                          ? 'bg-sage-500 text-white'
                          : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Mood</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setData(prev => ({ ...prev, mood: m }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        data.mood === m
                          ? 'bg-sage-500 text-white'
                          : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Copertina *</label>
                <div className="flex items-start gap-4">
                  {data.coverPreview ? (
                    <div className="relative w-32 h-44 rounded-xl overflow-hidden border border-sage-200">
                      <img src={data.coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setData(prev => ({ ...prev, coverImage: null, coverPreview: null }))}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-44 rounded-xl border-2 border-dashed border-sage-200 flex flex-col items-center justify-center cursor-pointer hover:border-sage-400 hover:bg-sage-50/50 transition-all">
                      <Upload className="w-6 h-6 text-sage-300 mb-1" />
                      <span className="text-xs text-bark-400">Carica</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setData(prev => ({
                              ...prev,
                              coverImage: file,
                              coverPreview: URL.createObjectURL(file),
                            }))
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-xs text-bark-400 mt-2">
                    Formato consigliato: 600x800px, JPG o PNG
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP 5: CALENDARIO ---- */}
        {step === 5 && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Calendario uscite</h2>
              <p className="text-bark-500 mt-2">
                Seleziona <strong>{data.blocks.length} date</strong> per la pubblicazione dei blocchi.
                Massimo 2 uscite a settimana, entro 8 settimane.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-sage-100 p-6">
              {/* Info */}
              <div className="flex items-center justify-between mb-6 p-3 bg-sage-50 rounded-xl">
                <span className="text-sm text-sage-700">
                  Selezionati: <strong>{data.scheduledDays.length}</strong> / {data.blocks.length}
                </span>
                {data.scheduledDays.length > 0 && (
                  <button
                    onClick={() => setData(prev => ({ ...prev, scheduledDays: [] }))}
                    className="text-xs text-bark-400 hover:text-red-500"
                  >
                    Resetta
                  </button>
                )}
              </div>

              {/* Calendar grid - 8 settimane */}
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-bark-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {Array.from({ length: 8 }).map((_, weekIdx) => {
                  const daysInWeek = data.scheduledDays.filter(d => Math.floor(d / 7) === weekIdx)
                  return (
                    <div key={weekIdx}>
                      <p className="text-xs text-bark-400 mb-1">Settimana {weekIdx + 1}</p>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 7 }).map((_, dayIdx) => {
                          const dayIndex = weekIdx * 7 + dayIdx
                          const isSelected = data.scheduledDays.includes(dayIndex)
                          const isToday = dayIndex === 0
                          const blockNum = data.scheduledDays.indexOf(dayIndex) + 1

                          // Calcola la data reale
                          const date = new Date()
                          date.setDate(date.getDate() + dayIndex)

                          return (
                            <button
                              key={dayIdx}
                              onClick={() => toggleDay(dayIndex)}
                              className={`relative aspect-square rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-sage-500 text-white shadow-sm'
                                  : daysInWeek.length >= 2
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                              } ${isToday ? 'ring-2 ring-sage-400' : ''}`}
                              disabled={!isSelected && daysInWeek.length >= 2}
                            >
                              <span>{date.getDate()}/{date.getMonth() + 1}</span>
                              {isSelected && (
                                <span className="text-[9px] font-bold">B{blockNum}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP 6: TIER ---- */}
        {step === 6 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Livello di accesso</h2>
              <p className="text-bark-500 mt-2">Scegli chi potrà leggere il tuo libro</p>
            </div>

            <div className="bg-white rounded-2xl border border-sage-100 p-8 space-y-8">
              {/* Livello accesso */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-3">Chi può leggere?</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'open', label: 'Tutti (Free)', desc: 'Aperto a tutti i lettori, senza costo' },
                    { value: 'silver_choice', label: 'Silver+', desc: 'Solo Silver e Gold' },
                    { value: 'gold_exclusive', label: 'Gold', desc: 'Solo abbonati Gold' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setData(prev => ({ ...prev, accessLevel: opt.value as any }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        data.accessLevel === opt.value
                          ? 'border-sage-500 bg-sage-50'
                          : 'border-sage-100 hover:border-sage-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-sage-800">{opt.label}</p>
                      <p className="text-xs text-bark-400 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {data.accessLevel === 'open' && (
                <div className="p-4 bg-green-50 rounded-xl text-sm text-green-700">
                  <p className="font-medium">Libro gratuito</p>
                  <p className="text-xs mt-1 opacity-80">Tutti potranno leggere i tuoi blocchi senza spendere token. Passerai direttamente al riepilogo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- STEP 7: PREZZO (solo se Silver/Gold) ---- */}
        {step === 7 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Prezzo in token</h2>
              <p className="text-bark-500 mt-2">Imposta il prezzo per ogni blocco</p>
            </div>

            <div className="bg-white rounded-2xl border border-sage-100 p-8 space-y-8">
              {/* Primo blocco gratis */}
              <div className="flex items-center justify-between p-4 bg-sage-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-sage-800">Primo blocco gratis</p>
                  <p className="text-xs text-bark-400 mt-0.5">I lettori possono leggere il primo blocco senza token</p>
                </div>
                <button
                  onClick={() => setData(prev => ({ ...prev, firstBlockFree: !prev.firstBlockFree }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    data.firstBlockFree ? 'bg-sage-500' : 'bg-bark-200'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    data.firstBlockFree ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Prezzo per blocco */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-sage-800">Token per blocco</label>
                  <div className="text-right">
                    <span className="text-xl font-bold text-sage-600">{data.tokenPricePerBlock}</span>
                    <span className="text-sm text-bark-400 ml-1">= €{(data.tokenPricePerBlock * 0.10).toFixed(2)}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={data.tokenPricePerBlock}
                  onChange={(e) => setData(prev => ({ ...prev, tokenPricePerBlock: parseInt(e.target.value) }))}
                  className="w-full accent-sage-500"
                />
                <div className="flex justify-between text-xs text-bark-400 mt-1">
                  <span>5 token (€0,50)</span>
                  <span>30 token (€3,00)</span>
                </div>

                {/* Messaggio consiglio dinamico */}
                <div className={`mt-3 p-3 rounded-xl text-sm flex items-start gap-2 transition-all ${
                  data.tokenPricePerBlock <= 10
                    ? 'bg-green-50 text-green-700'
                    : data.tokenPricePerBlock <= 20
                      ? 'bg-emerald-50 text-emerald-700'
                      : data.tokenPricePerBlock <= 30
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                }`}>
                  <span className="text-base flex-shrink-0">
                    {data.tokenPricePerBlock <= 10 ? '🎯' : data.tokenPricePerBlock <= 20 ? '👍' : data.tokenPricePerBlock <= 30 ? '⚠️' : '🚫'}
                  </span>
                  <div>
                    {data.tokenPricePerBlock <= 10 && (
                      <>
                        <p className="font-medium">Prezzo consigliato!</p>
                        <p className="text-xs mt-0.5 opacity-80">Tra €0,10 e €1,00 a blocco è il range perfetto per attirare più lettori e ottenere più vendite.</p>
                      </>
                    )}
                    {data.tokenPricePerBlock > 10 && data.tokenPricePerBlock <= 20 && (
                      <>
                        <p className="font-medium">Buon prezzo</p>
                        <p className="text-xs mt-0.5 opacity-80">€{(data.tokenPricePerBlock * 0.10).toFixed(2)} a blocco è un prezzo ragionevole. Per massimizzare i lettori consigliamo di restare sotto €1,00.</p>
                      </>
                    )}
                    {data.tokenPricePerBlock > 20 && data.tokenPricePerBlock <= 30 && (
                      <>
                        <p className="font-medium">Prezzo alto</p>
                        <p className="text-xs mt-0.5 opacity-80">€{(data.tokenPricePerBlock * 0.10).toFixed(2)} a blocco potrebbe scoraggiare molti lettori. Ti consigliamo di restare tra 1 e 20 token (€0,10-€2,00).</p>
                      </>
                    )}
                    {data.tokenPricePerBlock > 30 && (
                      <>
                        <p className="font-medium">Prezzo molto alto</p>
                        <p className="text-xs mt-0.5 opacity-80">€{(data.tokenPricePerBlock * 0.10).toFixed(2)} a blocco è ben oltre il consigliato. La maggior parte dei lettori preferisce blocchi tra €0,10 e €2,00. Rischi di perdere pubblico.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Prezzo libro completo */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-sage-800">Prezzo libro completo (token)</label>
                  <div className="text-right">
                    <span className="text-xl font-bold text-sage-600">{data.priceFull}</span>
                    <span className="text-sm text-bark-400 ml-1">= €{(data.priceFull * 0.10).toFixed(2)}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={data.priceFull}
                  onChange={(e) => setData(prev => ({ ...prev, priceFull: parseInt(e.target.value) }))}
                  className="w-full accent-sage-500"
                />
                <div className="flex justify-between text-xs text-bark-400 mt-1">
                  <span>20 token (€2,00)</span>
                  <span>200 token (€20,00)</span>
                </div>
                <p className="text-xs text-bark-400 mt-2">
                  Il prezzo che un lettore paga per acquistare il libro intero con un unico acquisto, anziché blocco per blocco.
                </p>
              </div>

              {/* Riepilogo guadagni stimati */}
              <div className="p-4 bg-cream-200 rounded-xl">
                <p className="text-sm font-medium text-sage-800 mb-2">Stima guadagni</p>
                <p className="text-xs text-bark-500">
                  Con {data.blocks.length} blocchi a {data.tokenPricePerBlock} token ciascuno
                  {data.firstBlockFree ? ' (primo gratis)' : ''}:
                </p>
                <p className="text-lg font-bold text-sage-700 mt-1">
                  {((data.blocks.length - (data.firstBlockFree ? 1 : 0)) * data.tokenPricePerBlock)} token per lettore
                </p>
                <p className="text-sm text-sage-600 mt-1">
                  ≈ €{(((data.blocks.length - (data.firstBlockFree ? 1 : 0)) * data.tokenPricePerBlock) * 0.10).toFixed(2)} per lettore
                </p>
                <p className="text-[11px] text-bark-400 mt-2">
                  1 token = €0,10 · 10 token = €1,00
                </p>
              </div>

              {/* Prezzo singolo blocco in € */}
              <div className="p-3 bg-sage-50 rounded-xl flex items-center justify-between">
                <span className="text-sm text-bark-500">Prezzo per blocco</span>
                <span className="text-sm font-semibold text-sage-700">
                  {data.tokenPricePerBlock} token = €{(data.tokenPricePerBlock * 0.10).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP 8: RIEPILOGO E PUBBLICA ---- */}
        {step === 8 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-sage-900">Riepilogo</h2>
              <p className="text-bark-500 mt-2">Controlla tutto prima di pubblicare</p>
            </div>

            <div className="bg-white rounded-2xl border border-sage-100 p-8 space-y-6">
              <div className="flex items-start gap-4">
                {data.coverPreview ? (
                  <img src={data.coverPreview} alt="Cover" className="w-24 h-32 rounded-xl object-cover" />
                ) : (
                  <div className="w-24 h-32 rounded-xl bg-sage-100 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-sage-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-sage-900">{data.title}</h3>
                  <p className="text-sm text-bark-400 mt-1">{data.genre} {data.mood ? `• ${data.mood}` : ''}</p>
                  {data.description && (
                    <p className="text-sm text-bark-500 mt-2 line-clamp-2">{data.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Blocchi', value: data.blocks.length },
                  { label: 'Accesso', value: data.accessLevel === 'open' ? 'Tutti (Free)' : data.accessLevel === 'silver_choice' ? 'Silver+' : 'Gold' },
                  ...(data.accessLevel !== 'open' ? [
                    { label: 'Prezzo/blocco', value: `${data.tokenPricePerBlock} token` },
                    { label: 'Prezzo completo', value: `${data.priceFull} token (€${(data.priceFull * 0.10).toFixed(2)})` },
                    { label: 'Primo gratis', value: data.firstBlockFree ? 'Si' : 'No' },
                  ] : []),
                  { label: 'Uscite', value: `${data.scheduledDays.length} date` },
                  { label: 'Parole totali', value: data.extractedText.split(/\s+/).length.toLocaleString() },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-sage-50 rounded-xl">
                    <p className="text-xs text-bark-400">{item.label}</p>
                    <p className="text-sm font-semibold text-sage-800">{item.value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-4 bg-sage-500 text-white rounded-xl font-medium text-lg hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Pubblicazione in corso...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Pubblica il libro
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---- NAVIGATION BUTTONS ---- */}
        {step < 8 ? (
          <div className="flex items-center justify-between mt-8 max-w-2xl mx-auto">
            <button
              onClick={() => {
                const prev = step - 1
                // Skip price step (7) going backwards if accessLevel is 'open'
                setStep(prev === 7 && data.accessLevel === 'open' ? 6 : Math.max(1, prev))
              }}
              disabled={step === 1}
              className="flex items-center gap-1 px-4 py-2 text-sm text-bark-500 hover:text-sage-700 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
            <button
              onClick={() => {
                const next = step + 1
                // Skip price step (7) if accessLevel is 'open'
                setStep(next === 7 && data.accessLevel === 'open' ? 8 : Math.min(8, next))
              }}
              disabled={!canGoNext()}
              className="flex items-center gap-1 px-6 py-2.5 text-sm bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Avanti
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center mt-8 max-w-2xl mx-auto">
            <button
              onClick={() => setStep(data.accessLevel === 'open' ? 6 : 7)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-bark-500 hover:text-sage-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna indietro per modificare
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
