'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-sage-900 text-sage-300 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
