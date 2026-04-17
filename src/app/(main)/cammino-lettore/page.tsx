'use client'

import { useAuth } from '@/contexts/AuthContext'
import { getXpLevel, XP_VALUES, LEVEL_REWARDS } from '@/lib/badges'
import {
  BookOpen, MessageCircle, Sparkles, Coins, Zap, Trophy,
  Gift, Star, Crown, CheckCircle2, Lock, Info
} from 'lucide-react'

const XP_ACTIONS = [
  { label: 'Lettura Blocco', xp: XP_VALUES.BLOCK_COMPLETE, icon: BookOpen, desc: 'Ogni capitolo letto ti avvicina alla meta!', color: 'bg-sage-50 text-sage-600 border-sage-200' },
  { label: 'Libro Completato', xp: XP_VALUES.BOOK_COMPLETE, icon: Trophy, desc: 'Il premio per la tua costanza', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Commento', xp: XP_VALUES.COMMENT, icon: MessageCircle, desc: 'Partecipa alla discussione', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: 'Firma Animata', xp: XP_VALUES.PREMIUM_SIGNATURE, icon: Sparkles, desc: 'Lascia il tuo segno con stile', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  { label: 'Mancia < 10 Token', xp: XP_VALUES.TIP_SMALL, icon: Coins, desc: 'Ogni piccolo gesto conta', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Mancia \u2265 10 Token', xp: XP_VALUES.TIP_BIG, icon: Coins, desc: 'Un supporto straordinario per l\'autore', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Boost Libro', xp: XP_VALUES.BOOST, icon: Zap, desc: 'Spingi la tua storia preferita in classifica', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { label: 'Ottenimento Badge', xp: XP_VALUES.BADGE_EARNED, icon: Star, desc: 'Traguardi speciali raggiunti', color: 'bg-rose-50 text-rose-600 border-rose-200' },
]

const TIMELINE_ITEMS = [
  { level: 5, emoji: '🎁', label: '+5 TOKEN BONUS', desc: 'I primi passi vengono premiati', type: 'token' as const },
  { level: 10, emoji: '🎁', label: '+10 TOKEN BONUS', desc: 'Stai diventando un vero lettore', type: 'token' as const },
  { level: 20, emoji: '✨', label: 'Firma Animata Speciale', desc: 'Sblocca una firma unica per i tuoi commenti', type: 'special' as const },
  { level: 30, emoji: '🎁', label: '+50 TOKEN BONUS', desc: 'Un traguardo importante', type: 'token' as const },
  { level: 40, emoji: '🎁', label: '+20 TOKEN BONUS', desc: 'Quasi in cima...', type: 'token' as const },
  { level: 50, emoji: '🏆', label: 'RANGO LEGGENDA', desc: '+100 Token Bonus e Nome Oro nelle Classifiche', type: 'legendary' as const },
]

export default function CamminoLettorePage() {
  const { profile } = useAuth()
  const totalXp = profile?.total_xp || 0
  const xpLevel = getXpLevel(totalXp)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header con barra XP reale */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-sage-900 mb-3">
          Il Cammino del Lettore
        </h1>
        <p className="text-sm text-bark-500 max-w-xl mx-auto">
          Guida ai Punti XP
        </p>
      </div>

      {/* Barra XP utente */}
      {profile && (
        <div className={`rounded-2xl p-5 mb-10 border ${
          xpLevel.level >= 50
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
            : 'bg-white border-sage-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${
                xpLevel.level >= 50
                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white'
                  : 'bg-sage-500 text-white'
              }`}>
                {xpLevel.level}
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  xpLevel.level >= 50
                    ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
                    : 'text-sage-900'
                }`}>
                  Livello {xpLevel.level} — {xpLevel.title}
                </p>
                <p className="text-xs text-bark-400">
                  {totalXp.toLocaleString()} XP totali
                </p>
              </div>
            </div>
            {xpLevel.level < 50 && (
              <p className="text-xs text-bark-400">
                {xpLevel.currentXp}/{xpLevel.nextLevelXp} XP
              </p>
            )}
          </div>
          <div className="h-3 bg-sage-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                xpLevel.level >= 50
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-sage-400 to-sage-600'
              }`}
              style={{ width: `${Math.min(100, xpLevel.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Intro */}
      <div className="bg-sage-50 rounded-2xl p-6 mb-10 border border-sage-100">
        <p className="text-sm text-bark-600 leading-relaxed">
          Benvenuto nell&apos;Accademia di Libra! Ogni tua azione sulla piattaforma non
          &egrave; solo un supporto agli autori, ma un passo verso il titolo di Leggenda.
          Scopri come accumulare esperienza, scalare i 50 livelli e sbloccare ricompense esclusive.
        </p>
      </div>

      {/* Sezione 1: Come guadagnare XP */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-sage-900 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Come guadagnare XP
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {XP_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <div
                key={action.label}
                className={`group flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${action.color}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-sage-900">{action.label}</p>
                    <span className="text-xs font-black text-sage-700 bg-white px-2 py-0.5 rounded-full shadow-sm">
                      +{action.xp} XP
                    </span>
                  </div>
                  <p className="text-[11px] text-bark-500 mt-0.5">{action.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sezione 2: Timeline Premi */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-sage-900 mb-5 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          La Scalata ai Premi
        </h2>
        <div className="relative">
          {/* Linea verticale */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-sage-200" />

          <div className="space-y-0">
            {TIMELINE_ITEMS.map((item, i) => {
              const reached = xpLevel.level >= item.level
              const isLegendary = item.type === 'legendary'

              return (
                <div key={item.level} className="relative flex items-start gap-4 py-4">
                  {/* Cerchio sulla timeline */}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg transition-all ${
                    reached
                      ? isLegendary
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-300/40'
                        : 'bg-sage-500 shadow-md shadow-sage-300/40'
                      : 'bg-sage-100 border-2 border-sage-200'
                  }`}>
                    {reached ? (
                      <CheckCircle2 className={`w-5 h-5 ${isLegendary ? 'text-yellow-900' : 'text-white'}`} />
                    ) : (
                      <Lock className="w-4 h-4 text-sage-400" />
                    )}
                  </div>

                  {/* Card premio */}
                  <div className={`flex-1 rounded-xl p-4 border transition-all ${
                    reached
                      ? isLegendary
                        ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md'
                        : 'bg-white border-sage-200 shadow-sm'
                      : 'bg-sage-50/50 border-sage-100 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.emoji}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          reached
                            ? isLegendary
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-sage-100 text-sage-700'
                            : 'bg-sage-100 text-sage-400'
                        }`}>
                          Livello {item.level}
                        </span>
                      </div>
                      {reached && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          Raggiunto
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold ${
                      isLegendary && reached
                        ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
                        : 'text-sage-900'
                    }`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-bark-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Info Token Bonus */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800 mb-1">Cosa sono i Token Bonus?</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              I TOKEN BONUS sono gettoni omaggio per premiare la tua fedelt&agrave;.
              Possono essere usati per sbloccare nuovi capitoli o libri, ma non possono
              essere usati per inviare mance o essere convertiti in denaro reale.
              Il sistema user&agrave; i tuoi Token Bonus prima di quelli acquistati.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
