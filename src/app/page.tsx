'use client'

import Link from 'next/link'
import { BookOpen, Sparkles, Calendar, Coins, Users, ArrowRight, TrendingUp, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar minimale per landing */}
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-sage-600" />
            <span className="text-xl font-bold text-sage-800">Libra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-sage-700 hover:text-sage-800">
              Accedi
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors">
              Registrati gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 bg-sage-100 rounded-full text-sage-700 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          La prima piattaforma italiana per storie a blocchi
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-sage-900 leading-tight max-w-4xl mx-auto">
          Scopri storie incredibili,
          <br />
          <span className="text-sage-500">un blocco alla volta</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg text-bark-500 mt-6 max-w-2xl mx-auto leading-relaxed">
          Come YouTube, ma per i libri. Gli autori pubblicano le loro storie in blocchi settimanali,
          tu le scopri, le segui e supporti chi merita.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors flex items-center gap-2 text-lg"
          >
            Inizia a leggere gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/come-funziona"
            className="px-8 py-3.5 border-2 border-sage-300 text-sage-700 rounded-xl font-medium hover:bg-sage-50 transition-colors text-lg"
          >
            Come funziona?
          </Link>
        </motion.div>
      </motion.section>

      {/* Come funziona - 3 colonne */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-sage-900">Come funziona Libra?</h2>
            <p className="text-bark-500 mt-3 max-w-xl mx-auto">
              Un modo nuovo di leggere e pubblicare libri, ispirato ai migliori creator del web
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: 'Pubblicazione a blocchi',
                desc: 'Gli autori pubblicano i loro libri in blocchi settimanali, creando attesa come le serie TV. Ogni settimana nuovi contenuti da scoprire.',
              },
              {
                icon: TrendingUp,
                title: 'Algoritmo democratico',
                desc: 'I libri migliori salgono in tendenza grazie ai lettori, non alla pubblicità. Like, letture complete e commenti determinano il successo.',
              },
              {
                icon: Coins,
                title: 'Supporta gli autori',
                desc: 'Usa i token per sbloccare blocchi premium e supportare direttamente gli autori emergenti con donazioni e tips.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center p-8 rounded-2xl hover:bg-sage-50/50 transition-colors">
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

      {/* Per Autori */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sage-600 font-medium text-sm">Per gli autori</span>
              <h2 className="text-3xl font-bold text-sage-900 mt-2 mb-6">
                Pubblica il tuo libro e raggiungi migliaia di lettori
              </h2>
              <div className="space-y-4">
                {[
                  { icon: BookOpen, text: 'Carica il tuo PDF o DOCX e il sistema lo divide in blocchi automaticamente' },
                  { icon: Calendar, text: 'Scegli quando pubblicare ogni blocco con il calendario (max 2 a settimana)' },
                  { icon: Coins, text: 'Guadagna token dai lettori che sbloccano i tuoi contenuti' },
                  { icon: Users, text: 'Costruisci la tua community di lettori fedeli' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-sage-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-sage-600" />
                    </div>
                    <p className="text-bark-600 text-sm leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/diventa-autore"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors"
              >
                Diventa autore
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-sage-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-sage-50 rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Lettori totali</span>
                  <span className="text-2xl font-bold text-sage-600">12.4k</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-sage-50 rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Token guadagnati</span>
                  <span className="text-2xl font-bold text-sage-600">8.250</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-sage-50 rounded-xl">
                  <span className="text-sm font-medium text-sage-800">Tasso completamento</span>
                  <span className="text-2xl font-bold text-sage-600">87%</span>
                </div>
                <p className="text-xs text-bark-400 text-center pt-2">Esempio di dashboard autore</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Piani */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-sage-900 mb-4">Scegli il tuo piano VIP</h2>
          <p className="text-bark-500 mb-12 max-w-xl mx-auto">
            Inizia gratis e sblocca più contenuti con i piani premium
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Esploratore',
                price: 'Gratis',
                period: '',
                features: ['10 token di benvenuto', 'Accesso ai contenuti gratuiti', 'Primo blocco sempre gratis', 'Commenti e like illimitati', 'Salvataggio libri preferiti'],
                cta: 'Inizia gratis',
                highlighted: false,
              },
              {
                name: 'Silver',
                price: '€4,99',
                period: '/mese',
                features: ['50 token bonus al mese', 'Sconto 20% su tutti i blocchi', 'Contenuti Silver esclusivi', 'Badge Silver sul profilo', 'Accesso anticipato alle novità'],
                cta: 'Scegli Silver',
                highlighted: true,
              },
              {
                name: 'Gold',
                price: '€9,99',
                period: '/mese',
                features: ['120 token bonus al mese', 'Sconto 40% su tutti i blocchi', 'Accesso a tutto il catalogo', 'Badge Gold + priorità commenti', 'Supporto prioritario'],
                cta: 'Scegli Gold',
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-sage-500 text-white ring-4 ring-sage-200 scale-105'
                    : 'bg-cream-50 border border-sage-100'
                }`}
              >
                <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-sage-800'}`}>
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className={`text-2xl font-bold ${plan.highlighted ? 'text-sage-100' : 'text-sage-600'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlighted ? 'text-sage-200' : 'text-bark-400'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlighted ? 'text-sage-100' : 'text-bark-500'}`}>
                      <Shield className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-sage-200' : 'text-sage-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block w-full py-2.5 rounded-xl font-medium text-center transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-sage-700 hover:bg-sage-50'
                      : 'bg-sage-500 text-white hover:bg-sage-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sage-900 text-sage-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-sage-400" />
              <span className="text-lg font-bold text-white">Libra</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/come-funziona" className="hover:text-white transition-colors">Come funziona</Link>
              <Link href="/piani" className="hover:text-white transition-colors">Piani</Link>
              <Link href="/browse" className="hover:text-white transition-colors">Sfoglia</Link>
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
