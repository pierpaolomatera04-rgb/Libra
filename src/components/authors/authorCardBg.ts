// Palette preset card autore
export type CardColorPreset = 'terracotta' | 'blu_notte' | 'sage' | 'lavender' | 'grigio_caldo'

export const CARD_COLOR_PRESETS: { key: CardColorPreset; label: string; gradient: string; swatch: string }[] = [
  { key: 'terracotta',   label: 'Terracotta',    gradient: 'linear-gradient(160deg,#c97b63 0%,#a85a42 100%)', swatch: '#c97b63' },
  { key: 'blu_notte',    label: 'Blu notte',     gradient: 'linear-gradient(160deg,#3c4e7a 0%,#1f2a44 100%)', swatch: '#3c4e7a' },
  { key: 'sage',         label: 'Verde salvia',  gradient: 'linear-gradient(160deg,#7a9e6e 0%,#4a6f62 100%)', swatch: '#7a9e6e' },
  { key: 'lavender',     label: 'Viola lavanda', gradient: 'linear-gradient(160deg,#9b8ac7 0%,#6f5fa0 100%)', swatch: '#9b8ac7' },
  { key: 'grigio_caldo', label: 'Grigio caldo',  gradient: 'linear-gradient(160deg,#a39689 0%,#6e6459 100%)', swatch: '#a39689' },
]

// Mapping macro_area → preset automatico
const MACRO_TO_PRESET: Record<string, CardColorPreset> = {
  narrativa: 'terracotta',
  mondi_immaginari: 'blu_notte',
  pratico_lifestyle: 'sage',
  illustrazioni_comics: 'lavender',
  realta_conoscenza: 'grigio_caldo',
}

/** Determina il preset a partire dal genere macro prevalente dell'autore */
export function presetFromMacros(booksByMacro: Record<string, number> | undefined): CardColorPreset {
  if (!booksByMacro) return 'grigio_caldo'
  const top = Object.entries(booksByMacro).sort((a, b) => b[1] - a[1])[0]
  if (!top) return 'grigio_caldo'
  return MACRO_TO_PRESET[top[0]] || 'grigio_caldo'
}

export function getPreset(key: CardColorPreset | null | undefined) {
  return CARD_COLOR_PRESETS.find(p => p.key === key) || CARD_COLOR_PRESETS[4]
}
