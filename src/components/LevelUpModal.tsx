'use client'

import { useEffect, useState } from 'react'
import { Star, Gift, Sparkles, Crown, X } from 'lucide-react'
import { getLevelTitle, getRewardForLevel, getRankTier } from '@/lib/badges'
import type { XpResult } from '@/lib/xp'

interface LevelUpModalProps {
  result: XpResult
  onClose: () => void
}

export default function LevelUpModal({ result, onClose }: LevelUpModalProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setShow(true))
  }, [])

  const handleClose = () => {
    setShow(false)
    setTimeout(onClose, 300)
  }

  const reward = getRewardForLevel(result.new_level)
  const title = getLevelTitle(result.new_level)
  const rank = getRankTier(result.new_level)
  const isDiamond = rank === 'diamante'
  const isGold = rank === 'oro'
  const isSilver = rank === 'argento'
  const isPremium = isDiamond || isGold || isSilver

  const rewardTokens = result.reward_tokens || 0
  const grantsGoldMonth = result.granted_gold_month
  const grantsBadge = result.granted_exclusive_badge
  const specialReward = result.special_reward || reward?.specialReward

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-all duration-300 ${
        show ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative max-w-sm w-full mx-4 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
          show ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'
        } ${isDiamond ? 'ring-2 ring-cyan-400 ring-offset-2' : isGold ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 ${
          isDiamond
            ? 'bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600'
            : isGold
              ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500'
              : isSilver
                ? 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700'
                : 'bg-gradient-to-br from-sage-500 via-sage-600 to-emerald-600'
        }`} />

        {/* Particle effect overlay */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white/30 rounded-full animate-ping"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative px-6 py-10 text-center text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative inline-flex items-center justify-center mb-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              isPremium ? 'bg-white/25' : 'bg-white/20'
            }`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isPremium ? 'bg-white/30' : 'bg-white/20'
              }`}>
                <span className="text-4xl font-black">{result.new_level}</span>
              </div>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-8 h-8 text-yellow-300 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black mb-1">Level Up!</h2>
          <p className="text-lg font-semibold text-white/90 mb-1">{title}</p>
          {(isDiamond || isGold || isSilver) && (
            <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-5">
              Rango {rank.charAt(0).toUpperCase() + rank.slice(1)} sbloccato
            </p>
          )}

          {/* Rewards */}
          {(rewardTokens > 0 || grantsBadge || grantsGoldMonth || specialReward) && (
            <div className="space-y-3 mb-6">
              {rewardTokens > 0 && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Gift className="w-5 h-5 text-yellow-300" />
                  <span className="text-base font-bold">+{rewardTokens} Reward Token</span>
                </div>
              )}
              {grantsBadge && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-semibold">Badge esclusivo sul profilo</span>
                </div>
              )}
              {grantsGoldMonth && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Crown className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-semibold">1 mese Gold gratis</span>
                </div>
              )}
              {specialReward && !grantsBadge && !grantsGoldMonth && rewardTokens === 0 && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-semibold">{specialReward}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-white/60 mb-6">
            {result.new_total_xp.toLocaleString()} XP totali
          </p>

          <button
            onClick={handleClose}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
              isDiamond
                ? 'bg-indigo-900 text-cyan-100 hover:bg-indigo-800'
                : isGold
                  ? 'bg-yellow-900 text-yellow-100 hover:bg-yellow-800'
                  : 'bg-white text-sage-700 hover:bg-sage-50'
            }`}
          >
            Continua
          </button>
        </div>
      </div>
    </div>
  )
}
