import Link from 'next/link'
import { BookOpen, Shield, Coins, PenTool, ArrowRight, Layers, Clock, Star, Zap, Gift, Lock } from 'lucide-react'

export default function ComeFunzionaPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar minimale */}
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Libra" className="h-10 sm:h-11" />
          </Link>
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
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-sage-900 mb-4">Come funziona Libra</h1>
        <p className="text-lg text-bark-500 max-w-2xl mx-auto">
          Tutto quello che devi sapere sulla piattaforma di lettura a blocchi
        </p>
      </section>

      {/* Cos&apos;è Libra */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-white rounded-2xl border border-sage-100 p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-sage-600" />
            </div>
            <h2 className="text-2xl font-bold text-sage-900">Cos&apos;&egrave; Libra?</h2>
          </div>
          <div className="space-y-4 text-bark-600 leading-relaxed">
            <p>
              Libra &egrave; una piattaforma di lettura innovativa dove i libri vengono pubblicati <strong>a blocchi</strong>,
              come episodi di una serie. Ogni settimana escono nuovi blocchi delle storie che segui.
            </p>
            <p>
              Gli autori caricano i loro libri divisi in blocchi da almeno 15 minuti di lettura ciascuno.
              Ogni libro pu&ograve; avere fino a 36 blocchi, pubblicati con un calendario settimanale (max 3 a settimana, entro 3 mesi).
            </p>
            <p>
              Il primo blocco di ogni libro &egrave; <strong>sempre gratuito</strong>: puoi iniziare a leggere
              senza impegno e decidere dopo se continuare.
            </p>
          </div>
        </div>
      </section>

      {/* Come funziona - Step */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-2xl font-bold text-sage-900 mb-8 text-center">La lettura a blocchi in 4 step</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              step: '1',
              icon: Layers,
              title: 'Sfoglia il catalogo',
              desc: 'Cerca tra i libri disponibili per genere, popolarit&agrave; o novit&agrave;. Filtra per serializzazioni in corso.',
            },
            {
              step: '2',
              icon: Gift,
              title: 'Leggi il primo blocco gratis',
              desc: 'Ogni libro ha il primo blocco gratuito. Inizia a leggere e scopri se la storia ti appassiona.',
            },
            {
              step: '3',
              icon: Coins,
              title: 'Sblocca con i token',
              desc: 'Usa i token per sbloccare i blocchi successivi. Con un piano Silver o Gold hai sconti e token mensili.',
            },
            {
              step: '4',
              icon: Clock,
              title: 'Segui le uscite',
              desc: 'I nuovi blocchi escono secondo il calendario dell\'autore. Ricevi le notifiche e continua la lettura.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl border border-sage-100 p-6 flex gap-4">
              <div className="w-10 h-10 bg-sage-500 text-white rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-sage-800 mb-2">{item.title}</h3>
                <p className="text-sm text-bark-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Piani */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-sage-600" />
              <h2 className="text-2xl font-bold text-sage-900">I piani</h2>
            </div>
            <p className="text-bark-500">Tre livelli per ogni tipo di lettore</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="rounded-2xl border border-sage-100 p-6">
              <h3 className="text-lg font-bold text-sage-800 mb-1">Free</h3>
              <p className="text-2xl font-bold text-sage-600 mb-4">Gratis</p>
              <ul className="space-y-2.5 text-sm text-bark-500">
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />10 Welcome Token alla registrazione</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Primo blocco di ogni libro gratuito</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Accesso ai libri Free</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Commenti e like illimitati</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Acquisto token singoli</li>
              </ul>
            </div>

            {/* Silver */}
            <div className="rounded-2xl bg-sage-500 text-white p-6 ring-4 ring-sage-200 scale-105">
              <h3 className="text-lg font-bold mb-1">Silver</h3>
              <p className="text-2xl font-bold text-sage-100 mb-1">&euro;4,99<span className="text-sm font-normal text-sage-200">/mese</span></p>
              <p className="text-xs text-sage-200 mb-4">o &euro;49,99/anno (2 mesi gratis + 40 token bonus)</p>
              <ul className="space-y-2.5 text-sm text-sage-100">
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-200 mt-0.5 flex-shrink-0" />10 token al mese (scadono dopo 30gg)</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-200 mt-0.5 flex-shrink-0" />Sconto 15% su tutti i blocchi</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-200 mt-0.5 flex-shrink-0" />Accesso ai contenuti Silver</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-200 mt-0.5 flex-shrink-0" />Anteprima blocchi 24h prima</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-200 mt-0.5 flex-shrink-0" />Fino a 3 serializzazioni attive</li>
              </ul>
            </div>

            {/* Gold */}
            <div className="rounded-2xl border border-sage-100 p-6">
              <h3 className="text-lg font-bold text-sage-800 mb-1">Gold</h3>
              <p className="text-2xl font-bold text-sage-600 mb-1">&euro;9,99<span className="text-sm font-normal text-bark-400">/mese</span></p>
              <p className="text-xs text-bark-400 mb-4">o &euro;99,99/anno (2 mesi gratis + 80 token bonus)</p>
              <ul className="space-y-2.5 text-sm text-bark-500">
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />20 token al mese (scadono dopo 30gg)</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Sconto 30% su tutti i blocchi</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Accesso a tutto il catalogo (Silver + Gold)</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Anteprima blocchi 48h prima</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-sage-400 mt-0.5 flex-shrink-0" />Serializzazioni illimitate</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Token */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-white rounded-2xl border border-sage-100 p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-sage-900">Il sistema Token</h2>
          </div>
          <div className="space-y-4 text-bark-600 leading-relaxed">
            <p>
              I <strong>token</strong> sono la valuta di Libra. Tasso fisso: <strong>10 token = &euro;1,00</strong>.
              Esistono due tipologie di token, con regole di utilizzo diverse.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {/* TOKEN PREMIUM */}
              <div className="bg-sage-50 rounded-xl p-4 border border-sage-200">
                <h4 className="font-semibold text-sage-800 mb-2 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-sage-600" />
                  Token Premium
                </h4>
                <p className="text-xs text-bark-500 mb-2">
                  Ottenuti acquistando un pacchetto dal Wallet con pagamento reale. <strong>Non scadono mai</strong>.
                </p>
                <ul className="text-sm space-y-1.5">
                  <li>&bull; Sblocco blocchi singoli</li>
                  <li>&bull; Acquisto libro intero</li>
                  <li>&bull; <strong>Mance agli autori</strong> (consentite)</li>
                  <li>&bull; Generano guadagno reale per l&apos;autore</li>
                </ul>
              </div>

              {/* TOKEN BONUS */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h4 className="font-semibold text-sage-800 mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-600" />
                  Token Bonus
                </h4>
                <p className="text-xs text-bark-500 mb-2">
                  Ricevuti gratis dai piani VIP (Silver/Gold) o come Welcome Token. <strong>Scadono dopo 30 giorni</strong>.
                </p>
                <ul className="text-sm space-y-1.5">
                  <li>&bull; Sblocco blocchi premium</li>
                  <li>&bull; Boost / interazioni social</li>
                  <li>&bull; <strong>Non utilizzabili per mance</strong></li>
                  <li>&bull; <strong>Non utilizzabili per acquisto libro intero</strong></li>
                </ul>
              </div>
            </div>

            <div className="bg-sage-100 dark:bg-sage-900/20 border border-sage-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-sage-800">
                <strong>Visibilita&apos; e guadagno autore.</strong> Quando sblocchi un blocco con
                <strong> Token Bonus</strong>, dai visibilita&apos; all&apos;autore (lettura, statistiche,
                presenza in classifica) ma <em>non</em> generi un compenso diretto. Per far guadagnare
                davvero un autore servono soldi reali: pacchetti acquistati, abbonamenti VIP (pool
                redistribuito agli autori) o mance pagate con Token Premium.
              </p>
            </div>

            <p className="text-sm text-bark-400 mt-4">
              Ordine di spesa automatico: <strong>Token Bonus prima</strong> (per evitarne la scadenza),
              poi Token Premium. I Welcome Token non possono essere usati per mance ne&apos; per acquisti totali.
            </p>
          </div>
        </div>
      </section>

      {/* Diventare autore */}
      <section className="bg-sage-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <PenTool className="w-10 h-10 text-sage-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Diventa autore su Libra</h2>
            <p className="text-sage-200 max-w-2xl mx-auto">
              Pubblica i tuoi libri a blocchi e guadagna per ogni pagina letta
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: Layers,
                title: 'Pubblica a blocchi',
                desc: 'Carica il tuo libro e dividilo in blocchi (max 36). Scegli il calendario di pubblicazione.',
              },
              {
                icon: Coins,
                title: 'Guadagna',
                desc: 'Ricevi il 70% di ogni sblocco con token e il 90% delle mance. Payout mensile.',
              },
              {
                icon: Star,
                title: 'Cresci',
                desc: 'I lettori ti scoprono tramite il catalogo. Più letture = più visibilità nel trending.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-sage-700/50 rounded-xl p-6 text-center">
                <item.icon className="w-8 h-8 text-sage-300 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-sage-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-sage-800 rounded-xl text-sm font-medium hover:bg-sage-50 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              Diventa autore
            </Link>
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-20 bg-cream-50 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-sage-900 mb-4">Pronto a iniziare?</h2>
          <p className="text-bark-500 mb-8">Registrati gratis e scopri la lettura a blocchi</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors text-lg"
          >
            Registrati gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sage-900 text-sage-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Libra" className="h-10 invert brightness-90" />
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/come-funziona" className="hover:text-white transition-colors">Come funziona</Link>
              <Link href="/diventa-autore" className="hover:text-white transition-colors">Diventa Autore</Link>
              <Link href="/termini" className="hover:text-white transition-colors">Termini di servizio</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/contatti" className="hover:text-white transition-colors">Contatti</Link>
            </div>
            <div className="text-xs text-sage-500 text-center md:text-right">
              <p>Libra — fatto col ❤️ in Italia</p>
              <p>&copy; 2025 Libra. Tutti i diritti riservati.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
