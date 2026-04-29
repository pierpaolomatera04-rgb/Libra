'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight, Check, Minus, X, ChevronDown,
  Coins, Users, BarChart3, Heart, PenTool, Sparkles, Layers, Settings2, Send,
} from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function DiventaAutorePage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Libra" className="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-sage-700 hover:text-sage-800">
              Accedi
            </Link>
            <Link href="/signup?author=1" className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors">
              Inizia gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — sfondo scuro aspirazionale */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sage-900 via-sage-800 to-bark-900">
        {/* Decorazioni */}
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
          <div className="absolute top-12 left-[10%] w-56 h-56 rounded-full bg-amber-300 blur-3xl" />
          <div className="absolute top-24 right-[10%] w-72 h-72 rounded-full bg-sage-400 blur-3xl" />
          <div className="absolute bottom-12 left-[40%] w-56 h-56 rounded-full bg-amber-200 blur-3xl" />
        </div>

        <motion.div
          className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-32 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-amber-200 text-xs font-semibold mb-8 border border-white/15"
          >
            <PenTool className="w-3.5 h-3.5" />
            Per autori
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1]"
          >
            Pubblica la tua storia.<br />
            Costruisci il tuo pubblico.<br />
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Guadagna per ogni pagina letta.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-white/80 mt-6 leading-relaxed max-w-2xl mx-auto"
          >
            Nessun editore. Nessuna approvazione. Solo tu, la tua storia e i tuoi lettori.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10">
            <Link
              href="/signup?author=1"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-sage-500 text-white rounded-xl font-bold hover:bg-sage-600 transition-colors text-base sm:text-lg shadow-xl"
            >
              <PenTool className="w-5 h-5" />
              Inizia a pubblicare gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-white/60 mt-3">Gratuito. Nessuna approvazione richiesta.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* SEZIONE 1 — Come si pubblica (4 step) */}
      <SectionWrap tone="white">
        <SectionHeader
          eyebrow="Il flusso"
          title="Come si pubblica."
          subtitle="Quattro step. Dal primo blocco al tuo pubblico."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12"
        >
          {[
            {
              n: 1,
              emoji: '📝',
              title: 'Scrivi a blocchi',
              desc: 'Da 3 a 15 minuti di lettura per blocco. Quanto basta per immergersi.',
            },
            {
              n: 2,
              emoji: '⚙️',
              title: 'Scegli tier e prezzo',
              desc: 'Free, Silver o Gold. Decidi tu il prezzo in token di ogni blocco.',
            },
            {
              n: 3,
              emoji: '🚀',
              title: 'Pubblica con costanza',
              desc: 'Fino a 3 blocchi a settimana, per un massimo di 3 mesi.',
            },
            {
              n: 4,
              emoji: '📈',
              title: 'Cresci e guadagna',
              desc: 'Il tuo pubblico cresce con te. Ogni pagina letta diventa guadagno.',
            },
          ].map((step) => (
            <motion.div
              key={step.n}
              variants={fadeUp}
              className="relative bg-white border border-sage-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute -top-3 -left-1 sm:-left-3 w-9 h-9 bg-sage-600 text-white text-base font-bold rounded-full flex items-center justify-center shadow-md">
                {step.n}
              </div>
              <div className="w-16 h-16 mb-4 bg-gradient-to-br from-sage-50 to-sage-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                <span aria-hidden>{step.emoji}</span>
              </div>
              <h3 className="text-base font-bold text-sage-900 mb-1.5">{step.title}</h3>
              <p className="text-sm text-bark-500 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 2 — Quanto guadagni (numeri grandi) */}
      <SectionWrap tone="cream">
        <SectionHeader
          eyebrow="💰 Guadagni"
          title="Tre flussi di entrate."
          subtitle="Sei pagato in token. Trasparenti, tracciabili, convertibili."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-5 mt-12 max-w-5xl mx-auto"
        >
          {[
            {
              big: '70%',
              icon: Coins,
              iconBg: 'bg-emerald-100',
              iconColor: 'text-emerald-600',
              title: 'Sblocchi diretti',
              desc: 'Di ogni token speso per sbloccare i tuoi contenuti finisce nel tuo portafoglio.',
            },
            {
              big: 'Pool',
              suffix: 'mensile',
              icon: BarChart3,
              iconBg: 'bg-purple-100',
              iconColor: 'text-purple-600',
              title: 'Quota abbonamenti',
              desc: 'Quota proporzionale alle pagine lette dagli abbonati Silver e Gold.',
            },
            {
              big: '90%',
              icon: Heart,
              iconBg: 'bg-rose-100',
              iconColor: 'text-rose-600',
              title: 'Mance dirette',
              desc: 'Delle mance inviate dai lettori che ti seguono va direttamente a te.',
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="bg-white border border-sage-200 rounded-2xl p-6 sm:p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 mx-auto mb-4 rounded-2xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <p className="text-5xl sm:text-6xl font-bold text-sage-700 leading-none">
                {stat.big}
                {stat.suffix && <span className="block text-base sm:text-lg text-sage-600 font-semibold mt-1">{stat.suffix}</span>}
              </p>
              <h3 className="text-base font-bold text-sage-900 mt-4 mb-1.5">{stat.title}</h3>
              <p className="text-sm text-bark-500 leading-relaxed">{stat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 3 — Cosa scegli tu (3 tier) */}
      <SectionWrap tone="white">
        <SectionHeader
          eyebrow="🎚️ Strategia"
          title="Cosa scegli tu."
          subtitle="Imposti il tier di ogni libro. Decidi chi pu&ograve; leggerti — e quando."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-5 mt-10 max-w-5xl mx-auto"
        >
          {[
            {
              name: 'Free',
              color: 'sage',
              who: 'Tutti possono leggere',
              advantage: 'Massima visibilità e crescita del pubblico',
              strategy: 'Ottimo per esordienti o per il primo libro di una serie',
            },
            {
              name: 'Silver+',
              color: 'slate',
              who: 'Abbonati Silver e Gold',
              advantage: 'Quota dal pool abbonamenti + sblocchi token',
              strategy: 'Bilanciato — buon equilibrio tra reach e ricavi',
            },
            {
              name: 'Gold only',
              color: 'amber',
              who: 'Solo abbonati Gold',
              advantage: 'Quota più alta dal pool, lettori più engaged',
              strategy: 'Per autori già affermati con pubblico fedele',
            },
          ].map((tier, i) => {
            const isAmber = tier.color === 'amber'
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`relative rounded-2xl p-6 flex flex-col border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  isAmber
                    ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300'
                    : tier.color === 'slate'
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-sage-50 border-sage-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isAmber ? 'bg-amber-200' : tier.color === 'slate' ? 'bg-slate-200' : 'bg-sage-200'
                  }`}>
                    {isAmber ? <Sparkles className="w-5 h-5 text-amber-700" /> :
                      tier.color === 'slate' ? <Layers className="w-5 h-5 text-slate-600" /> :
                        <Users className="w-5 h-5 text-sage-700" />}
                  </div>
                  <h3 className={`text-lg font-bold ${isAmber ? 'text-amber-900' : 'text-sage-900'}`}>
                    {tier.name}
                  </h3>
                </div>
                <dl className="space-y-3 text-sm flex-1">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-bark-400 mb-0.5">Chi pu&ograve; leggere</dt>
                    <dd className="text-sage-800 font-medium">{tier.who}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-bark-400 mb-0.5">Vantaggio</dt>
                    <dd className="text-sage-800">{tier.advantage}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-bark-400 mb-0.5">Strategia</dt>
                    <dd className="text-bark-600 italic">{tier.strategy}</dd>
                  </div>
                </dl>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-8 max-w-3xl mx-auto rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 text-sm text-sage-800 text-center flex items-center justify-center gap-2"
        >
          <Settings2 className="w-4 h-4 text-sage-600 flex-shrink-0" />
          <span>Puoi cambiare tier in qualsiasi momento — come le finestre di distribuzione al cinema.</span>
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 4 — Confronto Libra vs Wattpad vs Amazon KDP */}
      <SectionWrap tone="cream">
        <SectionHeader
          eyebrow="Perch&eacute; Libra"
          title="Confronta tu stesso."
          subtitle="Cosa offre Libra che non trovi altrove."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-10 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto"
        >
          <div className="min-w-[640px] max-w-4xl mx-auto bg-white rounded-2xl border border-sage-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-200">
                  <th className="text-left px-4 py-4 font-semibold text-bark-500 text-xs uppercase tracking-wider w-1/4">
                    {/* spazio vuoto */}
                  </th>
                  <th className="px-3 py-4 text-center w-1/4 bg-sage-50">
                    <div className="font-bold text-sage-700 text-base">Libra</div>
                  </th>
                  <th className="px-3 py-4 text-center w-1/4">
                    <div className="font-semibold text-bark-500 text-base">Wattpad</div>
                  </th>
                  <th className="px-3 py-4 text-center w-1/4">
                    <div className="font-semibold text-bark-500 text-base">Amazon KDP</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { row: 'Guadagno autore', libra: 'Fino al 70-90%', wp: 'Solo Paid Stories selezionati', kdp: '35-70%' },
                  { row: 'Community integrata', libra: 'check', wp: 'check', kdp: 'no' },
                  { row: 'Serializzazione nativa', libra: 'check', wp: 'check', kdp: 'no' },
                  { row: 'Controllo tier per libro', libra: 'check', wp: 'no', kdp: 'minus' },
                  { row: 'Mance dirette dai lettori', libra: 'check', wp: 'no', kdp: 'no' },
                  { row: 'Approvazione editoriale', libra: 'no', wp: 'no', kdp: 'minus' },
                ].map((r, i) => (
                  <tr key={i} className="border-b last:border-0 border-sage-100">
                    <td className="px-4 py-3.5 font-medium text-sage-800">{r.row}</td>
                    <td className="px-3 py-3.5 text-center bg-sage-50/60">
                      <CompareCell value={r.libra} highlight />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CompareCell value={r.wp} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CompareCell value={r.kdp} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-bark-400 text-center mt-3 sm:hidden">Scorri orizzontalmente per vedere tutta la tabella →</p>
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 5 — FAQ accordion */}
      <SectionWrap tone="white">
        <SectionHeader
          eyebrow="FAQ"
          title="Domande frequenti."
          subtitle="Tutto quello che gli autori ci chiedono prima di iniziare."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mt-10 max-w-3xl mx-auto space-y-3"
        >
          {[
            {
              q: 'Devo avere un pubblico per iniziare?',
              a: 'No. Libra è pensato per farti crescere da zero. La community, le classifiche e i suggerimenti algoritmici aiutano i nuovi autori a essere scoperti. Il primo blocco gratuito di ogni libro abbassa la barriera per i lettori.',
            },
            {
              q: 'Posso pubblicare in qualsiasi genere?',
              a: 'Sì. Romanzo, fantasy, fantascienza, thriller, saggistica, narrativa breve — qualsiasi genere è benvenuto, purché i contenuti rispettino le linee guida della piattaforma. Non c’è approvazione editoriale.',
            },
            {
              q: 'Quando ricevo i pagamenti?',
              a: 'I guadagni in token vengono accreditati in tempo reale sul tuo wallet autore. La conversione e il pagamento avvengono mensilmente, con soglia minima per il payout. Tutti i dettagli e lo storico sono nella sezione Guadagni della dashboard.',
            },
            {
              q: 'Posso cambiare il prezzo dei miei blocchi?',
              a: 'Sì, in qualsiasi momento. Puoi anche cambiare il tier (Free / Silver / Gold) di un libro pubblicato — come le finestre di distribuzione al cinema. Le modifiche valgono per gli sblocchi futuri, non retroattive.',
            },
            {
              q: 'Cosa succede quando finisce la serializzazione?',
              a: 'Dopo i 3 mesi il libro diventa &laquo;completo&raquo;: rimane disponibile in catalogo, accumula letture e guadagni come prima e i lettori che lo hanno sbloccato lo conservano in libreria per sempre. Puoi iniziare subito una nuova serializzazione con un altro libro.',
            },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp}>
              <FaqItem question={item.q} answer={item.a} />
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* CTA FINALE */}
      <section className="px-4 sm:px-6 pb-20 pt-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-3xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sage-700 via-sage-800 to-sage-900 text-white p-8 sm:p-12 text-center shadow-xl">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-300 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronti a iniziare?</h2>
              <p className="text-sage-100 text-lg mb-8">Il tuo primo lettore ti sta aspettando.</p>
              <Link
                href="/signup?author=1"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white text-sage-700 rounded-xl font-bold hover:bg-cream-50 hover:scale-[1.02] transition-all text-base sm:text-lg shadow-lg"
              >
                <Send className="w-5 h-5" />
                Registrati come autore
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-xs text-white/60 mt-4">Gratuito. Nessuna approvazione richiesta.</p>
            </div>
          </div>
        </motion.div>
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
    </div>
  )
}

/* ────────────────────────────────────────────
   Helper components
   ────────────────────────────────────────────*/

function SectionWrap({
  children, id, tone,
}: {
  children: React.ReactNode
  id?: string
  tone: 'white' | 'cream'
}) {
  return (
    <section id={id} className={tone === 'white' ? 'bg-white py-16 sm:py-24' : 'bg-cream-50 py-16 sm:py-24'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  )
}

function SectionHeader({
  eyebrow, title, subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
      className="text-center max-w-2xl mx-auto"
    >
      <motion.p variants={fadeUp} className="text-xs font-bold text-sage-600 uppercase tracking-widest mb-3">
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeUp}
        className="text-3xl sm:text-4xl font-bold text-sage-900 leading-tight"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg text-bark-500 mt-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      )}
    </motion.div>
  )
}

function CompareCell({ value, highlight = false }: { value: string; highlight?: boolean }) {
  if (value === 'check') {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
        highlight ? 'bg-sage-500 text-white' : 'bg-emerald-100 text-emerald-700'
      }`}>
        <Check className="w-4 h-4" />
      </span>
    )
  }
  if (value === 'no') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 text-rose-500">
        <X className="w-4 h-4" />
      </span>
    )
  }
  if (value === 'minus') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-bark-100 text-bark-400">
        <Minus className="w-4 h-4" />
      </span>
    )
  }
  return <span className={`text-xs font-semibold ${highlight ? 'text-sage-700' : 'text-bark-500'}`}>{value}</span>
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
        open ? 'border-sage-300 shadow-sm' : 'border-sage-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-sage-50/40 transition-colors"
      >
        <span className="text-sm sm:text-base font-semibold text-sage-900">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-sage-500 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p
            className="px-5 pb-4 text-sm text-bark-500 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: answer }}
          />
        </div>
      </div>
    </div>
  )
}
