'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Coins, Gift, Unlock, ShoppingCart } from 'lucide-react'

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

        <div className="bg-white rounded-2xl border border-sage-100 p-6">
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

        <div className="bg-white rounded-2xl border border-sage-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-sage-500" />
            <span className="text-sm text-bark-400">Token premium</span>
          </div>
          <p className="text-2xl font-bold text-sage-900">{profile?.premium_tokens || 0}</p>
          <p className="text-xs text-bark-400 mt-1">Non scadono mai</p>
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
              features: ['50 token bonus/mese', 'Sconto 20% blocchi', 'Contenuti Silver', 'Badge Silver', 'Accesso anticipato'],
              color: 'border-gray-300',
              badge: 'bg-gray-100 text-gray-700',
            },
            {
              name: 'Gold',
              price: '€9,99',
              period: '/mese',
              current: profile?.subscription_plan === 'gold',
              features: ['120 token bonus/mese', 'Sconto 40% blocchi', 'Tutto il catalogo', 'Badge Gold', 'Supporto prioritario'],
              color: 'border-amber-300',
              badge: 'bg-amber-50 text-amber-700',
            },
          ].map((plan) => (
            <div key={plan.name} className={`bg-white rounded-2xl border-2 ${plan.current ? plan.color + ' ring-2 ring-sage-300' : 'border-sage-100'} p-5 relative`}>
              {plan.current && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 bg-sage-500 text-white rounded-full">
                  Piano attuale
                </span>
              )}
              <div className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${plan.badge}`}>
                {plan.name}
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold text-sage-900">{plan.price}</span>
                {plan.period && <span className="text-sm text-bark-400">{plan.period}</span>}
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-bark-500">
                    <span className="text-sage-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.current ? (
                <div className="w-full py-2 rounded-xl text-center text-sm font-medium bg-sage-50 text-sage-600">
                  Attivo
                </div>
              ) : (
                <button className="w-full py-2 rounded-xl text-sm font-medium bg-sage-500 text-white hover:bg-sage-600 transition-colors">
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
      <div className="bg-white rounded-2xl border border-sage-100 p-6">
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
