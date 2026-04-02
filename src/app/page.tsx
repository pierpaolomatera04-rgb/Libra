'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BookOpen, Sparkles, Coins, ArrowRight, Shield, PenTool, BookMarked, Lock, Star } from 'lucide-react'

export default function HomePage() {
  const [books, setBooks] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchBooks = async () => {
      const { data } = await supabase
        .from('books')
        .select('id, title, cover_image_url, author:profiles!books_author_id_fkey(author_pseudonym, name)')
        .in('status', ['published', 'ongoing', 'completed'])
        .order('trending_score', { ascending: false })
        .limit(6)
      setBooks(data || [])
    }
    fetchBooks()
  }, [])

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar minimale */}
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <img src="/logo.png" alt="Libra" className="h-9" />
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

      {/* SEZIONE 1 — Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sage-100 rounded-full text-sage-700 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          La prima piattaforma italiana per storie a blocchi
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-sage-900 leading-tight max-w-4xl mx-auto">
          Leggi storie un blocco alla volta
        </h1>

        <p className="text-lg text-bark-500 mt-6 max-w-2xl mx-auto leading-relaxed">
          Gli autori pubblicano i loro libri in blocchi settimanali. Tu li scopri, li segui e supporti chi merita.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors flex items-center gap-2 text-lg"
          >
            <BookOpen className="w-5 h-5" />
            Registrati gratis
          </Link>
          <Link
            href="/come-funziona"
            className="px-8 py-3.5 border-2 border-sage-300 text-sage-700 rounded-xl font-medium hover:bg-sage-50 transition-colors flex items-center gap-2 text-lg"
          >
            Come funziona
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* SEZIONE 2 — Come funziona (sintesi) */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-sage-900">Come funziona?</h2>
            <p className="text-bark-500 mt-3 max-w-xl mx-auto">
              Tre passi per iniziare a leggere su Libra
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {[
              {
                icon: <BookOpen className="w-7 h-7 text-sage-600" />,
                step: '1',
                title: 'Scegli un libro',
                desc: 'Sfoglia il catalogo e trova la storia che fa per te tra decine di generi diversi.',
              },
              {
                icon: <Sparkles className="w-7 h-7 text-sage-600" />,
                step: '2',
                title: 'Il primo blocco è gratis',
                desc: 'Ogni libro ha il primo blocco gratuito. Inizia a leggere senza impegno.',
              },
              {
                icon: <Coins className="w-7 h-7 text-sage-600" />,
                step: '3',
                title: 'Abbonati per di più',
                desc: 'Con Silver o Gold leggi in anteprima, senza limiti e con sconti sui token.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="relative text-center bg-cream-50/80 border border-sage-200/60 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Numero step */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-sage-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                  {item.step}
                </div>
                {/* Icona in cerchio */}
                <div className="w-16 h-16 mx-auto mb-5 bg-sage-100 rounded-full flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-sage-800 mb-3">{item.title}</h3>
                <p className="text-bark-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/come-funziona"
              className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-sage-500 text-sage-600 font-medium rounded-xl hover:bg-sage-50 transition-colors"
            >
              Scopri di più
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEZIONE 3 — Anteprima catalogo */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-sage-900 mb-4">Esplora il catalogo</h2>
          <p className="text-bark-500 mb-12">Registrati per iniziare a leggere</p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 max-w-3xl mx-auto mb-10">
            {books.length > 0 ? books.map((book) => (
              <div key={book.id} className="relative group">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full aspect-[3/4] rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center shadow-md">
                    <BookOpen className="w-8 h-8 text-sage-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-sage-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              </div>
            )) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full aspect-[3/4] rounded-xl bg-sage-100 animate-pulse" />
              ))
            )}
          </div>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors text-lg"
          >
            <BookMarked className="w-5 h-5" />
            Scopri il catalogo
          </Link>
        </div>
      </section>

      {/* SEZIONE 4 — Piani */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-sage-900 mb-4">Scegli il tuo piano</h2>
          <p className="text-bark-500 mb-12 max-w-xl mx-auto">
            Inizia gratis e sblocca più contenuti con i piani premium
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Free',
                price: 'Gratis',
                period: '',
                features: ['10 token di benvenuto', 'Primo blocco sempre gratis', 'Commenti e like illimitati'],
                cta: 'Inizia gratis',
                highlighted: false,
              },
              {
                name: 'Silver',
                price: '€4,99',
                period: '/mese',
                features: ['10 token al mese', 'Sconto 15% su tutti i blocchi', 'Contenuti Silver in anteprima'],
                cta: 'Scegli Silver',
                highlighted: true,
              },
              {
                name: 'Gold',
                price: '€9,99',
                period: '/mese',
                features: ['20 token al mese', 'Sconto 30% su tutti i blocchi', 'Accesso a tutto il catalogo'],
                cta: 'Scegli Gold',
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-sage-500 text-white ring-4 ring-sage-200 scale-105'
                    : 'bg-white border border-sage-100'
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

      {/* SEZIONE 5 — Diventa autore */}
      <section className="py-24 bg-sage-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <PenTool className="w-12 h-12 text-sage-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Sei uno scrittore?</h2>
          <p className="text-sage-200 text-lg mb-8 leading-relaxed">
            Pubblica su Libra e guadagna per ogni pagina letta. Carica il tuo libro, scegli il prezzo
            e raggiungi migliaia di lettori.
          </p>
          <Link
            href="/diventa-autore"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-sage-800 rounded-xl font-medium hover:bg-sage-50 transition-colors text-lg"
          >
            <Star className="w-5 h-5" />
            Diventa autore
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-sage-900 text-sage-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src="/logo.png" alt="Libra" className="h-8 brightness-200 contrast-75" />
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/come-funziona" className="hover:text-white transition-colors">Come funziona</Link>
              <Link href="/diventa-autore" className="hover:text-white transition-colors">Diventa Autore</Link>
              <Link href="/termini" className="hover:text-white transition-colors">Termini di servizio</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/contatti" className="hover:text-white transition-colors">Contatti</Link>
            </div>
            <div className="text-center">
              <p className="text-xs text-sage-400">Libra &mdash; fatto col ❤️ in Italia</p>
              <p className="text-xs text-sage-500 mt-1">&copy; 2025 Libra. Tutti i diritti riservati.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
