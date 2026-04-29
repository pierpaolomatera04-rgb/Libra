'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
import {
  X, Eye, Coins, Users, Calendar, BookOpen, TrendingUp, Heart, MessageCircle, Bookmark,
  CreditCard, Repeat, Gift,
} from 'lucide-react'

type Range = 7 | 30 | 90
type Series = 'reads' | 'earnings'

interface DailyPoint {
  day: string // YYYY-MM-DD
  reads: number
  /** breakdown — somma di tutti i tipi */
  earnings: number
  earnings_real: number     // premium
  earnings_plan: number     // abbonamento
  earnings_bonus: number    // bonus + mixed
}

interface BookAnalyticsModalProps {
  book: {
    id: string
    title: string
    cover_image_url: string | null
    total_reads?: number | null
    total_likes?: number | null
    total_comments?: number | null
    total_saves?: number | null
    total_earnings?: number | null
  }
  onClose: () => void
}

function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return Math.round(n).toString()
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function fmtDayLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`
}

function buildDailySeries(
  days: number,
  reads: { created_at: string }[],
  unlocks: { created_at: string; tokens_spent: number; token_type: string }[],
): DailyPoint[] {
  const out = new Map<string, DailyPoint>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = dayKey(d)
    out.set(k, { day: k, reads: 0, earnings: 0, earnings_real: 0, earnings_plan: 0, earnings_bonus: 0 })
  }
  for (const r of reads) {
    const k = dayKey(new Date(r.created_at))
    const cur = out.get(k)
    if (cur) cur.reads += 1
  }
  for (const u of unlocks) {
    const k = dayKey(new Date(u.created_at))
    const cur = out.get(k)
    if (!cur) continue
    const amt = Number(u.tokens_spent) || 0
    if (amt <= 0) continue
    cur.earnings += amt
    if (u.token_type === 'premium') cur.earnings_real += amt
    else if (u.token_type === 'plan') cur.earnings_plan += amt
    else cur.earnings_bonus += amt // 'bonus' o 'mixed'
  }
  return Array.from(out.values())
}

/**
 * Chart SVG vanilla — area + linea con tooltip on hover.
 * Per la serie 'earnings' disegna l'area in 3 strati impilati (real, plan, bonus).
 */
function LineAreaChart({
  data,
  series,
}: {
  data: DailyPoint[]
  series: Series
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const W = 700
  const H = 220
  const PAD = { top: 16, right: 12, bottom: 28, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const totals = data.map(d => series === 'reads' ? d.reads : d.earnings)
  const maxV = Math.max(1, ...totals)
  const niceMax = Math.ceil(maxV * 1.1)

  const x = (i: number) => PAD.left + (data.length <= 1 ? 0 : (i * innerW) / (data.length - 1))
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH

  const lineColor = series === 'reads' ? '#2563eb' : '#d97706'

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(series === 'reads' ? d.reads : d.earnings)}`)
    .join(' ')
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`

  // Strati impilati per i guadagni — bonus in basso, plan al centro, real in cima
  const stackedPaths = useMemo(() => {
    if (series !== 'earnings') return null
    type Layer = { color: string; path: string }
    const layers: Layer[] = []
    const stackKeys: ('earnings_bonus' | 'earnings_plan' | 'earnings_real')[] =
      ['earnings_bonus', 'earnings_plan', 'earnings_real']
    const colors = { earnings_bonus: '#fbbf24', earnings_plan: '#a855f7', earnings_real: '#10b981' }
    const baselines = data.map(() => 0)
    for (const k of stackKeys) {
      const tops: number[] = []
      for (let i = 0; i < data.length; i++) {
        baselines[i] += data[i][k]
        tops.push(baselines[i])
      }
      const top = tops.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')
      const baseAtPrev = tops.map((v, i) => v - data[i][k])
      const bottom = [...baseAtPrev]
        .map((v, i) => `L ${x(data.length - 1 - i)} ${y(baseAtPrev[data.length - 1 - i])}`)
        .join(' ')
      layers.push({ color: colors[k], path: `${top} ${bottom} Z` })
    }
    return layers
  }, [data, series, x, y])

  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD.top + innerH - p * innerH,
    label: fmtCompact(niceMax * p),
  }))

  const xLabels = data.length <= 5
    ? data.map((_, i) => ({ i, label: fmtDayLabel(data[i].day) }))
    : [0, 1, 2, 3, 4].map(k => {
        const idx = Math.round((k * (data.length - 1)) / 4)
        return { i: idx, label: fmtDayLabel(data[idx].day) }
      })

  const onMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const px = ((clientX - rect.left) / rect.width) * W
    const rel = (px - PAD.left) / innerW
    const idx = Math.round(rel * (data.length - 1))
    if (idx >= 0 && idx < data.length) setHoverIdx(idx)
  }

  const hoverPoint = hoverIdx !== null ? data[hoverIdx] : null

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchMove={onMove}
        onTouchEnd={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="grad-reads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridLevels.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={g.y}
              y2={g.y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="3 3"
            />
            <text
              x={PAD.left - 6}
              y={g.y + 3}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.45}
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Area */}
        {series === 'reads' ? (
          <path d={areaPath} fill="url(#grad-reads)" />
        ) : stackedPaths ? (
          stackedPaths.map((l, i) => (
            <path key={i} d={l.path} fill={l.color} fillOpacity={0.55} />
          ))
        ) : null}

        {/* Linea totale */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2.2} strokeLinejoin="round" />

        {/* X axis labels */}
        {xLabels.map(l => (
          <text
            key={l.i}
            x={x(l.i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.55}
          >
            {l.label}
          </text>
        ))}

        {/* Hover indicator */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke={lineColor}
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hoverIdx)}
              cy={y(series === 'reads' ? data[hoverIdx].reads : data[hoverIdx].earnings)}
              r={5}
              fill="white"
              stroke={lineColor}
              strokeWidth={2.5}
            />
          </g>
        )}
      </svg>

      {/* Legenda guadagni */}
      {series === 'earnings' && (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-1 mt-2 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} />
            Reali
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#a855f7' }} />
            Abbonamenti
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#fbbf24' }} />
            Bonus
          </span>
        </div>
      )}

      {/* Tooltip */}
      {hoverPoint && (
        <div
          className="absolute -translate-x-1/2 pointer-events-none bg-bark-900 text-white px-2.5 py-1.5 rounded-md text-[11px] shadow-lg whitespace-nowrap"
          style={{
            left: `${(x(hoverIdx!) / W) * 100}%`,
            top: 0,
          }}
        >
          <div className="font-semibold">{fmtDayLabel(hoverPoint.day)}</div>
          {series === 'reads' ? (
            <div className="opacity-90">
              {hoverPoint.reads} {hoverPoint.reads === 1 ? 'lettura' : 'letture'}
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="font-semibold">{hoverPoint.earnings} tk</div>
              {hoverPoint.earnings_real > 0 && (
                <div className="text-[10px]"><span style={{ color: '#10b981' }}>●</span> Reali: {hoverPoint.earnings_real}</div>
              )}
              {hoverPoint.earnings_plan > 0 && (
                <div className="text-[10px]"><span style={{ color: '#a855f7' }}>●</span> Abb.: {hoverPoint.earnings_plan}</div>
              )}
              {hoverPoint.earnings_bonus > 0 && (
                <div className="text-[10px]"><span style={{ color: '#fbbf24' }}>●</span> Bonus: {hoverPoint.earnings_bonus}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BookAnalyticsModal({ book, onClose }: BookAnalyticsModalProps) {
  const supabase = createClient()
  const [range, setRange] = useState<Range>(30)
  const [series, setSeries] = useState<Series>('reads')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DailyPoint[]>([])
  const [uniqueReaders, setUniqueReaders] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Portal: monta solo lato client per evitare hydration mismatch
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Fetch time-series — letture da block_reads, guadagni da block_unlocks (split per token_type)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const since = new Date()
      since.setHours(0, 0, 0, 0)
      since.setDate(since.getDate() - (range - 1))
      const sinceIso = since.toISOString()

      const [readsRes, unlocksRes] = await Promise.all([
        supabase
          .from('block_reads')
          .select('user_id, created_at')
          .eq('book_id', book.id)
          .gte('created_at', sinceIso),
        supabase
          .from('block_unlocks')
          .select('tokens_spent, token_type, created_at')
          .eq('book_id', book.id)
          .gte('created_at', sinceIso),
      ])

      if (cancelled) return

      const reads = (readsRes.data as any[]) || []
      const unlocks = (unlocksRes.data as any[]) || []
      setData(buildDailySeries(range, reads, unlocks))
      setUniqueReaders(new Set(reads.map(r => r.user_id)).size)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [book.id, range, supabase])

  const totals = useMemo(() => {
    const reads = data.reduce((s, d) => s + d.reads, 0)
    const earnings = data.reduce((s, d) => s + d.earnings, 0)
    const real = data.reduce((s, d) => s + d.earnings_real, 0)
    const plan = data.reduce((s, d) => s + d.earnings_plan, 0)
    const bonus = data.reduce((s, d) => s + d.earnings_bonus, 0)
    const days = data.length || 1
    return {
      reads,
      earnings,
      real,
      plan,
      bonus,
      avgReadsPerDay: reads / days,
    }
  }, [data])

  const content = (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1e221c] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-sage-100 dark:border-sage-800 flex-shrink-0">
          {book.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_image_url} alt="" className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-sage-100 dark:bg-sage-800 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-sage-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-bark-400 dark:text-sage-500 font-semibold uppercase tracking-wider">
              Statistiche libro
            </p>
            <h3 className="text-base sm:text-lg font-bold text-sage-900 dark:text-sage-100 leading-tight break-words">
              {book.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="flex-shrink-0 w-8 h-8 rounded-full bg-sage-50 dark:bg-sage-800 hover:bg-sage-100 dark:hover:bg-sage-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-bark-500 dark:text-sage-300" />
          </button>
        </div>

        {/* Body scrollabile */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Range pills */}
          <div className="flex items-center gap-1.5 px-4 pt-4">
            {([7, 30, 90] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  range === r
                    ? 'bg-sage-600 text-white'
                    : 'bg-sage-50 dark:bg-sage-800 text-bark-500 dark:text-sage-400 hover:bg-sage-100'
                }`}
              >
                {r === 7 ? '7 giorni' : r === 30 ? '30 giorni' : '90 giorni'}
              </button>
            ))}
          </div>

          {/* Stats riepilogo (periodo selezionato) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pt-4">
            <Stat icon={Eye} color="text-blue-600" label={`Letture ${range}g`} value={fmtCompact(totals.reads)} />
            <Stat icon={Coins} color="text-amber-600" label={`Guadagni ${range}g`} value={`${fmtCompact(totals.earnings)} tk`} />
            <Stat icon={Users} color="text-purple-600" label="Lettori unici" value={fmtCompact(uniqueReaders)} />
            <Stat icon={Calendar} color="text-emerald-600" label="Letture/giorno" value={fmtCompact(totals.avgReadsPerDay)} />
          </div>

          {/* Breakdown guadagni per tipo */}
          <div className="px-4 pt-4">
            <p className="text-[11px] font-semibold text-bark-400 dark:text-sage-500 uppercase tracking-wider mb-2">
              Guadagni per origine ({range}g)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <SplitStat
                icon={CreditCard}
                color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                label="Reali"
                hint="Pagati con token acquistati"
                value={`${fmtCompact(totals.real)} tk`}
                pct={totals.earnings > 0 ? (totals.real / totals.earnings) * 100 : 0}
              />
              <SplitStat
                icon={Repeat}
                color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                label="Abbonamenti"
                hint="Letture da utenti con piano attivo"
                value={`${fmtCompact(totals.plan)} tk`}
                pct={totals.earnings > 0 ? (totals.plan / totals.earnings) * 100 : 0}
              />
              <SplitStat
                icon={Gift}
                color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                label="Bonus"
                hint="Token bonus / promozionali"
                value={`${fmtCompact(totals.bonus)} tk`}
                pct={totals.earnings > 0 ? (totals.bonus / totals.earnings) * 100 : 0}
              />
            </div>
          </div>

          {/* Tabs serie */}
          <div className="flex items-center gap-1.5 px-4 pt-5 border-b border-sage-100 dark:border-sage-800">
            <TabButton active={series === 'reads'} onClick={() => setSeries('reads')} icon={Eye} label="Letture" />
            <TabButton active={series === 'earnings'} onClick={() => setSeries('earnings')} icon={Coins} label="Guadagni" />
          </div>

          {/* Chart */}
          <div className="px-2 sm:px-4 pt-4 pb-4 text-bark-700 dark:text-sage-300">
            {loading ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-bark-400">
                Caricamento dati...
              </div>
            ) : data.every(d => d.reads === 0 && d.earnings === 0) ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-sm text-bark-400 gap-2">
                <TrendingUp className="w-8 h-8 text-sage-200" />
                <span>Nessun dato in questo periodo</span>
              </div>
            ) : (
              <LineAreaChart data={data} series={series} />
            )}
          </div>

          {/* Stats totali libro (life-time) */}
          <div className="px-4 pb-6">
            <p className="text-xs font-semibold text-bark-400 dark:text-sage-500 uppercase tracking-wider mb-2">
              Totali del libro
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat icon={Eye} color="text-blue-600" label="Letture totali" value={fmtCompact(book.total_reads || 0)} />
              <Stat icon={Coins} color="text-amber-600" label="Guadagni totali" value={`${fmtCompact(book.total_earnings || 0)} tk`} />
              <Stat icon={Heart} color="text-rose-600" label="Like" value={fmtCompact(book.total_likes || 0)} />
              <Stat icon={MessageCircle} color="text-sage-600" label="Commenti" value={fmtCompact(book.total_comments || 0)} />
              <Stat icon={Bookmark} color="text-purple-600" label="Salvataggi" value={fmtCompact(book.total_saves || 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Portal: monta direttamente sul body così nessuno stacking-context
  // o overflow-hidden di un layout antenato può "intrappolare" la modale.
  if (!mounted) return null
  return createPortal(content, document.body)
}

function Stat({
  icon: Icon, color, label, value,
}: {
  icon: any
  color: string
  label: string
  value: string
}) {
  return (
    <div className="bg-sage-50 dark:bg-sage-800/40 rounded-xl p-2.5 overflow-hidden min-w-0">
      <div className="flex items-center gap-1 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-bark-400 dark:text-sage-500 truncate">{label}</span>
      </div>
      <p className="text-[18px] leading-tight font-bold text-sage-900 dark:text-sage-100 truncate">{value}</p>
    </div>
  )
}

function SplitStat({
  icon: Icon, color, label, hint, value, pct,
}: {
  icon: any
  color: string
  label: string
  hint: string
  value: string
  pct: number
}) {
  return (
    <div className="rounded-xl p-2.5 border border-sage-100 dark:border-sage-800 bg-white dark:bg-sage-900/30 overflow-hidden min-w-0" title={hint}>
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mb-1.5 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] text-bark-400 dark:text-sage-500 truncate">{label}</p>
      <p className="text-[15px] leading-tight font-bold text-sage-900 dark:text-sage-100 truncate">{value}</p>
      <p className="text-[10px] text-bark-400 dark:text-sage-500 mt-0.5">{pct.toFixed(0)}%</p>
    </div>
  )
}

function TabButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active
          ? 'border-sage-600 text-sage-700 dark:text-sage-200'
          : 'border-transparent text-bark-400 dark:text-sage-500 hover:text-sage-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
