// ============================================
// SISTEMA BADGE basato sulle 5 Macro-Aree
// ============================================

import { MACRO_AREAS, type MacroArea } from './genres'

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  macroArea: string // valore macro-area
  level: 1 | 2
  threshold: number // blocchi richiesti
  icon: string // emoji
}

// Genera badge per ogni macro-area
const BADGE_MAP: Record<string, { level1: { name: string; icon: string }; level2: { name: string; icon: string } }> = {
  pratico_lifestyle: {
    level1: { name: 'Apprendista Pratico', icon: '🛠️' },
    level2: { name: 'Maestro del Fare', icon: '🏗️' },
  },
  narrativa: {
    level1: { name: 'Lettore di Storie', icon: '📖' },
    level2: { name: 'Critico Letterario', icon: '🎭' },
  },
  mondi_immaginari: {
    level1: { name: 'Sognatore', icon: '🌙' },
    level2: { name: 'Esploratore di Mondi', icon: '🚀' },
  },
  realta_conoscenza: {
    level1: { name: 'Cercatore di Verita', icon: '🔍' },
    level2: { name: 'Saggio', icon: '🦉' },
  },
  illustrazioni_comics: {
    level1: { name: "Occhio d'Artista", icon: '🎨' },
    level2: { name: 'Collezionista', icon: '🖼️' },
  },
}

export const ALL_BADGES: BadgeDefinition[] = MACRO_AREAS.flatMap(ma => {
  const mapping = BADGE_MAP[ma.value]
  if (!mapping) return []
  return [
    {
      id: `${ma.value}_level1`,
      name: mapping.level1.name,
      description: `Leggi 3 blocchi di ${ma.label}`,
      macroArea: ma.value,
      level: 1 as const,
      threshold: 3,
      icon: mapping.level1.icon,
    },
    {
      id: `${ma.value}_level2`,
      name: mapping.level2.name,
      description: `Leggi 10 blocchi di ${ma.label}`,
      macroArea: ma.value,
      level: 2 as const,
      threshold: 10,
      icon: mapping.level2.icon,
    },
  ]
})

export function getBadgeById(badgeId: string): BadgeDefinition | null {
  return ALL_BADGES.find(b => b.id === badgeId) || null
}

export function getBadgeMacroArea(badgeId: string): MacroArea | null {
  const badge = getBadgeById(badgeId)
  if (!badge) return null
  return MACRO_AREAS.find(ma => ma.value === badge.macroArea) || null
}

export function getBadgeColor(badgeId: string): { bg: string; text: string; border: string; glow: string } {
  const macro = getBadgeMacroArea(badgeId)
  if (!macro) return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', glow: '' }

  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    narrativa: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', glow: 'shadow-blue-200/50' },
    mondi_immaginari: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', glow: 'shadow-violet-200/50' },
    realta_conoscenza: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', glow: 'shadow-rose-200/50' },
    pratico_lifestyle: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', glow: 'shadow-emerald-200/50' },
    illustrazioni_comics: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', glow: 'shadow-orange-200/50' },
  }

  return colorMap[macro.value] || { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', glow: '' }
}

// ============================================
// SISTEMA XP — 50 LIVELLI con curva incrementale
// ============================================
// Formula: threshold = Math.floor(20 * level^1.6)
// Livello  1:    0 XP    Livello 10:  795 XP
// Livello 20: 2640 XP    Livello 30: 5260 XP
// Livello 40: 8540 XP    Livello 50: 12370 XP

export interface XpLevelInfo {
  level: number
  title: string
  currentXp: number     // XP in questo livello
  nextLevelXp: number   // XP totali per il prossimo livello
  totalXp: number       // XP totali dell'utente
  progress: number      // 0-1
}

// Calcola la soglia XP cumulativa per un dato livello
function levelThreshold(level: number): number {
  if (level <= 1) return 0
  return Math.floor(20 * Math.pow(level, 1.6))
}

// Genera tutti i livelli con titoli
const LEVEL_TITLES: Record<number, string> = {
  1: 'Principiante',
  2: 'Curioso',
  3: 'Lettore',
  4: 'Appassionato',
  5: 'Esploratore',
  6: 'Studioso',
  7: 'Assiduo',
  8: 'Dedito',
  9: 'Veterano',
  10: 'Esperto',
  11: 'Navigato',
  12: 'Avido',
  13: 'Instancabile',
  14: 'Raffinato',
  15: 'Conoscitore',
  16: 'Illuminato',
  17: 'Saggio',
  18: 'Erudito',
  19: 'Maestro',
  20: 'Virtuoso',
  21: 'Mentore',
  22: 'Custode',
  23: 'Guardiano',
  24: 'Campione',
  25: 'Protagonista',
  26: 'Titano',
  27: 'Stratega',
  28: 'Eroico',
  29: 'Glorioso',
  30: 'Leggenda',
  31: 'Mitico',
  32: 'Epico',
  33: 'Trascendente',
  34: 'Divino',
  35: 'Eterno',
  36: 'Celestiale',
  37: 'Cosmico',
  38: 'Supremo',
  39: 'Onnisciente',
  40: 'Immortale',
  41: 'Arcano',
  42: 'Primordiale',
  43: 'Infinito',
  44: 'Assoluto',
  45: 'Trascendentale',
  46: 'Universale',
  47: 'Etereo',
  48: 'Inarrestabile',
  49: 'Definitivo',
  50: 'Asceso',
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, 50)] || `Livello ${level}`
}

export function getXpLevel(totalXp: number): XpLevelInfo {
  let level = 1
  for (let l = 50; l >= 1; l--) {
    if (totalXp >= levelThreshold(l)) {
      level = l
      break
    }
  }

  const currentThreshold = levelThreshold(level)
  const nextThreshold = levelThreshold(Math.min(level + 1, 51))
  const xpInLevel = totalXp - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold

  return {
    level,
    title: getLevelTitle(level),
    currentXp: xpInLevel,
    nextLevelXp: xpNeeded,
    totalXp,
    progress: xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1,
  }
}

// ============================================
// PREMI AI LIVELLI CHIAVE
// ============================================
export interface LevelReward {
  level: number
  tokenBonus: number
  specialReward?: string // descrizione testuale per reward non-token
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 5,  tokenBonus: 5 },
  { level: 10, tokenBonus: 10 },
  { level: 20, tokenBonus: 0, specialReward: 'Firma Animata Speciale sbloccata' },
  { level: 30, tokenBonus: 50 },
  { level: 40, tokenBonus: 20 },
  { level: 50, tokenBonus: 100, specialReward: 'Nome Oro in classifiche e profilo' },
]

export function getRewardForLevel(level: number): LevelReward | null {
  return LEVEL_REWARDS.find(r => r.level === level) || null
}

// ============================================
// XP VALUES — punti per azione
// ============================================
export const XP_VALUES = {
  COMMENT: 1,
  TIP_SMALL: 1,       // mancia < 10 token
  TIP_BIG: 10,        // mancia >= 10 token
  PREMIUM_SIGNATURE: 5,
  BOOST: 10,
  BOOK_COMPLETE: 20,
  BADGE_EARNED: 15,
  BLOCK_COMPLETE: 2,
} as const
