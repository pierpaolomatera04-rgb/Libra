import { Award, Gem } from 'lucide-react'
import { getXpLevel } from '@/lib/badges'

export type LevelRank = 'bronzo' | 'argento' | 'oro' | 'diamante' | null

/**
 * Mappatura livello XP → grado Community (curva lineare 100 XP/livello).
 *   Bronzo:   livelli 1-9    (0 XP+)       — tier di default
 *   Argento:  livelli 10-24  (900 XP+)
 *   Oro:      livelli 25-49  (2400 XP+)
 *   Diamante: livelli 50+    (4900 XP+)
 */
export function getLevelRank(totalXp: number | null | undefined): LevelRank {
  const xp = totalXp ?? 0
  const { level } = getXpLevel(xp)
  if (level >= 50) return 'diamante'
  if (level >= 25) return 'oro'
  if (level >= 10) return 'argento'
  return 'bronzo'
}

const RANK_STYLES: Record<Exclude<LevelRank, null>, {
  label: string
  ring: string
  bg: string
  text: string
  glow: string
}> = {
  bronzo: {
    label: 'Bronzo',
    ring: 'border-amber-700/40',
    bg: 'bg-gradient-to-br from-amber-200 to-amber-700',
    text: 'text-amber-900',
    glow: '',
  },
  argento: {
    label: 'Argento',
    ring: 'border-gray-400/60',
    bg: 'bg-gradient-to-br from-gray-100 to-gray-400',
    text: 'text-gray-800',
    glow: '',
  },
  oro: {
    label: 'Oro',
    ring: 'border-yellow-500/70',
    bg: 'bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500',
    text: 'text-amber-900',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  },
  diamante: {
    label: 'Diamante',
    ring: 'border-cyan-300/70',
    bg: 'bg-gradient-to-br from-cyan-100 via-sky-200 to-indigo-400',
    text: 'text-sky-900',
    glow: 'shadow-[0_0_12px_rgba(56,189,248,0.65)]',
  },
}

interface LevelBadgeProps {
  totalXp: number | null | undefined
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

/**
 * Badge Community basato sul livello XP (Bronzo/Argento/Oro/Diamante).
 * Bronzo è il tier di default (livelli 1-9); Argento/Oro/Diamante sono
 * sbloccati rispettivamente a livello 10, 25 e 50.
 */
export function LevelBadge({
  totalXp,
  size = 'sm',
  showLabel = false,
  className = '',
}: LevelBadgeProps) {
  const rank = getLevelRank(totalXp)
  if (!rank) return null

  const style = RANK_STYLES[rank]
  const sizeClasses =
    size === 'xs'
      ? 'w-4 h-4 text-[9px]'
      : size === 'md'
        ? 'w-6 h-6 text-xs'
        : 'w-5 h-5 text-[10px]'
  const iconSize =
    size === 'xs' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'

  const Icon = rank === 'diamante' ? Gem : Award
  const { level } = getXpLevel(totalXp ?? 0)

  return (
    <span
      title={`${style.label} — Livello ${level} (${totalXp ?? 0} XP)`}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full border ${style.ring} ${style.bg} ${style.text} ${style.glow} ${sizeClasses}`}
      >
        <Icon className={iconSize} strokeWidth={2.5} />
      </span>
      {showLabel && (
        <span className={`font-semibold ${style.text}`}>{style.label}</span>
      )}
    </span>
  )
}
