'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  X, Eye, Coins, Users, Calendar, BookOpen, TrendingUp, Heart, MessageCircle, Bookmark,
} from 'lucide-react'

type Range = 7 | 30 | 90
type Series = 'reads' | 'earnings'

interface DailyPoint {
  day: string // YYYY-MM-DD
  reads: number
  earnings: number
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

/**
 * Costruisce N giorni consecutivi terminanti oggi (incluso) con valori zero,
 * poi sovrappone i punti effettivi. Garantisce serie continue per il grafico.
 */
function buildDailySeries(
  days: number,
  reads: { created_at: string }[],
  earnings: { created_at: string; amount: number }[],
): DailyPoint[] {
  const out = new Map<string, DailyPoint>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = dayKey(d)
    out.set(k, { day: k, reads: 0, earnings: 0 })
  }
  for (const r of reads) {
    const k = dayKey(new Date(r.created_at))
    const cur = out.get(k)
    if (cur) cur.reads += 1
  }
  for (const t of earnings) {
    const k = dayKey(new Date(t.created_at))
    const cur = out.get(k)
    if (cur) cur.earnings += Math.abs(Number(t.amount) || 0)
  }
  return Array.from(out.values())
}

/**
 * Chart SVG vanilla — area + linea con tooltip on hover.
 * Stile YouTube Studio: area sfumata, linea spessa, gridline orizzontali leggere.
 */
function LineAreaChart({
  data,
  series,
  color,
}: {
  data: DailyPoint[]
  series: Series
  color: string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const W = 700
  const H = 220
  const PAD = { top: 16, right: 12, bottom: 28, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const values = data.map(d => d[series])
  const maxV = Math.max(1, ...values)
  const niceMax = Math.ceil(maxV * 1.1)

  const x = (i: number) => PAD.left + (data.length <= 1 ? 0 : (i * innerW) / (data.length - 1))
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[series])}`)
    .join(' ')
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`

  // Gridlines (4 livelli)
  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD.top + innerH - p * innerH,
    label: fmtCompact(niceMax * p),
  }))

  // Etichette X: mostra ~5 punti distribuiti
  const xLabels = data.length <= 5
    ? data.map((d, i) => ({ i, label: fmtDayLabel(d.day) }))
    : [0, 1, 2, 3, 4].map(k => {
        const idx = Math.round((k * (data.length - 1)) / 4)
        return { i: idx, label: fmtDayLabel(data[idx].day) }
      })

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const rel = (px - PAD.left) / innerW
    const idx = Math.round(rel * (data.length - 1))
    if (idx >= 0 && idx < data.length) setHoverIdx(idx)
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={`grad-${series}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
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

        {/* Area + linea */}
        <path d={areaPath} fill={`url(#grad-${series})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />

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
              stroke={color}
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hoverIdx)}
              cy={y(data[hoverIdx][series])}
              r={5}
              fill="white"
              stroke={color}
              strokeWidth={2.5}
            />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && (
        <div
          className="absolute -translate-x-1/2 pointer-events-none bg-bark-900 text-white px-2.5 py-1.5 rounded-md text-[11px] shadow-lg whitespace-nowrap"
          style={{
            left: `${(x(hoverIdx) / W) * 100}%`,
            top: 0,
          }}
        >
          <div className="font-semibold">{fmtDayLabel(data[hoverIdx].day)}</div>
          <div className="opacity-90">
            {series === 'reads'
              ? `${data[hoverIdx].reads} ${data[hoverIdx].reads === 1 ? 'lettura' : 'letture'}`
              : `${data[hoverIdx].earnings} tk`}
          </div>
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

  // ESC chiude la modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Fetch time-series
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const since = new Date()
      since.setHours(0, 0, 0, 0)
      since.setDate(since.getDate() - (range - 1))
      const sinceIso = since.toISOString()

      const [readsRes, txRes] = await Promise.all([
        supabase
          .from('block_reads')
          .select('user_id, created_at')
          .eq('book_id', book.id)
          .gte('created_at', sinceIso),
        supabase
          .from('transactions')
          .select('amount, created_at')
          .eq('book_id', book.id)
          .eq('type', 'unlock')
          .gte('created_at', sinceIso),
      ])

      if (cancelled) return

      const reads = (readsRes.data as any[]) || []
      const tx = (txRes.data as any[]) || []
      setData(buildDailySeries(range, reads, tx))
      setUniqueReaders(new Set(reads.map(r => r.user_id)).size)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [book.id, range, supabase])

  const totals = useMemo(() => {
    const reads = data.reduce((s, d) => s + d.reads, 0)
    const earnings = data.reduce((s, d) => s + d.earnings, 0)
    const days = data.length || 1
    return {
      reads,
      earnings,
      avgReadsPerDay: reads / days,
    }
  }, [data])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
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
              <LineAreaChart
                data={data}
                series={series}
                color={series === 'reads' ? '#2563eb' : '#d97706'}
              />
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
