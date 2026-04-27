// Palette preset card autore — fascia in cima (figurina elegante)
export type CardColorPreset = 'terracotta' | 'blu_notte' | 'sage' | 'lavender' | 'grigio_caldo'

export interface CardColorPresetDef {
  key: CardColorPreset
  label: string
  /** Colore solido pastello per la fascia in cima della card (60px) */
  bannerColor: string
  /** Colore corpo card (versione tintata 30% sopra bianco) — niente bianco puro */
  bodyTintColor: string
  /** Per UI swatch nell'editor (cerchietto preview) */
  swatch: string
  /** Mantenuto per retrocompatibilità (modale anteprima legacy) */
  gradient: string
}

export const CARD_COLOR_PRESETS: CardColorPresetDef[] = [
  {
    key: 'terracotta',
    label: 'Rosa antico',
    bannerColor: '#E8C4B8',
    bodyTintColor: '#F8EDEA',
    swatch: '#E8C4B8',
    gradient: 'linear-gradient(160deg,#E8C4B8 0%,#D4A091 100%)',
  },
  {
    key: 'lavender',
    label: 'Lavanda',
    bannerColor: '#C8C0D8',
    bodyTintColor: '#F0ECF4',
    swatch: '#C8C0D8',
    gradient: 'linear-gradient(160deg,#C8C0D8 0%,#A89BC2 100%)',
  },
  {
    key: 'sage',
    label: 'Verde salvia',
    bannerColor: '#C8D8C0',
    bodyTintColor: '#F0F4EE',
    swatch: '#C8D8C0',
    gradient: 'linear-gradient(160deg,#C8D8C0 0%,#A4BC97 100%)',
  },
  {
    key: 'blu_notte',
    label: 'Pesca',
    bannerColor: '#F0D8C0',
    bodyTintColor: '#FBF4EE',
    swatch: '#F0D8C0',
    gradient: 'linear-gradient(160deg,#F0D8C0 0%,#D9B89A 100%)',
  },
  {
    key: 'grigio_caldo',
    label: 'Beige dorato',
    bannerColor: '#E8D8B0',
    bodyTintColor: '#F8F4E8',
    swatch: '#E8D8B0',
    gradient: 'linear-gradient(160deg,#E8D8B0 0%,#C9B584 100%)',
  },
]

// Mapping macro_area → preset automatico
const MACRO_TO_PRESET: Record<string, CardColorPreset> = {
  narrativa: 'terracotta',           // Rosa antico
  pratico_lifestyle: 'sage',          // Verde salvia (Crescita Personale)
  mondi_immaginari: 'lavender',       // Lavanda (Sci-Fi / Fantasy)
  illustrazioni_comics: 'blu_notte',  // Pesca (chiave legacy mappata su pesca)
  realta_conoscenza: 'grigio_caldo',  // Beige dorato (default)
}

/** Determina il preset a partire dal genere macro prevalente dell'autore */
export function presetFromMacros(booksByMacro: Record<string, number> | undefined): CardColorPreset {
  if (!booksByMacro) return 'grigio_caldo'
  const top = Object.entries(booksByMacro).sort((a, b) => b[1] - a[1])[0]
  if (!top) return 'grigio_caldo'
  return MACRO_TO_PRESET[top[0]] || 'grigio_caldo'
}

export function getPreset(key: CardColorPreset | null | undefined): CardColorPresetDef {
  return CARD_COLOR_PRESETS.find(p => p.key === key) || CARD_COLOR_PRESETS[4]
}
