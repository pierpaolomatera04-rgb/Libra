export type RankKey = 'bronzo' | 'argento' | 'oro' | 'diamante'

export interface Rank {
  key: RankKey
  label: string
  /** classi tailwind per chip */
  chip: string
}

export function getRank(totalXp: number): Rank {
  if (totalXp >= 5000) return { key: 'diamante', label: 'Diamante', chip: 'bg-cyan-100 text-cyan-800 border border-cyan-300' }
  if (totalXp >= 2400) return { key: 'oro',      label: 'Oro',      chip: 'bg-amber-100 text-amber-800 border border-amber-300' }
  if (totalXp >= 900)  return { key: 'argento',  label: 'Argento',  chip: 'bg-slate-100 text-slate-700 border border-slate-300' }
  return                       { key: 'bronzo',   label: 'Bronzo',   chip: 'bg-orange-100 text-orange-800 border border-orange-300' }
}
