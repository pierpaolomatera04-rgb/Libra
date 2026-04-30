'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BookOpen, Users, Star, ArrowRight, Check, Crown } from 'lucide-react'

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
            <img src="/logo.png" alt="Libra" className="h-10 sm:h-11" />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-sage-700 hover:text-sage-800">
              Accedi
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors">
              Inizia gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* SEZIONE 1 — Hero (sfondo scuro uniforme, coerente con /diventa-autore) */}
      <section className="bg-sage-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-xs font-semibold mb-8 border border-white/30 bg-transparent">
            <span aria-hidden>🤍</span> Fatto con il cuore in Italia
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto">
            Leggi come guardi{' '}
            <span style={{ color: '#C8A951' }}>una serie.</span>
          </h1>

          <p className="text-lg text-white/85 mt-6 max-w-2xl mx-auto leading-relaxed">
            Storie a blocchi, community reale, autori che puoi supportare direttamente.
            <br className="hidden sm:block" />
            Nessun libro infinito. Solo il prossimo blocco che non vedi l&rsquo;ora di leggere.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-white text-sage-700 rounded-xl font-semibold hover:bg-cream-50 transition-colors flex items-center gap-2 text-lg shadow-lg"
            >
              <BookOpen className="w-5 h-5" />
              Inizia gratis
            </Link>
            <Link
              href="/come-funziona"
              className="px-8 py-3.5 border-2 border-white/40 text-white rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-lg"
            >
              Come funziona
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEZIONE 2 — Come funziona (sintesi) */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-sage-900">
              Non &egrave; un libro. Non &egrave; un social. &Egrave; qualcosa di nuovo.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {[
              {
                emoji: '📖',
                title: 'Un blocco alla volta',
                desc: 'Ogni storia esce a blocchi, come gli episodi di una serie. Da 5 a 15 minuti di lettura — decidi tu quando leggere.',
              },
              {
                emoji: '👥',
                title: 'Una community che legge con te',
                desc: 'Commenta, salva le frasi che ti colpiscono, scala le classifiche. Qui non leggi da solo.',
              },
              {
                emoji: '⭐',
                title: 'Supporta chi scrive',
                desc: 'Segui i tuoi autori preferiti, mandagli una mancia, leggi in anteprima. Il loro successo dipende da te.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="relative text-center bg-cream-50/80 border border-sage-200/60 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-16 h-16 mx-auto mb-5 bg-sage-100 rounded-full flex items-center justify-center text-3xl">
                  <span aria-hidden>{item.emoji}</span>
                </div>
                <h3 className="text-lg font-semibold text-sage-800 mb-3">{item.title}</h3>
                <p className="text-bark-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/come-funziona"
              className="inline-flex items-center gap-2 text-sage-600 font-semibold hover:text-sage-700"
            >
              Scopri di pi&ugrave;
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEZIONE 3 — I piani */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-sage-900 mb-12">
            Inizia gratis. Rimani perch&eacute; ne vale la pena.
          </h2>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* FREE */}
            <div className="rounded-2xl p-8 bg-white border border-sage-200 text-left flex flex-col">
              <h3 className="text-xl font-bold text-sage-800 mb-2">FREE</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-sage-700">0€</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-bark-600 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>Il primo blocco di ogni storia &egrave; sempre gratis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>Scopri nuovi autori senza rischiare nulla.</span>
                </li>
              </ul>
            </div>

            {/* SILVER */}
            <div className="rounded-2xl p-8 bg-white border border-sage-200 text-left flex flex-col">
              <h3 className="text-xl font-bold text-sage-800 mb-2">SILVER</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-sage-700">4,99€</span>
                <span className="text-sm text-bark-400">/mese</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-bark-600 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>3 libri al mese dal catalogo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>Leggi 24h prima di tutti gli altri.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>Sconto del 15% su ogni sblocco.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>10 token omaggio ogni mese.</span>
                </li>
              </ul>
            </div>

            {/* GOLD — leggermente in evidenza */}
            <div className="rounded-2xl p-8 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 ring-4 ring-amber-100/60 text-left flex flex-col shadow-lg sm:scale-[1.03]">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-amber-900">GOLD</h3>
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  Consigliato
                </span>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-amber-900">9,99€</span>
                <span className="text-sm text-amber-700">/mese</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-amber-900 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Catalogo completo, senza limiti.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Leggi 48h prima di tutti.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Sconto del 30% su ogni sblocco.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>20 token omaggio ogni mese.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors text-lg"
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </section>

      {/* SEZIONE 4 — Anteprima catalogo */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-sage-900 mb-3">
            Storie che non trovi da nessun&rsquo;altra parte.
          </h2>
          <p className="text-bark-500 mb-12">Registrati per iniziare a leggere.</p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 max-w-3xl mx-auto mb-10">
            {books.length > 0 ? books.map((book) => (
              <div key={book.id} className="relative group">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full aspect-[3/4] rounded-xl object-cover shadow-md filter blur-[1.5px] group-hover:blur-0 transition-all"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center shadow-md">
                    <BookOpen className="w-8 h-8 text-sage-500" />
                  </div>
                )}
                {/* Overlay semitrasparente */}
                <div className="absolute inset-0 bg-sage-900/15 rounded-xl pointer-events-none" />
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
            Scopri il catalogo
          </Link>
        </div>
      </section>

      {/* SEZIONE 5 — Diventa autore */}
      <section className="py-24 bg-sage-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Hai una storia da raccontare?
          </h2>
          <p className="text-sage-200 text-lg mb-8 leading-relaxed">
            Pubblica su Libra. Costruisci il tuo pubblico. Guadagna per ogni pagina letta.
            <br className="hidden sm:block" />
            Non aspettare un editore — il tuo pubblico &egrave; gi&agrave; qui.
          </p>
          <Link
            href="/signup?author=1"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-sage-300 text-white rounded-xl font-medium hover:bg-sage-700 transition-colors"
          >
            Inizia a pubblicare
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  )
}

function SiteFooter() {
  return (
    <footer className="bg-sage-900 text-sage-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <img src="/logo.png" alt="Libra" className="h-10 invert brightness-90" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/come-funziona" className="hover:text-white transition-colors">Come funziona</Link>
            <Link href="/diventa-autore" className="hover:text-white transition-colors">Diventa Autore</Link>
            <Link href="/termini" className="hover:text-white transition-colors">Termini di servizio</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/contatti" className="hover:text-white transition-colors">Contatti</Link>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-sage-500">&copy; 2025 Libra — Tutti i diritti riservati</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
