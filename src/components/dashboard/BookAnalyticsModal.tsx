'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  X, Eye, Coins, Users, Calendar, BookOpen, Heart, MessageCircle, Bookmark,
  CreditCard, Repeat, Zap, Info, ArrowRight, Sparkles, DollarSign,
} from 'lucide-react'

type Range = 7 | 30 | 90
type Series = 'reads' | 'earnings'

interface DailyPoint {
  day: string // YYYY-MM-DD
  reads: number
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
 * Renderizza SEMPRE, anche con tutti i valori a zero (linea piatta sull'asse X).
 */
function LineAreaChart({
  data,
  series,
  height = 220,
}: {
  data: DailyPoint[]
  series: Series
  height?: number
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const W = 700
  const H = height
  const PAD = { top: 16, right: 12, bottom: 28, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const totals = data.map(d => series === 'reads' ? d.reads : d.earnings)
  const maxV = Math.max(0, ...totals)
  // Se tutti zero usiamo una scala "vuota" 0..1 così l'asse Y mostra comunque i tick
  const niceMax = maxV > 0 ? Math.ceil(maxV * 1.1) : 1
  const allZero = maxV === 0

  const x = (i: number) => PAD.left + (data.length <= 1 ? 0 : (i * innerW) / (data.length - 1))
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH

  const lineColor = series === 'reads' ? '#2563eb' : '#d97706'

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(series === 'reads' ? d.reads : d.earnings)}`)
    .join(' ')
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`

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
        .map((_, i) => `L ${x(data.length - 1 - i)} ${y(baseAtPrev[data.length - 1 - i])}`)
        .join(' ')
      layers.push({ color: colors[k], path: `${top} ${bottom} Z` })
    }
    return layers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, series, niceMax])

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
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
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
        {!allZero && series === 'reads' && <path d={areaPath} fill="url(#grad-reads)" />}
        {!allZero && series === 'earnings' && stackedPaths && (
          stackedPaths.map((l, i) => (
            <path key={i} d={l.path} fill={l.color} fillOpacity={0.55} />
          ))
        )}

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
          className="absolute -translate-x-1/2 pointer-events-none bg-bark-900 text-white px-2.5 py-1.5 rounded-md text-[11px] shadow-lg whitespace-nowrap z-10"
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
  const [hasAnyHistorical, setHasAnyHistorical] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showBonusInfo, setShowBonusInfo] = useState(false)
  // Larghezza viewport: usata per scegliere chart height (180 mobile / 250 desktop)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 640)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

      // Determina se il libro ha mai avuto dati storici (per il messaggio sotto al grafico)
      const hasInPeriod = reads.length > 0 || unlocks.length > 0
      if (hasInPeriod) {
        setHasAnyHistorical(true)
      } else {
        // Controllo storico totale (fuori dal periodo) — una sola riga è sufficiente
        const [{ data: anyReads }, { data: anyUnlocks }] = await Promise.all([
          supabase.from('block_reads').select('id').eq('book_id', book.id).limit(1),
          supabase.from('block_unlocks').select('id').eq('book_id', book.id).limit(1),
        ])
        if (cancelled) return
        setHasAnyHistorical((anyReads?.length || 0) + (anyUnlocks?.length || 0) > 0)
      }

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
      realCombined: real + plan, // token reali = sblocchi + pool abbonamenti (no donazioni per-libro disponibili)
      avgReadsPerDay: reads / days,
    }
  }, [data])

  const chartHeight = isDesktop ? 250 : 180

  const content = (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1e221c] w-full sm:max-w-[800px] sm:rounded-2xl shadow-2xl overflow-hidden h-full sm:h-auto sm:max-h-[92vh] flex flex-col"
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
          {/* Range pills — scrollabili orizzontalmente se non ci stanno */}
          <div className="flex items-center gap-1.5 px-4 pt-4 overflow-x-auto no-scrollbar">
            {([7, 30, 90] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                  range === r
                    ? 'bg-sage-600 text-white'
                    : 'bg-sage-50 dark:bg-sage-800 text-bark-500 dark:text-sage-400 hover:bg-sage-100'
                }`}
              >
                {r === 7 ? '7 giorni' : r === 30 ? '30 giorni' : '90 giorni'}
              </button>
            ))}
          </div>

          {/* Stats riepilogo periodo: 2x2 mobile, 4 in riga desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pt-4">
            <Stat icon={Eye} color="text-blue-600" label={`Letture ${range}g`} value={fmtCompact(totals.reads)} />
            <Stat icon={Coins} color="text-amber-600" label={`Guadagni ${range}g`} value={`${fmtCompact(totals.earnings)} tk`} />
            <Stat icon={Users} color="text-purple-600" label="Lettori unici" value={fmtCompact(uniqueReaders)} />
            <Stat icon={Calendar} color="text-emerald-600" label="Letture/giorno" value={fmtCompact(totals.avgReadsPerDay)} />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 px-4 pt-5 border-b border-sage-100 dark:border-sage-800">
            <TabButton active={series === 'reads'} onClick={() => setSeries('reads')} icon={Eye} label="Letture" />
            <TabButton active={series === 'earnings'} onClick={() => setSeries('earnings')} icon={Coins} label="Guadagni" />
          </div>

          {/* Chart — sempre visibile, anche con dati a zero */}
          <div className="px-2 sm:px-4 pt-4 pb-2 text-bark-700 dark:text-sage-300">
            {loading ? (
              <div className="flex items-center justify-center text-sm text-bark-400" style={{ height: chartHeight }}>
                Caricamento dati...
              </div>
            ) : (
              <>
                <LineAreaChart data={data} series={series} height={chartHeight} />
                {!hasAnyHistorical && (
                  <p className="text-center text-[11px] text-bark-400 dark:text-sage-500 mt-2 italic">
                    Inizia a pubblicare per vedere i dati crescere
                  </p>
                )}
              </>
            )}
          </div>

          {/* Tab GUADAGNI: due sezioni distinte (Reali vs Bonus) */}
          {series === 'earnings' && (
            <div className="px-4 pt-4 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Token reali — sfondo verde chiarissimo */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-700/50 bg-emerald-50/70 dark:bg-emerald-900/20 p-4 overflow-hidden min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl" aria-hidden>💰</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 leading-tight">Token reali</p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300/80 leading-tight">Convertibili in pagamento</p>
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300 leading-none">
                  {fmtCompact(totals.realCombined)} <span className="text-base">tk</span>
                </p>
                <div className="mt-3 space-y-1.5 text-[11px]">
                  <BreakdownRow icon={CreditCard} label="Sblocchi reali" value={`${fmtCompact(totals.real)} tk`} />
                  <BreakdownRow icon={Repeat} label="Pool abbonamenti" value={`${fmtCompact(totals.plan)} tk`} />
                  {/* Le mance per-libro non sono ancora tracciate a livello di book_id; quando lo saranno, sostituire questa riga */}
                </div>
              </div>

              {/* Token bonus — sfondo ambra chiarissimo */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-900/20 p-4 overflow-hidden min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl" aria-hidden>⚡</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-tight">Token bonus</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300/80 leading-tight">Solo per boost — non convertibili</p>
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 leading-none">
                  {fmtCompact(totals.bonus)} <span className="text-base">tk</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowBonusInfo(true)}
                  className="mt-3 w-full flex items-center justify-between gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Cosa sono i token bonus?
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Totali del libro — SEMPRE visibili in entrambe le tab */}
          <div className="px-4 pt-4 pb-6">
            <p className="text-xs font-semibold text-bark-400 dark:text-sage-500 uppercase tracking-wider mb-2">
              Totali del libro
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Stat icon={Eye} color="text-blue-600" label="Letture totali" value={fmtCompact(book.total_reads || 0)} />
              <Stat icon={Coins} color="text-amber-600" label="Guadagni totali" value={`${fmtCompact(book.total_earnings || 0)} tk`} />
              <Stat icon={Heart} color="text-rose-600" label="Like" value={fmtCompact(book.total_likes || 0)} />
              <Stat icon={MessageCircle} color="text-sage-600" label="Commenti" value={fmtCompact(book.total_comments || 0)} />
              <Stat icon={Bookmark} color="text-purple-600" label="Salvataggi" value={fmtCompact(book.total_saves || 0)} />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modale: cosa sono i token bonus */}
      {showBonusInfo && (
        <div
          className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setShowBonusInfo(false) }}
        >
          <div
            className="bg-white dark:bg-[#1e221c] rounded-2xl shadow-2xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-sage-900 dark:text-sage-100">Token bonus</h4>
                <p className="text-sm text-bark-500 dark:text-sage-400 mt-2 leading-relaxed">
                  I token bonus <strong>non sono denaro reale</strong>. Puoi usarli per
                  boostare i tuoi libri e aumentarne la visibilità nel catalogo. Non sono
                  convertibili in pagamento.
                </p>
              </div>
              <button
                onClick={() => setShowBonusInfo(false)}
                aria-label="Chiudi"
                className="flex-shrink-0 w-7 h-7 rounded-full bg-sage-50 dark:bg-sage-800 hover:bg-sage-100 dark:hover:bg-sage-700 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-bark-500 dark:text-sage-300" />
              </button>
            </div>
            <Link
              href="/dashboard/promuovi"
              onClick={() => { setShowBonusInfo(false); onClose() }}
              className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-sage-500 hover:bg-sage-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Zap className="w-4 h-4" />
              Vai a Promuovi
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )

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

function BreakdownRow({
  icon: Icon, label, value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-emerald-900 dark:text-emerald-200">
      <span className="inline-flex items-center gap-1 min-w-0 truncate">
        <Icon className="w-3 h-3 flex-shrink-0 opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold tabular-nums whitespace-nowrap">{value}</span>
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
