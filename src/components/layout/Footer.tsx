'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getXpLevel } from '@/lib/badges'
import { Info, Sparkles } from 'lucide-react'

export default function Footer() {
  const { profile } = useAuth()
  const totalXp = profile?.total_xp || 0
  const xpLevel = profile ? getXpLevel(totalXp) : null

  return (
    <footer className="bg-sage-900 text-sage-300 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Widget XP — solo se loggato */}
        {profile && xpLevel && (
          <div className="mb-8 flex justify-center">
            <Link
              href="/cammino-lettore"
              className="group flex items-center gap-3 px-5 py-3 bg-sage-800/80 hover:bg-sage-800 border border-sage-700/50 rounded-2xl transition-all hover:-translate-y-0.5"
            >
              {/* Cerchio livello */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                xpLevel.level >= 50
                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900'
                  : 'bg-sage-600 text-white'
              }`}>
                {xpLevel.level}
              </div>

              {/* Barra mini + info */}
              <div className="flex-1 min-w-[120px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-sage-400">{xpLevel.title}</span>
                  <span className="text-[10px] text-sage-500">{totalXp.toLocaleString()} XP</span>
                </div>
                <div className="h-1.5 bg-sage-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      xpLevel.level >= 50
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                        : 'bg-sage-400'
                    }`}
                    style={{ width: `${Math.min(100, xpLevel.progress * 100)}%` }}
                  />
                </div>
              </div>

              {/* Info icon */}
              <div className="flex items-center gap-1 text-[10px] text-sage-500 group-hover:text-sage-300 transition-colors shrink-0">
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Come funziona?</span>
              </div>
            </Link>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <img src="/logo.png" alt="Libra" className="h-10 invert brightness-90" />
          </div>
          <div className="flex items-center gap-6 text-sm flex-wrap justify-center">
            <Link href="/come-funziona" className="hover:text-white transition-colors">Come funziona</Link>
            <Link href="/cammino-lettore" className="hover:text-white transition-colors">Punti XP</Link>
            <Link href="/diventa-autore" className="hover:text-white transition-colors">Diventa Autore</Link>
            <Link href="/termini" className="hover:text-white transition-colors">Termini</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/contatti" className="hover:text-white transition-colors">Contatti</Link>
          </div>
          <div className="text-center">
            <p className="text-xs text-sage-400">
              Libra &mdash; fatto col ❤️ in Italia
            </p>
            <p className="text-xs text-sage-500 mt-1">
              &copy; 2025 Libra. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
