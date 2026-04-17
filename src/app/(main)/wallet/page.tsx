'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Coins, Gift, Unlock, ShoppingCart, Sparkles, Star } from 'lucide-react'

type TokenPackage = {
  id: string
  name: string
  tokens: number
  bonus: number
  priceEur: number
  icon: typeof Coins
  accent: 'sage' | 'amber' | 'emerald'
  badge?: string
}

// Pacchetti ricarica — tasso fisso 10 token = 1€
// I token acquistati vanno nella card "Token Premium" (durata illimitata)
const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'small',
    name: 'Small',
    tokens: 50,
    bonus: 0,
    priceEur: 5.0,
    icon: Coins,
    accent: 'sage',
  },
  {
    id: 'medium',
    name: 'Medium',
    tokens: 100,
    bonus: 10,
    priceEur: 10.0,
    icon: Sparkles,
    accent: 'amber',
  },
  {
    id: 'large',
    name: 'Large',
    tokens: 200,
    bonus: 30,
    priceEur: 20.0,
    icon: Star,
    accent: 'emerald',
    badge: 'Conveniente',
  },
]

export default function WalletPage() {
  const { profile, totalTokens, user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setTransactions(data || [])
      setLoading(false)
    }
    fetchTransactions()
  }, [user, supabase])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'unlock': return Unlock
      case 'purchase': return ShoppingCart
      case 'donation': return Gift
      case 'signup_bonus': return Gift
      case 'subscription_bonus': return Gift
      default: return Coins
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'unlock': return 'Sblocco blocco'
      case 'purchase': return 'Acquisto token'
      case 'donation': return 'Donazione'
      case 'signup_bonus': return 'Bonus benvenuto'
      case 'subscription_bonus': return 'Bonus abbonamento'
      case 'refund': return 'Rimborso'
      default: return type
    }
  }

  // Calcola scadenza bonus tokens
  const bonusExpireDate = profile?.bonus_tokens_expire_date
    ? new Date(profile.bonus_tokens_expire_date)
    : null
  const daysUntilExpire = bonusExpireDate
    ? Math.max(0, Math.ceil((bonusExpireDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Acquisto pacchetto — placeholder finche' Stripe non e' integrato
  const handleBuyPackage = (pkgId: string) => {
    toast.info('Pagamenti Stripe in arrivo', {
      description: `Pacchetto "${pkgId}" selezionato. L'integrazione pagamenti sara' attiva a breve.`,
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-sage-900 mb-6">Il mio wallet</h1>

      {/* Token overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-sage-500 text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-sage-200" />
            <span className="text-sm text-sage-200">Token totali</span>
          </div>
          <p className="text-3xl font-bold">{totalTokens}</p>
        </div>

        <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-bark-400">Token bonus</span>
          </div>
          <p className="text-2xl font-bold text-sage-900">{profile?.bonus_tokens || 0}</p>
          {daysUntilExpire !== null && daysUntilExpire > 0 && (
            <p className="text-xs text-bark-400 mt-1">
              Scadono tra {daysUntilExpire} giorni
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-sage-500" />
            <span className="text-sm text-bark-400">Token premium</span>
          </div>
          <p className="text-2xl font-bold text-sage-900">{profile?.premium_tokens || 0}</p>
          <p className="text-xs text-bark-400 mt-1">Non scadono mai</p>
        </div>
      </div>

      {/* Pacchetti Token (ricarica singola) */}
      <div className="mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-sage-900">Pacchetti Token</h2>
            <p className="text-xs text-bark-400 mt-0.5">Tasso fisso: 10 token = €1,00 — durata illimitata</p>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-bark-400 font-semibold hidden sm:block">Ricarica singola</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOKEN_PACKAGES.map((pkg) => {
            const Icon = pkg.icon
            const totalTk = pkg.tokens + pkg.bonus
            const accentBg = pkg.accent === 'amber'
              ? 'bg-amber-50 border-amber-200'
              : pkg.accent === 'emerald'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-sage-50 border-sage-200'
            const accentIcon = pkg.accent === 'amber'
              ? 'text-amber-600'
              : pkg.accent === 'emerald'
                ? 'text-emerald-600'
                : 'text-sage-600'
            return (
              <div
                key={pkg.id}
                className={`relative rounded-xl border ${accentBg} p-4 flex flex-col`}
              >
                {pkg.badge && (
                  <span className="absolute -top-2 right-3 text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-white rounded-full shadow-sm">
                    {pkg.badge}
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center ${accentIcon}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-sage-900">{pkg.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-sage-900">{totalTk}</span>
                  <span className="text-xs text-bark-500 font-medium">token</span>
                </div>
                {pkg.bonus > 0 && (
                  <p className="text-[11px] text-emerald-600 font-medium mb-2">
                    +{pkg.bonus} token bonus inclusi
                  </p>
                )}
                <p className="text-sm text-bark-500 mb-3">
                  €{pkg.priceEur.toFixed(2).replace('.', ',')}
                </p>
                <button
                  onClick={() => handleBuyPackage(pkg.id)}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-white border border-sage-300 text-sage-700 hover:bg-sage-500 hover:text-white hover:border-sage-500 transition-colors mt-auto"
                >
                  Acquista
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Piani VIP */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-sage-900 mb-4">Piani VIP</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              name: 'Esploratore',
              price: 'Gratis',
              period: '',
              current: profile?.subscription_plan === 'free',
              features: ['10 token di benvenuto', 'Contenuti gratuiti', 'Primo blocco gratis', 'Commenti e like'],
              color: 'border-sage-200',
              badge: 'bg-sage-100 text-sage-700',
            },
            {
              name: 'Silver',
              price: '€4,99',
              period: '/mese',
              current: profile?.subscription_plan === 'silver',
              features: ['10 token bonus/mese', 'Sconto 15% blocchi', 'Anteprima blocchi 24h', 'Contenuti Silver', 'Badge Silver'],
              color: 'border-gray-300',
              badge: 'bg-gray-100 text-gray-700',
            },
            {
              name: 'Gold',
              price: '€9,99',
              period: '/mese',
              current: profile?.subscription_plan === 'gold',
              features: ['20 token bonus/mese', 'Sconto 30% blocchi', 'Anteprima blocchi 48h', 'Tutto il catalogo', 'Badge Gold', 'Supporto prioritario'],
              color: 'border-amber-300',
              badge: 'bg-amber-50 text-amber-700',
            },
          ].map((plan) => (
            <div key={plan.name} className={`bg-white dark:bg-[#1e221c] rounded-2xl border-2 ${plan.current ? plan.color + ' ring-2 ring-sage-300' : 'border-sage-100 dark:border-sage-800'} p-5 relative flex flex-col h-full`}>
              {plan.current && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 bg-sage-500 text-white rounded-full">
                  Piano attuale
                </span>
              )}
              <div className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 self-start ${plan.badge}`}>
                {plan.name}
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold text-sage-900">{plan.price}</span>
                {plan.period && <span className="text-sm text-bark-400">{plan.period}</span>}
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-bark-500">
                    <span className="text-sage-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.current ? (
                <div className="w-full py-2 rounded-xl text-center text-sm font-medium bg-sage-50 text-sage-600 mt-auto">
                  Attivo
                </div>
              ) : (
                <button className="w-full py-2 rounded-xl text-sm font-medium bg-sage-500 text-white hover:bg-sage-600 transition-colors mt-auto">
                  {plan.price === 'Gratis' ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-bark-400 text-center mt-3">
          I pagamenti saranno disponibili prossimamente tramite Stripe
        </p>
      </div>

      {/* Transaction history */}
      <div className="bg-white dark:bg-[#1e221c] rounded-2xl border border-sage-100 dark:border-sage-800 p-6">
        <h2 className="text-lg font-bold text-sage-900 mb-4">Cronologia</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-sage-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-sm text-bark-400 py-8">Nessuna transazione ancora</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const Icon = getTypeIcon(tx.type)
              const isPositive = tx.amount > 0
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sage-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isPositive ? 'bg-sage-100' : 'bg-red-50'
                  }`}>
                    <Icon className={`w-5 h-5 ${isPositive ? 'text-sage-600' : 'text-red-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sage-800">{getTypeLabel(tx.type)}</p>
                    <p className="text-xs text-bark-400 truncate">{tx.description || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isPositive ? 'text-sage-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{tx.amount} tk
                    </p>
                    <p className="text-[10px] text-bark-400">
                      {new Date(tx.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
