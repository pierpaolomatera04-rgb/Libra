'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, Upload, Scissors, Calendar, Coins, Users, ArrowRight, CheckCircle, TrendingUp, PenTool } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
}

export default function DiventaAutorePage() {
  const { user, profile } = useAuth()

  // Se è già autore, manda alla dashboard
  const ctaHref = profile?.is_author ? '/dashboard' : user ? '/onboarding' : '/signup'
  const ctaText = profile?.is_author ? 'Vai allo Studio Autore' : user ? 'Completa il profilo autore' : 'Registrati e inizia a pubblicare'
  const secondaryHref = user ? '/browse' : '/login'
  const secondaryText = user ? 'Torna a sfogliare' : 'Ho già un account'

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-sage-600" />
            <span className="text-xl font-bold text-sage-800">Libra</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-sage-700 hover:text-sage-800">
              Accedi
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors">
              Registrati
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Autore */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 text-center"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 bg-sage-100 rounded-full text-sage-700 text-sm font-medium mb-8">
          <PenTool className="w-4 h-4" />
          Per gli autori
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-sage-900 leading-tight max-w-4xl mx-auto">
          Pubblica il tuo libro
          <br />
          <span className="text-sage-500">e raggiungi migliaia di lettori</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg text-bark-500 mt-6 max-w-2xl mx-auto leading-relaxed">
          Su Libra puoi caricare il tuo manoscritto, dividerlo in blocchi e pubblicarlo con un calendario personalizzato.
          I lettori scoprono la tua storia, la seguono e ti supportano con i token.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href={ctaHref}
            className="px-8 py-3.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors flex items-center gap-2 text-lg"
          >
            {ctaText}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href={secondaryHref}
            className="px-8 py-3.5 border-2 border-sage-300 text-sage-700 rounded-xl font-medium hover:bg-sage-50 transition-colors text-lg"
          >
            {secondaryText}
          </Link>
        </motion.div>
      </motion.section>

      {/* Come funziona per autori - Step */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-sage-900">Come funziona per gli autori?</h2>
            <p className="text-bark-500 mt-3 max-w-xl mx-auto">
              In pochi passaggi il tuo libro sarà online e pronto per i lettori
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                icon: Upload,
                title: 'Carica il tuo libro',
                desc: 'Carica il tuo manoscritto in formato PDF, DOCX o TXT. Nessun limite di lunghezza.',
              },
              {
                step: '2',
                icon: Scissors,
                title: 'Divisione in blocchi',
                desc: 'Il sistema divide automaticamente il testo in blocchi rispettando capitoli e paragrafi. Puoi modificarli.',
              },
              {
                step: '3',
                icon: Calendar,
                title: 'Programma le uscite',
                desc: 'Scegli quando pubblicare ogni blocco con il calendario. Massimo 2 blocchi a settimana per 8 settimane.',
              },
              {
                step: '4',
                icon: Coins,
                title: 'Guadagna',
                desc: 'I lettori usano token per sbloccare i tuoi blocchi premium. Puoi impostare il prezzo e offrire il primo blocco gratis.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-6 rounded-2xl hover:bg-sage-50/50 transition-colors relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-sage-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="w-14 h-14 mx-auto bg-sage-100 rounded-2xl flex items-center justify-center mb-5 mt-4">
                  <item.icon className="w-7 h-7 text-sage-600" />
                </div>
                <h3 className="text-lg font-semibold text-sage-800 mb-3">{item.title}</h3>
                <p className="text-bark-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vantaggi */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-sage-900">Perché pubblicare su Libra?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: 'Algoritmo democratico',
                desc: 'I tuoi libri vengono promossi in base alla qualità, non al budget pubblicitario. Letture, like e commenti determinano la visibilità.',
              },
              {
                icon: Users,
                title: 'Community di lettori',
                desc: 'Costruisci un pubblico fedele che segue le tue uscite. I lettori possono commentare, mettere like e salvare i tuoi libri.',
              },
              {
                icon: CheckCircle,
                title: 'Tutto gratis per gli autori',
                desc: 'Registrarsi e pubblicare è completamente gratuito. Nessun costo nascosto, nessun abbonamento richiesto per gli autori.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-sage-100 text-center">
                <div className="w-14 h-14 mx-auto bg-sage-100 rounded-2xl flex items-center justify-center mb-5">
                  <item.icon className="w-7 h-7 text-sage-600" />
                </div>
                <h3 className="text-lg font-semibold text-sage-800 mb-3">{item.title}</h3>
                <p className="text-bark-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-sage-900 mb-6">
                La tua dashboard autore
              </h2>
              <p className="text-bark-500 mb-8 leading-relaxed">
                Tieni sotto controllo le tue statistiche in tempo reale: lettori, like, commenti,
                guadagni e molto altro. Tutto in un unico posto.
              </p>
              <div className="space-y-3">
                {[
                  'Statistiche dettagliate su ogni blocco',
                  'Grafico dei lettori nel tempo',
                  'Gestione dei commenti',
                  'Monitoraggio dei guadagni in token',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-sage-500 flex-shrink-0" />
                    <span className="text-bark-600 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cream-50 rounded-2xl p-8 shadow-sm border border-sage-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Lettori totali</span>
                  <span className="text-2xl font-bold text-sage-600">12.4k</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Token guadagnati</span>
                  <span className="text-2xl font-bold text-sage-600">8.250</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Libri pubblicati</span>
                  <span className="text-2xl font-bold text-sage-600">3</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Tasso completamento</span>
                  <span className="text-2xl font-bold text-sage-600">87%</span>
                </div>
                <p className="text-xs text-bark-400 text-center pt-2">Esempio di dashboard autore</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-20 bg-sage-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto a pubblicare la tua storia?
          </h2>
          <p className="text-sage-100 mb-8 text-lg">
            Registrati gratuitamente, completa il profilo autore e carica il tuo primo libro in pochi minuti.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-sage-700 rounded-xl font-medium hover:bg-sage-50 transition-colors text-lg"
          >
            {profile?.is_author ? 'Vai allo Studio' : 'Inizia ora — è gratis'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sage-900 text-sage-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-sage-400" />
              <span className="text-lg font-bold text-white">Libra</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/browse" className="hover:text-white transition-colors">Sfoglia</Link>
              <Link href="/autori" className="hover:text-white transition-colors">Autori</Link>
            </div>
            <p className="text-xs text-sage-400">
              &copy; 2025 Libra. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
