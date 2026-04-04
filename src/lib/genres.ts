// ============================================
// SISTEMA GENERI A DUE LIVELLI
// Macro-Area > Sotto-genere con color-coding
// ============================================

export interface SubGenre {
  label: string
  value: string // valore salvato nel DB come genre
}

export interface MacroArea {
  label: string
  value: string // valore salvato nel DB come macro_category
  icon: string
  color: {
    bg: string        // background chip attivo
    bgLight: string   // background chip pastello
    text: string      // testo chip attivo
    textLight: string // testo chip pastello
    border: string    // bordo chip
    tag: string       // colore tag sulla BookCard (bg + text)
  }
  subGenres: SubGenre[]
}

export const MACRO_AREAS: MacroArea[] = [
  {
    label: 'Narrativa',
    value: 'narrativa',
    icon: '📘',
    color: {
      bg: 'bg-blue-600',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-white',
      textLight: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      tag: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    subGenres: [
      { label: 'Gialli & Noir', value: 'Gialli & Noir' },
      { label: 'Thriller & Suspense', value: 'Thriller & Suspense' },
      { label: 'Rosa (Romance)', value: 'Romance' },
      { label: 'Narrativa Storica', value: 'Narrativa Storica' },
      { label: 'Narrativa Contemporanea', value: 'Narrativa Contemporanea' },
    ],
  },
  {
    label: 'Mondi Immaginari',
    value: 'mondi_immaginari',
    icon: '🔮',
    color: {
      bg: 'bg-violet-600',
      bgLight: 'bg-violet-50 dark:bg-violet-900/20',
      text: 'text-white',
      textLight: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-800',
      tag: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    },
    subGenres: [
      { label: 'Fantasy', value: 'Fantasy' },
      { label: 'Fantascienza (Sci-Fi)', value: 'Sci-Fi' },
      { label: 'Horror', value: 'Horror' },
    ],
  },
  {
    label: 'Realta e Conoscenza',
    value: 'realta_conoscenza',
    icon: '🔴',
    color: {
      bg: 'bg-rose-600',
      bgLight: 'bg-rose-50 dark:bg-rose-900/20',
      text: 'text-white',
      textLight: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      tag: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    },
    subGenres: [
      { label: 'Biografie & Memorie', value: 'Biografie & Memorie' },
      { label: 'Attualita & Politica', value: 'Attualita & Politica' },
      { label: 'Storia (Saggistica)', value: 'Storia' },
      { label: 'Scienza & Natura', value: 'Scienza & Natura' },
    ],
  },
  {
    label: 'Pratico & Lifestyle',
    value: 'pratico_lifestyle',
    icon: '🟢',
    color: {
      bg: 'bg-emerald-600',
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-white',
      textLight: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      tag: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    subGenres: [
      { label: 'Crescita Personale', value: 'Crescita Personale' },
      { label: 'Economia & Business', value: 'Economia & Business' },
      { label: 'Cucina', value: 'Cucina' },
      { label: 'Hobby & Tempo Libero', value: 'Hobby & Tempo Libero' },
    ],
  },
  {
    label: 'Illustrazioni & Comics',
    value: 'illustrazioni_comics',
    icon: '🟠',
    color: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-white',
      textLight: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      tag: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    subGenres: [
      { label: 'Manga', value: 'Manga' },
      { label: 'Fumetti (Graphic Novel)', value: 'Fumetti' },
      { label: 'Poesia Illustrata', value: 'Poesia Illustrata' },
    ],
  },
]

// Helper: tutti i sotto-generi in lista piatta
export const ALL_SUB_GENRES = MACRO_AREAS.flatMap(ma =>
  ma.subGenres.map(sg => ({ ...sg, macroArea: ma }))
)

// Helper: trova macro-area da sotto-genere
export function getMacroAreaByGenre(genre: string | null): MacroArea | null {
  if (!genre) return null
  return MACRO_AREAS.find(ma => ma.subGenres.some(sg => sg.value === genre)) || null
}

// Helper: trova macro-area per valore
export function getMacroAreaByValue(value: string | null): MacroArea | null {
  if (!value) return null
  return MACRO_AREAS.find(ma => ma.value === value) || null
}

// Helper: colore tag per la BookCard basato sul genere
export function getGenreTagColor(genre: string | null): string {
  const macro = getMacroAreaByGenre(genre)
  if (macro) return macro.color.tag
  return 'bg-bark-100 text-bark-600 dark:bg-bark-800 dark:text-bark-300'
}
