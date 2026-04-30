'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  BookOpen, ArrowRight, Check, Crown,
  ShoppingCart, BookMarked, Heart, MessageCircle, Trophy, Zap, ChevronRight, PenTool,
} from 'lucide-react'

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-14 sm:pb-14 text-center">
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
      <section className="bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-sage-900">
              Non &egrave; un libro. Non &egrave; un social. &Egrave; qualcosa di nuovo.
            </h2>
          </div>

          {/* items-stretch (default su grid) garantisce card di stessa altezza;
              ogni card è flex-col con titolo a min-height fisso → testi
              allineati orizzontalmente sulle 3 card su desktop */}
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
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
                className="h-full flex flex-col text-center bg-cream-50/80 border border-sage-200/60 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-16 h-16 mx-auto mb-5 bg-sage-100 rounded-full flex items-center justify-center text-3xl">
                  <span aria-hidden>{item.emoji}</span>
                </div>
                {/* Titolo a min-height fisso così il paragrafo descrittivo
                    parte dalla stessa Y su tutte le card affiancate */}
                <h3 className="text-lg font-semibold text-sage-800 mb-3 leading-snug md:min-h-[3.5rem] flex items-center justify-center">
                  {item.title}
                </h3>
                <p className="text-bark-500 text-sm leading-relaxed flex-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEZIONE 3 — I token */}
      <section className="py-10 sm:py-14 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-sage-600 uppercase tracking-widest mb-3">🪙 I token</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-sage-900">La tua libreria. Per sempre.</h2>
            <p className="text-base sm:text-lg text-bark-500 mt-4 max-w-2xl mx-auto leading-relaxed">
              I token sono la valuta di Libra. Sblocchi qualsiasi blocco o libro fuori dal tuo
              piano — e quello che sblocchi resta tuo, anche se cancelli l&rsquo;abbonamento.
            </p>
          </div>

          {/* Flusso a 3 step */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-12">
            {[
              { icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100', title: 'Acquisti i token', desc: 'Scegli il pacchetto. Più grande, più risparmi.' },
              { icon: BookMarked, color: 'text-blue-600', bg: 'bg-blue-100', title: 'Sblocchi un libro', desc: 'Usi i token per qualsiasi blocco o libro.' },
              { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100', title: 'Resta tuo per sempre', desc: 'Senza scadenze. Anche dopo l’abbonamento.' },
            ].map((step, i) => (
              <div key={i} className="relative bg-white border border-sage-200 rounded-2xl p-5 sm:p-6 text-center">
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ChevronRight className="w-6 h-6 text-sage-400" />
                  </div>
                )}
                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl ${step.bg} flex items-center justify-center`}>
                  <step.icon className={`w-7 h-7 ${step.color}`} />
                </div>
                <h3 className="text-base font-bold text-sage-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-bark-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Pacchetti disponibili */}
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold text-bark-400 uppercase tracking-widest text-center mb-4">Pacchetti disponibili</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: 'Starter', price: '4,99€', tokens: 50, extra: null },
                { name: 'Medium', price: '9,99€', tokens: 110, extra: '+10%' },
                { name: 'Large', price: '19,99€', tokens: 230, extra: '+15%' },
                { name: 'XL', price: '39,99€', tokens: 500, extra: '+25%' },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`rounded-xl border bg-white p-4 flex items-center justify-between transition-all hover:shadow-md ${
                    p.extra ? 'border-emerald-200' : 'border-sage-200'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sage-800">{p.name}</p>
                    <p className="text-sm text-bark-500">{p.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sage-700">{p.tokens} token</p>
                    {p.extra && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full mt-0.5">
                        {p.extra} bonus
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-bark-400 text-center mt-4">
              Silver e Gold ricevono uno sconto automatico su ogni acquisto.
            </p>
          </div>
        </div>
      </section>

      {/* SEZIONE 4 — La community */}
      <section className="py-10 sm:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-sage-600 uppercase tracking-widest mb-3">👥 Community</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-sage-900">Non leggi da solo.</h2>
            <p className="text-base sm:text-lg text-bark-500 mt-4 max-w-2xl mx-auto leading-relaxed">
              Su Libra la lettura &egrave; un&rsquo;esperienza condivisa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 max-w-4xl mx-auto">
            {[
              { icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-100', title: 'Commenti', desc: 'Ogni capitolo ha la sua sezione commenti. Reagisci mentre leggi.' },
              { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100', title: 'Classifiche', desc: 'Più leggi e commenti, più sali in classifica.' },
              { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100', title: 'XP e rank', desc: 'Bronzo → Argento → Oro → Diamante. Con premi reali in token.' },
              { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100', title: 'Mance agli autori', desc: 'Supporta direttamente chi scrive. Il 90% va all’autore.' },
            ].map((c, i) => (
              <div key={i} className="bg-cream-50/80 border border-sage-200 rounded-2xl p-4 sm:p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${c.bg} rounded-2xl flex items-center justify-center mb-3 sm:mb-4`}>
                  <c.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${c.color}`} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-sage-900 mb-1.5">{c.title}</h3>
                <p className="text-xs sm:text-sm text-bark-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEZIONE 5 — I piani */}
      <section className="py-10 sm:py-14 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-sage-900 mb-8 sm:mb-10">
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

      {/* SEZIONE 6 — Anteprima catalogo */}
      <section className="py-10 sm:py-14 bg-white">
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

      {/* SEZIONE 7 — Diventa autore (teaser compatto verso /diventa-autore) */}
      <section className="py-10 sm:py-14 bg-cream-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-sage-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sage-100 flex items-center justify-center flex-shrink-0">
              <PenTool className="w-5 h-5 text-sage-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-sage-900 mb-0.5">
                Hai una storia da raccontare?
              </h3>
              <p className="text-sm text-bark-500 leading-relaxed">
                Pubblica su Libra a blocchi e guadagna per ogni pagina letta.
              </p>
            </div>
            <Link
              href="/diventa-autore"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sage-500 text-white rounded-xl font-semibold hover:bg-sage-600 transition-colors whitespace-nowrap"
            >
              Inizia a pubblicare
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
