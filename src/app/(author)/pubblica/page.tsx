'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { splitTextIntoBlocks, suggestBlockCount, type Block } from '@/lib/block-splitter'
import { toast } from 'sonner'
import {
  Upload, FileText, Scissors, Eye, BookOpen, Calendar,
  Coins, Check, ArrowLeft, ArrowRight, Loader2, X,
  ChevronUp, ChevronDown, Trash2, Edit3, Save, RotateCcw,
  GripVertical, AlertTriangle, Shield,
  Bold, Italic, List, Heading2, Undo2, PanelRightOpen, PanelRightClose, Crop
} from 'lucide-react'
import CoverCropper from '@/components/ui/CoverCropper'
import BookMockup from '@/components/ui/BookMockup'

// ============================================
// TIPI
// ============================================
interface WizardData {
  file: File | null
  extractedText: string
  blocks: Block[]
  title: string
  description: string
  macroCategory: string
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
  macroCategory: '',
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

import { MACRO_AREAS, getMacroAreaByValue } from '@/lib/genres'

const MOODS = [
  'Emozionante', 'Misterioso', 'Romantico', 'Avventuroso',
  'Cupo', 'Divertente', 'Riflessivo', 'Intenso'
]

const DRAFT_KEY = 'libra_publish_draft'

// Interfaccia bozza serializzabile (esclusi File non serializzabili)
interface DraftPayload {
  step: number
  blockCount: number
  data: Omit<WizardData, 'file' | 'coverImage' | 'coverPreview'> & {
    fileName: string | null
  }
  savedAt: string
}

function saveDraft(step: number, blockCount: number, data: WizardData) {
  try {
    const payload: DraftPayload = {
      step,
      blockCount,
      data: {
        extractedText: data.extractedText,
        blocks: data.blocks,
        title: data.title,
        description: data.description,
        macroCategory: data.macroCategory,
        genre: data.genre,
        mood: data.mood,
        accessLevel: data.accessLevel,
        tokenPricePerBlock: data.tokenPricePerBlock,
        priceFull: data.priceFull,
        firstBlockFree: data.firstBlockFree,
        scheduledDays: data.scheduledDays,
        fileName: data.file?.name || null,
      },
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  } catch { /* quota exceeded or private mode */ }
}

function loadDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as DraftPayload
    // Bozza valida solo se ha testo estratto (step >= 2)
    if (!draft.data?.extractedText) return null
    return draft
  } catch {
    return null
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
}

export default function PublishPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [blockCount, setBlockCount] = useState(10)
  const [editingBlock, setEditingBlock] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  // Zone di giunzione: blocchi adiacenti modificabili dal modale
  const [editPrevContent, setEditPrevContent] = useState('')
  const [editNextContent, setEditNextContent] = useState('')
  const [editPrevBlockNum, setEditPrevBlockNum] = useState<number | null>(null)
  const [editNextBlockNum, setEditNextBlockNum] = useState<number | null>(null)
  // Bozza
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null) // immagine raw per il cropper
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(null)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================
  // AUTO-SAVE & DRAFT RECOVERY
  // ============================================
  // Rileva bozza al mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setPendingDraft(draft)
      setShowDraftPrompt(true)
    }
  }, [])

  // Auto-save debounced: salva dopo 1.5s dall'ultima modifica
  useEffect(() => {
    // Non salvare se siamo allo step 1 senza testo o se stiamo pubblicando
    if (!data.extractedText || publishing) return
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = setTimeout(() => {
      saveDraft(step, blockCount, data)
    }, 1500)
    return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current) }
  }, [step, blockCount, data, publishing])

  // Force-save immediato dopo spostamenti/undo nell'editor
  useEffect(() => {
    const forceSave = () => {
      if (!data.extractedText || publishing) return
      saveDraft(step, blockCount, data)
    }
    window.addEventListener('libra-force-save', forceSave)
    return () => window.removeEventListener('libra-force-save', forceSave)
  }, [step, blockCount, data, publishing])

  const resumeDraft = () => {
    if (!pendingDraft) return
    const d = pendingDraft.data
    setData(prev => ({
      ...prev,
      extractedText: d.extractedText,
      blocks: d.blocks,
      title: d.title,
      description: d.description,
      macroCategory: d.macroCategory,
      genre: d.genre,
      mood: d.mood,
      accessLevel: d.accessLevel,
      tokenPricePerBlock: d.tokenPricePerBlock,
      priceFull: d.priceFull,
      firstBlockFree: d.firstBlockFree,
      scheduledDays: d.scheduledDays,
    }))
    setBlockCount(pendingDraft.blockCount)
    setStep(pendingDraft.step)
    setShowDraftPrompt(false)
    setPendingDraft(null)
    toast.success('Bozza ripristinata')
  }

  const discardDraft = () => {
    clearDraft()
    setShowDraftPrompt(false)
    setPendingDraft(null)
  }

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
  const updateBlockTitle = (blockNum: number, newTitle: string) => {
    setData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.number === blockNum ? { ...b, title: newTitle } : b
      ),
    }))
  }

  const startEditBlock = (blockNum: number) => {
    const idx = data.blocks.findIndex(b => b.number === blockNum)
    if (idx === -1) return
    const block = data.blocks[idx]
    setEditingBlock(blockNum)
    setEditContent(block.content)
    setEditTitle(block.title || `Blocco ${block.number}`)
    const prev = idx > 0 ? data.blocks[idx - 1] : null
    const next = idx < data.blocks.length - 1 ? data.blocks[idx + 1] : null
    setEditPrevContent(prev?.content || '')
    setEditNextContent(next?.content || '')
    setEditPrevBlockNum(prev?.number ?? null)
    setEditNextBlockNum(next?.number ?? null)
  }

  const closeEditModal = () => {
    setEditingBlock(null)
    setEditContent('')
    setEditTitle('')
    setEditPrevContent('')
    setEditNextContent('')
    setEditPrevBlockNum(null)
    setEditNextBlockNum(null)
  }

  const saveEditBlock = () => {
    if (editingBlock === null) return
    setData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.number === editingBlock) {
          const wc = editContent.trim().split(/\s+/).filter(Boolean).length
          return {
            ...b,
            content: editContent,
            characterCount: editContent.length,
            wordCount: wc,
            title: editTitle.trim() || b.title,
          }
        }
        if (editPrevBlockNum !== null && b.number === editPrevBlockNum) {
          const wc = editPrevContent.trim().split(/\s+/).filter(Boolean).length
          return {
            ...b,
            content: editPrevContent,
            characterCount: editPrevContent.length,
            wordCount: wc,
          }
        }
        if (editNextBlockNum !== null && b.number === editNextBlockNum) {
          const wc = editNextContent.trim().split(/\s+/).filter(Boolean).length
          return {
            ...b,
            content: editNextContent,
            characterCount: editNextContent.length,
            wordCount: wc,
          }
        }
        return b
      }),
    }))
    closeEditModal()
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

    // Verifica che entrambe le metà avranno almeno 600 parole (warning minimo)
    const totalWords = block.content.trim().split(/\s+/).filter(Boolean).length
    if (totalWords < 1200) {
      toast.error('Non puoi dividere: entrambi i blocchi risultanti risulterebbero troppo corti (< 600 parole)')
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

      // Controlla: max 3 per settimana
      const weekNum = Math.floor(dayIndex / 7)
      const daysInSameWeek = current.filter(d => Math.floor(d / 7) === weekNum)
      if (daysInSameWeek.length >= 3) {
        toast.error('Massimo 3 uscite a settimana!')
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

    // Validazione: max 36 blocchi
    if (data.blocks.length > 36) {
      toast.error('Un libro può avere massimo 36 blocchi.')
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
        macro_category: data.macroCategory,
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
        serialization_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // max 3 mesi (90 giorni)
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
      clearDraft()
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
      case 4: return data.title.length > 0 && data.macroCategory.length > 0 && data.genre.length > 0 && data.description.trim().length >= 150 && data.coverImage !== null
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
            {/* Prompt bozza in sospeso */}
            {showDraftPrompt && pendingDraft && (
              <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      Hai un caricamento in sospeso
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {pendingDraft.data.title ? `"${pendingDraft.data.title}"` : 'Bozza senza titolo'} &bull;
                      {' '}{pendingDraft.data.blocks.length} blocchi &bull;
                      {' '}Step {pendingDraft.step}/8 &bull;
                      {' '}Salvato il {new Date(pendingDraft.savedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={resumeDraft}
                        className="px-4 py-2 text-xs font-semibold bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors"
                      >
                        Riprendi bozza
                      </button>
                      <button
                        onClick={discardDraft}
                        className="px-4 py-2 text-xs font-medium text-bark-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Inizia da capo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-sage-900">Dividi in blocchi</h2>
              <p className="text-bark-500 mt-2">
                Usa lo slider per scegliere il numero di blocchi. Controlla i minuti per blocco in basso.
              </p>
            </div>

            {(() => {
              const totalWords = data.extractedText.split(/\s+/).filter(Boolean).length
              const totalMin = Math.max(1, Math.ceil(totalWords / 200))
              const minPerBlock = Math.max(1, Math.round(totalMin / Math.max(1, blockCount)))
              const totalPages = Math.max(1, Math.ceil(totalWords / 250))
              return (
            <div className="bg-white rounded-2xl border border-sage-100 p-8">
              {/* Numero blocchi — elemento visivo principale, proporzioni eleganti */}
              <div className="text-center mb-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-bark-400 font-semibold mb-2">
                  Numero di blocchi
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-bold text-sage-700 leading-none tabular-nums transition-all">
                    {blockCount}
                  </span>
                  <span className="text-sm font-semibold text-sage-500 uppercase tracking-wider">
                    {blockCount === 1 ? 'blocco' : 'blocchi'}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="mb-6">
                <input
                  type="range"
                  min={3}
                  max={Math.min(36, Math.floor(data.extractedText.length / 500))}
                  value={blockCount}
                  onChange={(e) => recalculateBlocks(parseInt(e.target.value))}
                  className="w-full accent-sage-500"
                />
                <div className="flex justify-between text-xs text-bark-400 mt-1">
                  <span>Pochi blocchi (più lunghi)</span>
                  <span>Tanti blocchi (più corti)</span>
                </div>
              </div>

              {/* Riepilogo — tempo totale + pagine virtuali */}
              <div className="p-4 bg-cream-200 rounded-xl mb-6 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-bark-400 font-semibold">Tempo totale</p>
                  <p className="text-base font-bold text-sage-700 mt-1">
                    ~{totalMin} min
                  </p>
                </div>
                <div className="border-x border-sage-200/60">
                  <p className="text-[10px] uppercase tracking-wider text-bark-400 font-semibold">Min/blocco</p>
                  <p className="text-base font-bold text-sage-700 mt-1">
                    ~{minPerBlock} min
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-bark-400 font-semibold">Pagine virtuali</p>
                  <p className="text-base font-bold text-sage-700 mt-1">
                    {totalPages} pag
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-sage-800">Anteprima blocchi:</p>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {data.blocks.map((block) => {
                    const readingMin = Math.max(1, Math.ceil(block.wordCount / 200))
                    const virtualPages = Math.max(1, Math.ceil(block.wordCount / 250))
                    const wc = block.wordCount
                    const semaphore = wc < 600
                      ? { color: 'bg-red-100 text-red-700 border-red-200', label: 'Troppo corto', icon: '🚫' }
                      : wc < 800
                        ? { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Un po\' corto', icon: '⚠️' }
                        : wc <= 2000
                          ? { color: 'bg-green-100 text-green-700 border-green-200', label: 'Zona Ideale', icon: '🔥' }
                          : wc <= 2500
                            ? { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Lungo ma ok', icon: '✅' }
                            : { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Troppo lungo', icon: '⚠️' }
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
                              {virtualPages} pag &bull; {block.wordCount.toLocaleString()} parole &bull; ~{readingMin} min
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${semaphore.color}`}>
                            {semaphore.icon} {semaphore.label}
                          </span>
                          {block.startsAtChapter && (
                            <span className="text-xs bg-sage-200 text-sage-700 px-2 py-0.5 rounded-full">
                              Capitolo
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Tooltip strategico */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Consiglio:</strong> Blocchi da 5-10 minuti mantengono alta l&apos;attenzione su mobile.
                    Piu blocchi brevi = piu sblocchi, piu statistiche positive e lettori che tornano!
                  </p>
                </div>
              </div>
            </div>
              )
            })()}
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
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={block.title}
                          onChange={(e) => updateBlockTitle(block.number, e.target.value)}
                          placeholder={`Blocco ${block.number}`}
                          className="text-sm font-semibold text-sage-800 bg-transparent border-b border-transparent hover:border-sage-200 focus:border-sage-400 focus:outline-none w-full px-1 py-0.5 rounded-sm transition-colors"
                          title="Clicca per modificare il titolo del blocco"
                        />
                        <p className="text-xs text-bark-400 px-1">
                          {Math.max(1, Math.ceil(block.wordCount / 250))} pag &bull; {block.wordCount} parole &bull; ~{Math.max(1, Math.ceil(block.wordCount / 200))} min lettura
                          {(() => {
                            const wc = block.wordCount
                            return wc < 600
                              ? <span className="ml-2 text-red-600 font-medium">🚫 Troppo corto</span>
                              : wc < 800
                                ? <span className="ml-2 text-amber-600 font-medium">⚠️ Un po&apos; corto</span>
                                : wc <= 2000
                                  ? <span className="ml-2 text-green-600 font-medium">🔥 Zona Ideale</span>
                                  : wc <= 2500
                                    ? <span className="ml-2 text-emerald-600 font-medium">✅ Lungo ma ok</span>
                                    : <span className="ml-2 text-amber-600 font-medium">⚠️ Troppo lungo</span>
                          })()}
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

                  {/* Block content preview */}
                  <div className="p-4">
                    <div className="max-h-32 overflow-hidden relative">
                      <p className="text-sm text-bark-600 font-serif leading-relaxed whitespace-pre-wrap">
                        {block.content.substring(0, 500)}
                        {block.content.length > 500 && '...'}
                      </p>
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white" />
                    </div>

                    {/* Warning non bloccante se blocco fuori dal range consigliato */}
                    {block.wordCount < 600 && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                          Blocco corto: {block.wordCount.toLocaleString()} parole. Consigliati almeno 600 parole per una lettura più appagante.
                        </p>
                      </div>
                    )}
                    {block.wordCount > 2500 && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                          Blocco lungo: {block.wordCount.toLocaleString()} parole. Valuta di dividerlo per mantenere alta l&apos;attenzione.
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

              {/* Macro-Area */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Reparto (Macro-Area) *</label>
                <div className="flex flex-wrap gap-2">
                  {MACRO_AREAS.map((macro) => (
                    <button
                      key={macro.value}
                      onClick={() => setData(prev => ({ ...prev, macroCategory: macro.value, genre: '' }))}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                        data.macroCategory === macro.value
                          ? `${macro.color.bg} ${macro.color.text} border-transparent shadow-sm`
                          : `${macro.color.bgLight} ${macro.color.textLight} ${macro.color.border} hover:opacity-80`
                      }`}
                    >
                      <span>{macro.icon}</span>
                      {macro.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sotto-genere (condizionale) */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">
                  Sotto-genere *
                  {!data.macroCategory && <span className="text-bark-400 font-normal ml-1">(scegli prima il reparto)</span>}
                </label>
                {data.macroCategory ? (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const macro = getMacroAreaByValue(data.macroCategory)
                      if (!macro) return null
                      return macro.subGenres.map((sg) => (
                        <button
                          key={sg.value}
                          onClick={() => setData(prev => ({ ...prev, genre: sg.value }))}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            data.genre === sg.value
                              ? `${macro.color.bg} ${macro.color.text}`
                              : `${macro.color.bgLight} ${macro.color.textLight} hover:opacity-80`
                          }`}
                        >
                          {sg.label}
                        </button>
                      ))
                    })()}
                  </div>
                ) : (
                  <div className="p-4 bg-sage-50 rounded-xl text-center">
                    <p className="text-sm text-bark-400">Seleziona prima una Macro-Area per vedere i sotto-generi disponibili</p>
                  </div>
                )}
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

              {/* Cover con cropper e mockup 3D */}
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Copertina *</label>
                <div className="flex items-start gap-5">
                  {data.coverPreview ? (
                    <div className="relative">
                      <BookMockup src={data.coverPreview} alt="Cover" size="md" hover={false} />
                      <div className="flex items-center gap-1 mt-3">
                        <label className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-sage-600 bg-sage-50 hover:bg-sage-100 rounded-lg cursor-pointer transition-colors">
                          <Crop className="w-3 h-3" />
                          Cambia
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) setCropperSrc(URL.createObjectURL(file))
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setData(prev => ({ ...prev, coverImage: null, coverPreview: null }))}
                          className="p-1.5 text-bark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rimuovi copertina"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                          if (file) setCropperSrc(URL.createObjectURL(file))
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-bark-400">
                      Carica un&apos;immagine e ritagliala nel formato libro (2:3).
                    </p>
                    <p className="text-[10px] text-bark-300 mt-1">
                      Output finale: 600x900px, JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Cropper Modal */}
              {cropperSrc && (
                <CoverCropper
                  imageSrc={cropperSrc}
                  onConfirm={(blob, url) => {
                    const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
                    setData(prev => ({ ...prev, coverImage: file, coverPreview: url }))
                    setCropperSrc(null)
                  }}
                  onCancel={() => setCropperSrc(null)}
                />
              )}
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
                Massimo 3 uscite a settimana, entro 13 settimane (~3 mesi).
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

              {/* Calendar grid - 13 settimane (~90 giorni) */}
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-bark-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {Array.from({ length: 13 }).map((_, weekIdx) => {
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
                                  : daysInWeek.length >= 3
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                              } ${isToday ? 'ring-2 ring-sage-400' : ''}`}
                              disabled={!isSelected && daysInWeek.length >= 3}
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
                  { label: 'Pagine virtuali', value: `${Math.ceil(data.extractedText.split(/\s+/).filter(Boolean).length / 250).toLocaleString()} pag` },
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

      {/* ---- MODAL: EDITOR BLOCCO ---- */}
      {editingBlock !== null && (
        <BlockEditorModal
          title={editTitle}
          content={editContent}
          prevContent={editPrevContent}
          nextContent={editNextContent}
          hasPrev={editPrevBlockNum !== null}
          hasNext={editNextBlockNum !== null}
          onTitleChange={setEditTitle}
          onContentChange={setEditContent}
          onPrevContentChange={setEditPrevContent}
          onNextContentChange={setEditNextContent}
          onCancel={closeEditModal}
          onSave={saveEditBlock}
        />
      )}
    </div>
  )
}

// ============================================
// MODAL EDITOR — Foglio + Side Drawer + Undo Granulare
// ============================================
// Ogni singola azione (digitazione, formattazione, spostamento) viene
// registrata come snapshot separato. L'undo ripercorre la cronologia
// all'indietro action-by-action, senza limiti.
// ============================================
interface HistorySnapshot {
  editorHTML: string   // innerHTML — preserva formattazione
  content: string      // innerText — plain text
  prevContent: string
  nextContent: string
}

function BlockEditorModal({
  title,
  content,
  prevContent,
  nextContent,
  hasPrev,
  hasNext,
  onTitleChange,
  onContentChange,
  onPrevContentChange,
  onNextContentChange,
  onCancel,
  onSave,
}: {
  title: string
  content: string
  prevContent: string
  nextContent: string
  hasPrev: boolean
  hasNext: boolean
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
  onPrevContentChange: (v: string) => void
  onNextContentChange: (v: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorScrollRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<HTMLTextAreaElement>(null)
  const drawerRef = useRef<HTMLTextAreaElement>(null)
  const [wc, setWc] = useState(() => content.trim().split(/\s+/).filter(Boolean).length)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [movedFeedback, setMovedFeedback] = useState<string | null>(null)
  const [moveButton, setMoveButton] = useState<{
    source: 'prev' | 'next'
    start: number
    end: number
    text: string
  } | null>(null)

  // ---- Undo granulare (illimitato) ----
  const historyRef = useRef<HistorySnapshot[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const inputSnapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUndoingRef = useRef(false)  // evita di pushare snapshot durante un undo
  const lastPushedHTMLRef = useRef<string>('')  // evita duplicati

  // Cattura snapshot corrente
  const captureSnapshot = useCallback((): HistorySnapshot => ({
    editorHTML: editorRef.current?.innerHTML || '',
    content: editorRef.current?.innerText || content,
    prevContent,
    nextContent,
  }), [content, prevContent, nextContent])

  // Push snapshot nello stack (evita duplicati consecutivi)
  const pushSnapshot = useCallback(() => {
    if (isUndoingRef.current) return
    const snap = captureSnapshot()
    if (snap.editorHTML === lastPushedHTMLRef.current
        && snap.prevContent === historyRef.current[0]?.prevContent
        && snap.nextContent === historyRef.current[0]?.nextContent) return
    historyRef.current.unshift(snap)
    lastPushedHTMLRef.current = snap.editorHTML
    setUndoCount(historyRef.current.length)
  }, [captureSnapshot])

  // Push debounced per digitazione (raggruppa tasti rapidi in ~600ms)
  const scheduleDebouncedSnapshot = useCallback(() => {
    if (isUndoingRef.current) return
    if (inputSnapshotTimer.current) clearTimeout(inputSnapshotTimer.current)
    inputSnapshotTimer.current = setTimeout(() => {
      pushSnapshot()
    }, 600)
  }, [pushSnapshot])

  // Init: salva stato iniziale
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== content) {
      editorRef.current.innerText = content
    }
    // Snapshot iniziale (punto zero)
    setTimeout(() => {
      lastPushedHTMLRef.current = editorRef.current?.innerHTML || ''
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard: Cmd+Z / Ctrl+Z → nostro undo; Escape → chiudi
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawerOpen) { setDrawerOpen(false); return }
        onCancel()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()  // disabilita undo nativo del browser
        e.stopPropagation()
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel, drawerOpen])

  const updateStats = (text: string) => {
    setWc(text.trim().split(/\s+/).filter(Boolean).length)
  }

  // Input dall'editor (digitazione, paste, ecc.)
  const handleInput = () => {
    const el = editorRef.current
    if (!el) return
    const text = el.innerText
    onContentChange(text)
    updateStats(text)
    // Schedula snapshot debounced per raggruppare la digitazione
    scheduleDebouncedSnapshot()
  }

  // Comandi formattazione: snapshot PRIMA dell'azione (così l'undo toglie la formattazione)
  const exec = (cmd: string, value?: string) => {
    // Flush eventuali snapshot di digitazione in attesa
    if (inputSnapshotTimer.current) {
      clearTimeout(inputSnapshotTimer.current)
      inputSnapshotTimer.current = null
    }
    pushSnapshot()  // salva stato pre-formattazione
    editorRef.current?.focus()
    try { document.execCommand(cmd, false, value) } catch { /* noop */ }
    handleInput()
  }

  const handleZoneSelection = (source: 'prev' | 'next') => {
    const ta = source === 'prev' ? prevRef.current : drawerRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) { setMoveButton(null); return }
    const text = ta.value.substring(start, end)
    if (!text.trim()) { setMoveButton(null); return }
    setMoveButton({ source, start, end, text })
  }

  // Listener robusto per selezione nel drawer
  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer || !drawerOpen) return
    const check = () => handleZoneSelection('next')
    drawer.addEventListener('mouseup', check)
    drawer.addEventListener('touchend', check)
    const onSelChange = () => {
      if (document.activeElement === drawer) check()
    }
    document.addEventListener('selectionchange', onSelChange)
    return () => {
      drawer.removeEventListener('mouseup', check)
      drawer.removeEventListener('touchend', check)
      document.removeEventListener('selectionchange', onSelChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, nextContent])

  // ---- UNDO: ripristina l'ultimo snapshot ----
  const handleUndo = () => {
    const snap = historyRef.current.shift()
    if (!snap) return
    isUndoingRef.current = true
    setUndoCount(historyRef.current.length)
    // Ripristina formattazione (innerHTML) e plain text
    if (editorRef.current) editorRef.current.innerHTML = snap.editorHTML
    onContentChange(snap.content)
    onPrevContentChange(snap.prevContent)
    onNextContentChange(snap.nextContent)
    updateStats(snap.content)
    lastPushedHTMLRef.current = snap.editorHTML
    setMovedFeedback('undo')
    setTimeout(() => setMovedFeedback(null), 1500)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('libra-force-save'))
    // Riabilita push dopo il ciclo di rendering
    setTimeout(() => { isUndoingRef.current = false }, 50)
  }

  // ---- MOVE: sposta testo dal prev/next al blocco attuale ----
  const handleMove = () => {
    if (!moveButton) return
    // Flush snapshot di digitazione in attesa
    if (inputSnapshotTimer.current) {
      clearTimeout(inputSnapshotTimer.current)
      inputSnapshotTimer.current = null
    }
    pushSnapshot()  // salva stato pre-spostamento
    const { source, start, end, text } = moveButton
    const piece = text.trim()
    if (source === 'prev') {
      const newPrev = (prevContent.substring(0, start) + prevContent.substring(end)).replace(/\s+$/, '')
      onPrevContentChange(newPrev)
      const newContent = piece + (content.startsWith('\n') ? '' : '\n\n') + content
      onContentChange(newContent)
      if (editorRef.current) editorRef.current.innerText = newContent
      updateStats(newContent)
    } else {
      const newNext = (nextContent.substring(0, start) + nextContent.substring(end)).replace(/^\s+/, '')
      onNextContentChange(newNext)
      const newContent = content.replace(/\s+$/, '') + '\n\n' + piece
      onContentChange(newContent)
      if (editorRef.current) editorRef.current.innerText = newContent
      updateStats(newContent)
      setTimeout(() => {
        editorScrollRef.current?.scrollTo({ top: editorScrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    }
    if (source === 'prev') prevRef.current?.setSelectionRange(0, 0)
    else drawerRef.current?.setSelectionRange(0, 0)
    setMoveButton(null)
    setMovedFeedback(source)
    setTimeout(() => setMovedFeedback(null), 1800)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('libra-force-save'))
  }

  const readingMin = Math.max(1, Math.ceil(wc / 200))
  const virtualPages = Math.max(1, Math.ceil(wc / 250))
  const semaphore = wc < 600
    ? { color: 'text-red-600', label: '🚫 Troppo corto' }
    : wc < 800
      ? { color: 'text-amber-600', label: '⚠️ Un po\' corto' }
      : wc <= 2000
        ? { color: 'text-green-600', label: '🔥 Zona Ideale' }
        : wc <= 2500
          ? { color: 'text-emerald-600', label: '✅ Lungo ma ok' }
          : { color: 'text-amber-600', label: '⚠️ Troppo lungo' }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative w-full h-full sm:h-[92vh] sm:max-h-[92vh] sm:m-8 flex overflow-hidden sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Foglio centrale */}
        <div className="flex-1 bg-white flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-sage-100 bg-white shrink-0">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => exec('bold')} title="Grassetto"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-bark-600 hover:bg-sage-100 hover:text-sage-700 transition-colors">
                <Bold className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => exec('italic')} title="Corsivo"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-bark-600 hover:bg-sage-100 hover:text-sage-700 transition-colors">
                <Italic className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-sage-200 mx-1" />
              <button type="button" onClick={() => exec('formatBlock', 'H2')} title="Titolo"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-bark-600 hover:bg-sage-100 hover:text-sage-700 transition-colors">
                <Heading2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => exec('insertUnorderedList')} title="Lista"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-bark-600 hover:bg-sage-100 hover:text-sage-700 transition-colors">
                <List className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-sage-200 mx-1" />
              {/* Undo granulare */}
              <button type="button" onClick={handleUndo} disabled={undoCount === 0}
                title={undoCount > 0 ? `Annulla (${undoCount})` : 'Nessuna azione da annullare'}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  undoCount > 0
                    ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                    : 'text-bark-300 cursor-not-allowed'
                }`}>
                <Undo2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle drawer */}
              {hasNext && (
                <button type="button" onClick={() => setDrawerOpen(!drawerOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    drawerOpen
                      ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}>
                  {drawerOpen ? <PanelRightClose className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  {drawerOpen ? 'Chiudi pannello' : 'Vedi blocco successivo'}
                </button>
              )}
              <button type="button" onClick={onCancel} title="Chiudi (Esc)"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-bark-500 hover:bg-sage-100 hover:text-bark-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zona precedente (compatta, sopra il foglio) */}
          {hasPrev && (
            <div className="shrink-0 bg-stone-50 border-b border-stone-200/60">
              <div className="max-w-[720px] mx-auto px-6 sm:px-14 pt-3 pb-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-bark-400 font-semibold">
                    ← Fine blocco precedente
                  </p>
                  {moveButton?.source === 'prev' && (
                    <button type="button" onClick={handleMove}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold bg-sage-600 text-white rounded-full shadow-md hover:bg-sage-700 transition-colors animate-fade-in">
                      <ChevronDown className="w-3 h-3" />
                      Sposta qui
                    </button>
                  )}
                  {movedFeedback === 'prev' && (
                    <span className="text-[11px] font-semibold text-green-600 animate-fade-in">✓ Spostato</span>
                  )}
                </div>
                <textarea
                  ref={prevRef}
                  value={prevContent}
                  readOnly
                  onMouseUp={() => handleZoneSelection('prev')}
                  placeholder="(blocco precedente vuoto)"
                  className="w-full resize-none bg-transparent text-sm font-serif leading-relaxed text-bark-500/70 outline-none cursor-text selection:bg-amber-100 selection:text-bark-800"
                  style={{ height: '100px' }}
                />
              </div>
            </div>
          )}

          {/* Editor */}
          <div ref={editorScrollRef} className="flex-1 overflow-y-auto bg-white min-h-0">
            <div className="max-w-[720px] mx-auto px-6 sm:px-14 py-8 sm:py-10">
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Titolo del blocco"
                className="w-full text-3xl sm:text-4xl font-bold text-sage-900 bg-transparent border-0 outline-none placeholder:text-bark-300 mb-6"
              />
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                className="min-h-[260px] text-[17px] font-serif leading-[1.75] text-bark-800 outline-none whitespace-pre-wrap focus:outline-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-sage-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic"
              />
            </div>
          </div>

          {/* Undo feedback */}
          {movedFeedback === 'undo' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full shadow-md animate-fade-in">
              ↩ Azione annullata
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-sage-100 bg-white shrink-0">
            <div className="flex flex-col min-w-0">
              <p className="text-xs text-bark-400">
                {wc.toLocaleString()} parole &bull; {virtualPages} pag &bull; ~{readingMin} min
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${semaphore.color}`}>
                {semaphore.label}
                {undoCount > 0 && (
                  <span className="ml-2 text-amber-600">({undoCount} undo)</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={onCancel}
                className="px-4 py-2 text-sm text-bark-500 hover:bg-sage-50 rounded-lg transition-colors">
                Annulla
              </button>
              <button type="button" onClick={onSave}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-sage-500 text-white rounded-lg hover:bg-sage-600 font-medium transition-colors">
                <Save className="w-4 h-4" />
                Salva modifiche
              </button>
            </div>
          </div>
        </div>

        {/* Side Drawer — Blocco successivo */}
        <div
          className={`bg-stone-50 border-l border-stone-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
            drawerOpen ? 'w-[340px] sm:w-[380px]' : 'w-0'
          }`}
        >
          {drawerOpen && (
            <>
              <div className="px-4 py-3 border-b border-stone-200/60 shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-bark-400 font-semibold">
                    Blocco successivo
                  </p>
                  {movedFeedback === 'next' && (
                    <span className="text-[11px] font-semibold text-green-600 animate-fade-in">✓ Spostato</span>
                  )}
                </div>
                <p className="text-[10px] text-bark-400 mt-1">
                  Seleziona il testo che vuoi spostare nel blocco attuale
                </p>
              </div>

              {/* Pulsante SPOSTA QUI */}
              {moveButton?.source === 'next' && (
                <div className="px-4 py-2 bg-sage-50 border-b border-sage-200 shrink-0 animate-fade-in">
                  <button type="button" onClick={handleMove}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-sage-600 text-white rounded-xl shadow-lg hover:bg-sage-700 transition-colors">
                    <ChevronUp className="w-4 h-4" />
                    SPOSTA NEL BLOCCO ATTUALE
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                <textarea
                  ref={drawerRef}
                  value={nextContent}
                  readOnly
                  onMouseUp={() => handleZoneSelection('next')}
                  onTouchEnd={() => handleZoneSelection('next')}
                  placeholder="(blocco successivo vuoto)"
                  className="w-full h-full min-h-[400px] resize-none bg-transparent text-[13px] font-serif leading-relaxed text-bark-600/80 outline-none cursor-text selection:bg-amber-200 selection:text-bark-900"
                />
              </div>
              <div className="px-4 py-2 border-t border-stone-200/60 shrink-0">
                <p className="text-[10px] text-bark-400">
                  {nextContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} parole &bull;{' '}
                  {Math.max(1, Math.ceil(nextContent.trim().split(/\s+/).filter(Boolean).length / 250))} pag
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
