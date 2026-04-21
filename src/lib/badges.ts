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
// SISTEMA XP — curva lineare infinita (100 XP/livello)
// ============================================
// Livello N richiede (N-1) * 100 XP cumulativi.
// Rank:
//   Bronzo:   livelli 1-9    (0-899 XP)
//   Argento:  livelli 10-24  (900-2399 XP)
//   Oro:      livelli 25-49  (2400-4899 XP)
//   Diamante: livelli 50+    (4900+ XP)
// ============================================

export const XP_PER_LEVEL = 100

export interface XpLevelInfo {
  level: number
  title: string
  currentXp: number     // XP accumulati in questo livello
  nextLevelXp: number   // XP richiesti per livello successivo
  totalXp: number       // XP totali dell'utente
  progress: number      // 0-1
}

function levelThreshold(level: number): number {
  if (level <= 1) return 0
  return (level - 1) * XP_PER_LEVEL
}

// Titoli dei primi 50 livelli (oltre il 50 resta "Asceso")
const LEVEL_TITLES: Record<number, string> = {
  1: 'Principiante', 2: 'Curioso', 3: 'Lettore', 4: 'Appassionato', 5: 'Esploratore',
  6: 'Studioso', 7: 'Assiduo', 8: 'Dedito', 9: 'Veterano', 10: 'Esperto',
  11: 'Navigato', 12: 'Avido', 13: 'Instancabile', 14: 'Raffinato', 15: 'Conoscitore',
  16: 'Illuminato', 17: 'Saggio', 18: 'Erudito', 19: 'Maestro', 20: 'Virtuoso',
  21: 'Mentore', 22: 'Custode', 23: 'Guardiano', 24: 'Campione', 25: 'Protagonista',
  26: 'Titano', 27: 'Stratega', 28: 'Eroico', 29: 'Glorioso', 30: 'Leggenda',
  31: 'Mitico', 32: 'Epico', 33: 'Trascendente', 34: 'Divino', 35: 'Eterno',
  36: 'Celestiale', 37: 'Cosmico', 38: 'Supremo', 39: 'Onnisciente', 40: 'Immortale',
  41: 'Arcano', 42: 'Primordiale', 43: 'Infinito', 44: 'Assoluto', 45: 'Trascendentale',
  46: 'Universale', 47: 'Etereo', 48: 'Inarrestabile', 49: 'Definitivo', 50: 'Asceso',
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return LEVEL_TITLES[50]
  return LEVEL_TITLES[level] || `Livello ${level}`
}

export function getXpLevel(totalXp: number): XpLevelInfo {
  const xp = Math.max(0, Math.floor(totalXp || 0))
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const currentThreshold = levelThreshold(level)
  const xpInLevel = xp - currentThreshold
  return {
    level,
    title: getLevelTitle(level),
    currentXp: xpInLevel,
    nextLevelXp: XP_PER_LEVEL,
    totalXp: xp,
    progress: Math.min(1, xpInLevel / XP_PER_LEVEL),
  }
}

// ============================================
// RANK (gradi community) basati su livello
// ============================================
export type RankTier = 'bronzo' | 'argento' | 'oro' | 'diamante'

export function getRankTier(level: number): RankTier {
  if (level >= 50) return 'diamante'
  if (level >= 25) return 'oro'
  if (level >= 10) return 'argento'
  return 'bronzo'
}

// ============================================
// PREMI AI LIVELLI CHIAVE (promozione di rank)
// ============================================
// Argento  (Lv 10): +80 REWARD_TOKEN
// Oro      (Lv 25): +200 REWARD_TOKEN + badge esclusivo profilo
// Diamante (Lv 50): +500 REWARD_TOKEN + badge + 1 mese Gold gratuito
// ============================================
export interface LevelReward {
  level: number
  rewardTokens: number
  specialReward?: string // descrizione testuale per reward non-token
  grantsGoldMonth?: boolean
  grantsExclusiveBadge?: boolean
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 10, rewardTokens: 80, specialReward: 'Rango Argento sbloccato' },
  { level: 25, rewardTokens: 200, grantsExclusiveBadge: true, specialReward: 'Rango Oro + Badge esclusivo profilo' },
  { level: 50, rewardTokens: 500, grantsExclusiveBadge: true, grantsGoldMonth: true, specialReward: 'Rango Diamante + Badge + 1 mese Gold gratis' },
]

export function getRewardForLevel(level: number): LevelReward | null {
  return LEVEL_REWARDS.find(r => r.level === level) || null
}

// ============================================
// XP VALUES — punti per azione
// ============================================
// NB: Le regole di cap (max/giorno, una tantum, 1/settimana) sono
// applicate lato server nella RPC award_xp tramite xp_event_log.
export const XP_VALUES = {
  // Lettura
  BLOCK_COMPLETE: 5,
  BOOK_COMPLETE: 50,
  // Social
  COMMENT: 5,                  // max 5/giorno
  SHARE_SENTENCE: 10,          // max 2/giorno
  FOLLOW_AUTHOR: 5,            // max 3/giorno
  // Sostegno
  BOOST: 10,                   // per ogni boost
  TIP: 20,                     // mancia min 5 token spendibili (escluso REWARD)
  // Progressione personale
  STREAK_WEEKLY: 50,           // streak 7 giorni consecutivi (1/settimana)
  // One-time / lifecycle
  SIGNUP_FIRST_LOGIN: 20,
  PROFILE_COMPLETE: 30,        // avatar + bio
  FIRST_SUBSCRIPTION: 100,
  UPGRADE_SILVER_TO_GOLD: 50,
  ANNUAL_SILVER_ACTIVATE: 360,
  ANNUAL_GOLD_ACTIVATE: 720,
  // Rinnovi mensili
  SILVER_MONTHLY_RENEW: 30,
  GOLD_MONTHLY_RENEW: 60,
} as const

// Reason keys usati lato server per daily caps / idempotency.
export const XP_REASONS = {
  BLOCK_COMPLETE: 'block_complete',
  BOOK_COMPLETE: 'book_complete',
  COMMENT: 'comment',
  SHARE_SENTENCE: 'share_sentence',
  FOLLOW_AUTHOR: 'follow_author',
  BOOST: 'boost',
  TIP: 'tip',
  STREAK_WEEKLY: 'streak_weekly',
  SIGNUP_FIRST_LOGIN: 'signup_first_login',
  PROFILE_COMPLETE: 'profile_complete',
  FIRST_SUBSCRIPTION: 'first_subscription',
  UPGRADE_SILVER_TO_GOLD: 'upgrade_silver_to_gold',
  ANNUAL_SILVER_ACTIVATE: 'annual_silver_activate',
  ANNUAL_GOLD_ACTIVATE: 'annual_gold_activate',
  SILVER_MONTHLY_RENEW: 'silver_monthly_renew',
  GOLD_MONTHLY_RENEW: 'gold_monthly_renew',
} as const
