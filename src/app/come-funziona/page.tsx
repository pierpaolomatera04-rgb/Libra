'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

export default function ComeFunzionaPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar minimale (coerente con la home) */}
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Libra" className="h-10 sm:h-11" />
          </Link>
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

      {/* INTRO */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-sage-900 leading-tight">
          Libra &egrave; diverso da tutto quello che hai provato.
        </h1>
        <p className="text-lg text-bark-500 mt-6 leading-relaxed">
          Non &egrave; Kindle. Non &egrave; Wattpad. Non &egrave; un social network.
          <br className="hidden sm:block" />
          &Egrave; la prima piattaforma italiana di storytelling seriale con community integrata.
        </p>
        <p className="text-base text-sage-700 font-semibold mt-6">Funziona cos&igrave;:</p>
      </section>

      {/* SEZIONE 1 — Lettura a blocchi */}
      <section className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-6">
            <span aria-hidden>📖</span> Leggi come guardi una serie.
          </h2>
          <div className="space-y-4 text-bark-600 leading-relaxed">
            <p>Ogni storia su Libra esce a blocchi — come gli episodi di una serie TV.</p>
            <p>Gli autori pubblicano fino a 3 blocchi a settimana, per un massimo di 3 mesi.</p>
            <p>
              Ogni blocco dura dai 5 ai 15 minuti di lettura. Abbastanza per immergersi, poco
              abbastanza da non sentirti mai sopraffatto.
            </p>
            <p>
              Nessun libro da 400 pagine che ti fissa dal comodino. Solo il prossimo blocco che non
              vedi l&rsquo;ora di leggere.
            </p>
          </div>
        </div>
      </section>

      {/* SEZIONE 2 — I piani */}
      <section className="bg-cream-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-10 text-center">
            <span aria-hidden>💳</span> Scegli come leggere.
          </h2>

          {/* FREE */}
          <div className="bg-white rounded-2xl border border-sage-200 p-6 sm:p-8 mb-5">
            <div className="flex items-baseline gap-2 mb-3">
              <h3 className="text-xl font-bold text-sage-800">FREE</h3>
              <span className="text-bark-400">— 0€</span>
            </div>
            <div className="space-y-2 text-bark-600 leading-relaxed">
              <p>Il primo blocco di ogni storia &egrave; sempre gratis. Sempre.</p>
              <p>
                Scopri nuovi autori, trova le storie che ti appassionano, poi decidi se continuare.
              </p>
              <p>Con la registrazione ricevi 10 token omaggio per iniziare subito.</p>
            </div>
          </div>

          {/* SILVER */}
          <div className="bg-white rounded-2xl border border-sage-200 p-6 sm:p-8 mb-5">
            <div className="flex items-baseline gap-2 mb-4 flex-wrap">
              <h3 className="text-xl font-bold text-sage-800">SILVER</h3>
              <span className="text-bark-400">— 4,99€/mese</span>
              <span className="text-xs text-sage-600 font-medium">(o 47,99€/anno — 2 mesi gratis)</span>
            </div>
            <ul className="space-y-2.5 text-bark-600">
              {[
                '3 libri completi al mese dal catalogo standard',
                'Leggi ogni nuovo blocco 24 ore prima degli utenti free',
                'Sconto del 15% su tutti gli sblocchi con token',
                '10 token omaggio ogni mese',
                'Bonus 40 token al primo accesso con piano annuale',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* GOLD */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border-2 border-amber-300 ring-4 ring-amber-100/60 p-6 sm:p-8 mb-5">
            <div className="flex items-baseline gap-2 mb-4 flex-wrap">
              <h3 className="text-xl font-bold text-amber-900">GOLD</h3>
              <span className="text-amber-700">— 9,99€/mese</span>
              <span className="text-xs text-amber-700 font-medium">(o 95,99€/anno — 2 mesi gratis)</span>
            </div>
            <ul className="space-y-2.5 text-amber-900">
              {[
                'Catalogo completo, senza limiti',
                'Leggi ogni nuovo blocco 48 ore prima di tutti',
                'Sconto del 30% su tutti gli sblocchi con token',
                '20 token omaggio ogni mese',
                'Bonus 80 token al primo accesso con piano annuale',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-sage-100/60 border border-sage-200 px-4 py-3 text-sm text-sage-800">
            <span className="mr-1" aria-hidden>📌</span>
            I libri acquistati con token rimangono in libreria per sempre — anche se cancelli
            l&rsquo;abbonamento.
          </div>
        </div>
      </section>

      {/* SEZIONE 3 — I token */}
      <section className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-6">
            <span aria-hidden>🪙</span> I token: la tua libreria per sempre.
          </h2>
          <div className="space-y-4 text-bark-600 leading-relaxed mb-8">
            <p>
              I token sono la valuta di Libra. Puoi usarli per sbloccare qualsiasi blocco o libro
              fuori dal tuo piano.
            </p>
            <p>
              La differenza con un abbonamento? I libri che sblocchi con i token rimangono tuoi per
              sempre — anche se cancelli l&rsquo;abbonamento.
            </p>
            <p>
              Gli abbonati Silver e Gold ricevono uno sconto automatico su ogni acquisto con token.
              Pi&ugrave; alto &egrave; il piano, pi&ugrave; risparmi.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: 'Starter', price: '4,99€', tokens: '50 token', extra: null },
              { name: 'Medium', price: '9,99€', tokens: '110 token', extra: '+10%' },
              { name: 'Large', price: '19,99€', tokens: '230 token', extra: '+15%' },
              { name: 'XL', price: '39,99€', tokens: '500 token', extra: '+25%' },
            ].map((p) => (
              <div key={p.name} className="rounded-xl border border-sage-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sage-800">{p.name}</p>
                  <p className="text-sm text-bark-500">{p.price}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sage-700">{p.tokens}</p>
                  {p.extra && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full mt-0.5">
                      {p.extra}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEZIONE 4 — La community */}
      <section className="bg-cream-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-4">
            <span aria-hidden>👥</span> Non leggi da solo.
          </h2>
          <p className="text-bark-600 leading-relaxed mb-8">
            Su Libra la lettura &egrave; un&rsquo;esperienza condivisa.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Commenta i blocchi mentre li leggi — ogni capitolo ha la sua sezione commenti',
              'Salva le frasi che ti colpiscono e condividile con la community',
              'Scala le classifiche — più leggi, più commenti, più sali di livello',
              'Guadagna XP per ogni azione e raggiungi i rank: Bronzo → Argento → Oro → Diamante — con premi reali in token',
            ].map((point) => (
              <div key={point} className="rounded-xl bg-white border border-sage-200 p-4 flex items-start gap-2.5">
                <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-bark-600 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEZIONE 5 — Diventa autore */}
      <section id="diventa-autore" className="bg-white py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-4">
            <span aria-hidden>✍️</span> Diventa autore.
          </h2>
          <p className="text-bark-600 leading-relaxed mb-8">
            Chiunque pu&ograve; pubblicare su Libra. Nessun editore. Nessuna approvazione.
          </p>

          <h3 className="text-base font-bold text-sage-800 mb-3">Come funziona:</h3>
          <ul className="space-y-2.5 mb-8 text-bark-600">
            {[
              'Pubblica la tua storia a blocchi — fino a 3 blocchi a settimana per 3 mesi',
              'Scegli se renderla free, disponibile agli abbonati Silver o riservata ai Gold',
              'Cambia strategia nel tempo — come le finestre di distribuzione al cinema',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-base font-bold text-sage-800 mb-3">Come guadagni:</h3>
          <ul className="space-y-2.5 mb-8 text-bark-600">
            {[
              '70% di ogni token speso per sbloccare i tuoi contenuti',
              'Quota mensile dal pool abbonamenti, proporzionale alle pagine lette',
              '90% delle mance inviate direttamente dai tuoi lettori',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <p className="text-bark-600 leading-relaxed mb-8">
            I lettori possono seguirti, supportarti, leggere in anteprima. Il tuo pubblico cresce
            con te.
          </p>

          <Link
            href="/signup?author=1"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl font-semibold hover:bg-sage-600 transition-colors"
          >
            Inizia a pubblicare
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA FINALE */}
      <section className="py-16 bg-cream-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-sage-500 to-sage-600 text-white p-8 sm:p-12 text-center shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronti a leggere diversamente?</h2>
            <p className="text-sage-100 text-lg mb-2">Unisciti ai primi lettori di Libra.</p>
            <p className="text-sage-200 text-sm mb-8">
              Il primo blocco &egrave; sempre gratis — nessuna carta di credito richiesta.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-sage-700 rounded-xl font-semibold hover:bg-sage-50 transition-colors text-lg"
            >
              Registrati gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-sage-900 text-sage-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src="/logo.png" alt="Libra" className="h-10 invert brightness-90" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/come-funziona" className="hover:text-white transition-colors">Come funziona</Link>
              <Link href="/come-funziona#diventa-autore" className="hover:text-white transition-colors">Diventa Autore</Link>
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
    </div>
  )
}
