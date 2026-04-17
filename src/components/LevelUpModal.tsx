'use client'

import { useEffect, useState } from 'react'
import { Star, Gift, Sparkles, X } from 'lucide-react'
import { getLevelTitle, getRewardForLevel } from '@/lib/badges'
import type { XpResult } from '@/lib/xp'

// Funzione importata localmente (getLevelTitle non è esportata di default)
function getTitleForLevel(level: number): string {
  // Ricalcola — uguale a badges.ts
  const titles: Record<number, string> = {
    1: 'Principiante', 2: 'Curioso', 3: 'Lettore', 4: 'Appassionato',
    5: 'Esploratore', 6: 'Studioso', 7: 'Assiduo', 8: 'Dedito',
    9: 'Veterano', 10: 'Esperto', 11: 'Navigato', 12: 'Avido',
    13: 'Instancabile', 14: 'Raffinato', 15: 'Conoscitore',
    16: 'Illuminato', 17: 'Saggio', 18: 'Erudito', 19: 'Maestro',
    20: 'Virtuoso', 21: 'Mentore', 22: 'Custode', 23: 'Guardiano',
    24: 'Campione', 25: 'Protagonista', 26: 'Titano', 27: 'Stratega',
    28: 'Eroico', 29: 'Glorioso', 30: 'Leggenda', 31: 'Mitico',
    32: 'Epico', 33: 'Trascendente', 34: 'Divino', 35: 'Eterno',
    36: 'Celestiale', 37: 'Cosmico', 38: 'Supremo', 39: 'Onnisciente',
    40: 'Immortale', 41: 'Arcano', 42: 'Primordiale', 43: 'Infinito',
    44: 'Assoluto', 45: 'Trascendentale', 46: 'Universale',
    47: 'Etereo', 48: 'Inarrestabile', 49: 'Definitivo', 50: 'Asceso',
  }
  return titles[Math.min(level, 50)] || `Livello ${level}`
}

interface LevelUpModalProps {
  result: XpResult
  onClose: () => void
}

export default function LevelUpModal({ result, onClose }: LevelUpModalProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Animazione entrata
    requestAnimationFrame(() => setShow(true))
  }, [])

  const handleClose = () => {
    setShow(false)
    setTimeout(onClose, 300)
  }

  const reward = getRewardForLevel(result.new_level)
  const title = getTitleForLevel(result.new_level)
  const isGold = result.new_level === 50

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
        } ${isGold ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 ${
          isGold
            ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500'
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
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Level number */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              isGold ? 'bg-yellow-300/30' : 'bg-white/20'
            }`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isGold ? 'bg-yellow-200/40' : 'bg-white/20'
              }`}>
                <span className="text-4xl font-black">{result.new_level}</span>
              </div>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-8 h-8 text-yellow-300 animate-pulse" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black mb-1">Level Up!</h2>
          <p className="text-lg font-semibold text-white/90 mb-6">{title}</p>

          {/* Rewards */}
          {(reward?.tokenBonus || reward?.specialReward || result.token_reward > 0) && (
            <div className="space-y-3 mb-6">
              {result.token_reward > 0 && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Gift className="w-5 h-5 text-yellow-300" />
                  <span className="text-base font-bold">+{result.token_reward} Token Bonus</span>
                </div>
              )}
              {result.special_reward && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-semibold">{result.special_reward}</span>
                </div>
              )}
            </div>
          )}

          {/* XP info */}
          <p className="text-sm text-white/60 mb-6">
            {result.new_total_xp.toLocaleString()} XP totali
          </p>

          {/* CTA */}
          <button
            onClick={handleClose}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
              isGold
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
