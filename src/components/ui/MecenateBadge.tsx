import { Award } from 'lucide-react'

export type MecenateLevel = 'bronzo' | 'argento' | 'oro' | null

export function getMecenateLevel(prestigePoints: number | null | undefined): MecenateLevel {
  const pts = prestigePoints ?? 0
  if (pts >= 201) return 'oro'
  if (pts >= 51) return 'argento'
  if (pts >= 1) return 'bronzo'
  return null
}

const LEVEL_STYLES: Record<Exclude<MecenateLevel, null>, {
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
}

interface MecenateBadgeProps {
  prestigePoints: number | null | undefined
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

/**
 * Badge dinamico Mecenate (Bronzo / Argento / Oro).
 * Se prestige_points === 0 (o null), non renderizza nulla.
 */
export function MecenateBadge({
  prestigePoints,
  size = 'sm',
  showLabel = false,
  className = '',
}: MecenateBadgeProps) {
  const level = getMecenateLevel(prestigePoints)
  if (!level) return null

  const style = LEVEL_STYLES[level]
  const sizeClasses =
    size === 'xs'
      ? 'w-4 h-4 text-[9px]'
      : size === 'md'
        ? 'w-6 h-6 text-xs'
        : 'w-5 h-5 text-[10px]'
  const iconSize =
    size === 'xs' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'

  return (
    <span
      title={`Mecenate ${style.label} — ${prestigePoints ?? 0} punti prestigio`}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full border ${style.ring} ${style.bg} ${style.text} ${style.glow} ${sizeClasses}`}
      >
        <Award className={iconSize} strokeWidth={2.5} />
      </span>
      {showLabel && (
        <span className={`font-semibold ${style.text}`}>{style.label}</span>
      )}
    </span>
  )
}
