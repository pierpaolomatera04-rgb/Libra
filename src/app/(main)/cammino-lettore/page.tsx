'use client'

import { useAuth } from '@/contexts/AuthContext'
import { getXpLevel, XP_VALUES, LEVEL_REWARDS, XP_PER_LEVEL, getRankTier } from '@/lib/badges'
import {
  BookOpen, MessageCircle, Sparkles, Coins, Zap, Trophy,
  Gift, Star, Crown, CheckCircle2, Lock, Info, Share2, UserPlus,
  Flame, Award, Gem, ShieldCheck
} from 'lucide-react'

type XpAction = {
  label: string
  xp: number
  icon: typeof BookOpen
  desc: string
  cap?: string
  color: string
}

const XP_ACTIONS: XpAction[] = [
  { label: 'Blocco Letto', xp: XP_VALUES.BLOCK_COMPLETE, icon: BookOpen, desc: 'Ogni capitolo letto ti avvicina alla meta', color: 'bg-sage-50 text-sage-600 border-sage-200' },
  { label: 'Libro Completato', xp: XP_VALUES.BOOK_COMPLETE, icon: Trophy, cap: '1 per libro', desc: 'Il premio per la tua costanza', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Commento', xp: XP_VALUES.COMMENT, icon: MessageCircle, cap: 'max 5/giorno', desc: 'Partecipa alla discussione', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: 'Condivisione Frase', xp: XP_VALUES.SHARE_SENTENCE, icon: Share2, cap: 'max 2/giorno', desc: 'Diffondi le citazioni che ami', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { label: 'Boost Libro', xp: XP_VALUES.BOOST, icon: Zap, desc: 'Spingi la tua storia preferita in classifica', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { label: 'Mancia Inviata', xp: XP_VALUES.TIP, icon: Coins, cap: 'min 5 token', desc: 'Sostieni direttamente l\u2019autore', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Segui Autore', xp: XP_VALUES.FOLLOW_AUTHOR, icon: UserPlus, cap: 'max 3/giorno', desc: 'Resta aggiornato sui tuoi autori preferiti', color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { label: 'Streak 7 Giorni', xp: XP_VALUES.STREAK_WEEKLY, icon: Flame, cap: '1/settimana', desc: 'Premio costanza: 7 giorni di fila', color: 'bg-red-50 text-red-600 border-red-200' },
  { label: 'Primo Accesso', xp: XP_VALUES.SIGNUP_FIRST_LOGIN, icon: Sparkles, cap: 'Una tantum', desc: 'Benvenuto in Libra', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  { label: 'Profilo Completato', xp: XP_VALUES.PROFILE_COMPLETE, icon: ShieldCheck, cap: 'Una tantum', desc: 'Avatar e bio impostati', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { label: 'Primo Abbonamento', xp: XP_VALUES.FIRST_SUBSCRIPTION, icon: Star, cap: 'Una tantum', desc: 'Il tuo primo Silver o Gold', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { label: 'Upgrade Silver \u2192 Gold', xp: XP_VALUES.UPGRADE_SILVER_TO_GOLD, icon: Crown, cap: 'Una tantum', desc: 'Sali al piano superiore', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Rinnovo Silver Mensile', xp: XP_VALUES.SILVER_MONTHLY_RENEW, icon: Gift, desc: 'Bonus per ogni mese rinnovato', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { label: 'Rinnovo Gold Mensile', xp: XP_VALUES.GOLD_MONTHLY_RENEW, icon: Gift, desc: 'Bonus per ogni mese rinnovato', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { label: 'Annual Silver', xp: XP_VALUES.ANNUAL_SILVER_ACTIVATE, icon: Crown, cap: 'Una tantum', desc: 'Attivazione piano annuale Silver', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { label: 'Annual Gold', xp: XP_VALUES.ANNUAL_GOLD_ACTIVATE, icon: Crown, cap: 'Una tantum', desc: 'Attivazione piano annuale Gold', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
]

type Rank = {
  key: 'bronzo' | 'argento' | 'oro' | 'diamante'
  name: string
  range: string
  minLevel: number
  icon: typeof Award
  gradient: string
  textColor: string
  rewardLabel: string
}

const RANKS: Rank[] = [
  {
    key: 'bronzo',
    name: 'Bronzo',
    range: 'Livelli 1\u20139',
    minLevel: 1,
    icon: Award,
    gradient: 'from-amber-700 to-orange-800',
    textColor: 'text-amber-900',
    rewardLabel: 'Punto di partenza del tuo cammino',
  },
  {
    key: 'argento',
    name: 'Argento',
    range: 'Livelli 10\u201324',
    minLevel: 10,
    icon: Award,
    gradient: 'from-slate-300 to-slate-500',
    textColor: 'text-slate-700',
    rewardLabel: '+80 Reward Token',
  },
  {
    key: 'oro',
    name: 'Oro',
    range: 'Livelli 25\u201349',
    minLevel: 25,
    icon: Trophy,
    gradient: 'from-yellow-400 to-amber-500',
    textColor: 'text-yellow-700',
    rewardLabel: '+200 Reward Token + Badge esclusivo',
  },
  {
    key: 'diamante',
    name: 'Diamante',
    range: 'Livelli 50+',
    minLevel: 50,
    icon: Gem,
    gradient: 'from-cyan-300 via-sky-400 to-indigo-500',
    textColor: 'text-sky-700',
    rewardLabel: '+500 Reward Token + Badge + 1 mese Gold gratis',
  },
]

export default function CamminoLettorePage() {
  const { profile } = useAuth()
  const totalXp = profile?.total_xp || 0
  const xpLevel = getXpLevel(totalXp)
  const currentRank = getRankTier(xpLevel.level)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-sage-900 mb-3">
          Il Cammino del Lettore
        </h1>
        <p className="text-sm text-bark-500 max-w-xl mx-auto">
          Ogni livello sono 100 XP. Niente tetto: continua a leggere, condividere e supportare per scalare i ranghi.
        </p>
      </div>

      {/* Barra XP utente */}
      {profile && (
        <div className={`rounded-2xl p-5 mb-10 border ${
          currentRank === 'diamante'
            ? 'bg-gradient-to-r from-cyan-50 to-indigo-50 border-cyan-300'
            : currentRank === 'oro'
              ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
              : 'bg-white border-sage-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-black text-white shadow-md ${
                currentRank === 'diamante'
                  ? 'bg-gradient-to-br from-cyan-400 to-indigo-500'
                  : currentRank === 'oro'
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                    : currentRank === 'argento'
                      ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                      : 'bg-gradient-to-br from-amber-700 to-orange-800'
              }`}>
                {xpLevel.level}
              </div>
              <div>
                <p className="text-sm font-bold text-sage-900">
                  Livello {xpLevel.level} \u2014 Rango {currentRank.charAt(0).toUpperCase() + currentRank.slice(1)}
                </p>
                <p className="text-xs text-bark-400">
                  {totalXp.toLocaleString()} XP totali
                </p>
              </div>
            </div>
            <p className="text-xs text-bark-400">
              {xpLevel.currentXp}/{XP_PER_LEVEL} XP
            </p>
          </div>
          <div className="h-3 bg-sage-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                currentRank === 'diamante'
                  ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500'
                  : currentRank === 'oro'
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400'
                    : currentRank === 'argento'
                      ? 'bg-gradient-to-r from-slate-300 to-slate-500'
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
          Benvenuto nell&apos;Accademia di Libra! Ogni tua azione \u2014 leggere, commentare,
          condividere, sostenere gli autori \u2014 ti regala XP. Sali di livello ogni 100 XP
          e attraversa quattro ranghi: Bronzo, Argento, Oro e Diamante. A ogni rango sblocchi
          ricompense in Reward Token.
        </p>
      </div>

      {/* Sezione 1: I Ranghi */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-sage-900 mb-5 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          I Quattro Ranghi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RANKS.map((rank) => {
            const Icon = rank.icon
            const reached = xpLevel.level >= rank.minLevel
            const isCurrent = currentRank === rank.key
            return (
              <div
                key={rank.key}
                className={`relative rounded-2xl p-4 border-2 text-center transition-all ${
                  isCurrent
                    ? 'border-sage-500 shadow-lg scale-105'
                    : reached
                      ? 'border-sage-200 bg-white'
                      : 'border-sage-100 bg-sage-50/50 opacity-60'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-sage-600 px-2 py-0.5 rounded-full">
                    ATTUALE
                  </span>
                )}
                <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${rank.gradient} flex items-center justify-center shadow-md mb-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className={`text-sm font-black ${rank.textColor}`}>{rank.name}</p>
                <p className="text-[10px] text-bark-500 mt-0.5">{rank.range}</p>
                <p className="text-[10px] text-bark-600 mt-2 leading-tight">{rank.rewardLabel}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sezione 2: Come guadagnare XP */}
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
                className={`group flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${action.color}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-sage-900 truncate">{action.label}</p>
                    <span className="text-xs font-black text-sage-700 bg-white px-2 py-0.5 rounded-full shadow-sm shrink-0">
                      +{action.xp} XP
                    </span>
                  </div>
                  <p className="text-[11px] text-bark-500 mt-0.5">{action.desc}</p>
                  {action.cap && (
                    <p className="text-[10px] font-semibold text-bark-600 mt-1 inline-block bg-white/60 px-2 py-0.5 rounded-full">
                      {action.cap}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sezione 3: Ricompense per Rango */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-sage-900 mb-5 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Ricompense automatiche
        </h2>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-sage-200" />
          <div className="space-y-0">
            {LEVEL_REWARDS.map((reward) => {
              const reached = xpLevel.level >= reward.level
              const isDiamond = reward.level >= 50
              const isGold = reward.level >= 25 && reward.level < 50
              return (
                <div key={reward.level} className="relative flex items-start gap-4 py-4">
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    reached
                      ? isDiamond
                        ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-300/40'
                        : isGold
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-300/40'
                          : 'bg-gradient-to-br from-slate-300 to-slate-500 shadow-md'
                      : 'bg-sage-100 border-2 border-sage-200'
                  }`}>
                    {reached ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <Lock className="w-4 h-4 text-sage-400" />
                    )}
                  </div>
                  <div className={`flex-1 rounded-xl p-4 border transition-all ${
                    reached
                      ? isDiamond
                        ? 'bg-gradient-to-r from-cyan-50 to-indigo-50 border-cyan-300 shadow-md'
                        : isGold
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md'
                          : 'bg-white border-sage-200 shadow-sm'
                      : 'bg-sage-50/50 border-sage-100 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        reached
                          ? isDiamond
                            ? 'bg-cyan-200 text-cyan-900'
                            : isGold
                              ? 'bg-yellow-200 text-yellow-900'
                              : 'bg-slate-200 text-slate-800'
                          : 'bg-sage-100 text-sage-400'
                      }`}>
                        Livello {reward.level}
                      </span>
                      {reached && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          Sbloccato
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-sage-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-500" />
                      +{reward.rewardTokens} Reward Token
                    </p>
                    {reward.grantsExclusiveBadge && (
                      <p className="text-[11px] text-sage-700 mt-1 flex items-center gap-1">
                        <Star className="w-3 h-3" /> Badge esclusivo sul profilo
                      </p>
                    )}
                    {reward.grantsGoldMonth && (
                      <p className="text-[11px] text-sage-700 mt-1 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> 1 mese Gold gratis
                      </p>
                    )}
                    {reward.specialReward && (
                      <p className="text-[11px] text-bark-500 mt-1">{reward.specialReward}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Info Reward Token */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800 mb-1">Cosa sono i Reward Token?</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              I Reward Token sono gettoni bonus che ricevi automaticamente al raggiungimento
              dei ranghi Argento, Oro e Diamante. Possono essere usati per <strong>sbloccare nuovi
              capitoli</strong> o per <strong>boostare libri</strong>, ma <strong>non possono
              essere inviati come mancia</strong> agli autori e non sono convertibili in denaro
              reale. Quando sblocchi contenuti, il sistema usa i tuoi Reward Token prima di
              quelli acquistati.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
