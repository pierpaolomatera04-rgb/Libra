'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight, Check, BookOpen, Star, Sparkles, Crown,
  MessageCircle, Trophy, Zap, Heart, ChevronRight, ShoppingCart, Lock, BookMarked,
} from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function ComeFunzionaPage() {
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
            <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors">
              Inizia gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — gradiente verde scuro → beige + pattern di pagine */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sage-800 via-sage-600 to-cream-50" />
        {/* Pattern decorativo: cerchi morbidi */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="absolute top-12 left-[10%] w-40 h-40 rounded-full bg-white blur-3xl" />
          <div className="absolute top-32 right-[15%] w-56 h-56 rounded-full bg-amber-300 blur-3xl" />
          <div className="absolute bottom-20 left-[30%] w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>

        <motion.div
          className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-32 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-xs font-semibold mb-8 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Storytelling seriale all&rsquo;italiana
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05]">
            Leggi come guardi una serie.
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base sm:text-lg text-white/90 mt-6 leading-relaxed">
            Storie a blocchi, community reale, autori che puoi supportare direttamente.
            <br className="hidden sm:block" />
            Nessun libro infinito. Solo il prossimo blocco che non vedi l&rsquo;ora di leggere.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mt-10">
            <Link
              href="/signup"
              className="px-6 sm:px-8 py-3.5 bg-white text-sage-700 rounded-xl font-semibold hover:bg-cream-50 transition-colors flex items-center justify-center gap-2 text-base sm:text-lg shadow-lg"
            >
              <BookOpen className="w-5 h-5" />
              Inizia gratis
            </Link>
            <a
              href="#come-funziona"
              className="px-6 sm:px-8 py-3.5 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-base sm:text-lg"
            >
              Come funziona
              <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* SEZIONE 1 — Come funziona (3 step infografici) */}
      <SectionWrap id="come-funziona" tone="white">
        <SectionHeader
          eyebrow="Il flusso"
          title="Tre step. Niente di complicato."
          subtitle="Non &egrave; un libro. Non &egrave; un social. &Egrave; qualcosa di nuovo."
        />

        <div className="relative grid md:grid-cols-3 gap-6 md:gap-4 mt-12">
          {/* Frecce desktop tra le card */}
          <div className="hidden md:flex absolute inset-y-0 left-1/3 -translate-x-1/2 items-center pointer-events-none z-10">
            <FlowArrow />
          </div>
          <div className="hidden md:flex absolute inset-y-0 left-2/3 -translate-x-1/2 items-center pointer-events-none z-10">
            <FlowArrow />
          </div>

          {[
            {
              n: 1,
              emoji: '📖',
              title: 'Un blocco alla volta',
              desc: 'Ogni storia esce a blocchi, come gli episodi di una serie. Da 5 a 15 minuti di lettura — decidi tu quando leggere.',
            },
            {
              n: 2,
              emoji: '👥',
              title: 'Una community che legge con te',
              desc: 'Commenta, salva le frasi che ti colpiscono, scala le classifiche. Qui non leggi da solo.',
            },
            {
              n: 3,
              emoji: '⭐',
              title: 'Supporta chi scrive',
              desc: 'Segui i tuoi autori preferiti, mandagli una mancia, leggi in anteprima. Il loro successo dipende da te.',
            },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              transition={{ delay: i * 0.12 }}
              className="relative bg-white border border-sage-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-shadow text-center"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 bg-sage-600 text-white text-base font-bold rounded-full flex items-center justify-center shadow-md">
                {step.n}
              </div>
              <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-sage-50 to-sage-100 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                <span aria-hidden>{step.emoji}</span>
              </div>
              <h3 className="text-lg font-bold text-sage-900 mb-2">{step.title}</h3>
              <p className="text-bark-500 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </SectionWrap>

      {/* SEZIONE 2 — La lettura a blocchi (testo + visual) */}
      <SectionWrap tone="cream">
        <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="md:col-span-3"
          >
            <p className="text-xs font-bold text-sage-600 uppercase tracking-widest mb-3">📖 Lettura a blocchi</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-sage-900 leading-tight">
              Leggi come guardi una serie.
            </h2>
            <div className="space-y-3 text-bark-600 leading-relaxed mt-5">
              <p>Ogni storia su Libra esce a blocchi — come gli episodi di una serie TV.</p>
              <p>Gli autori pubblicano fino a <strong>3 blocchi a settimana</strong>, per un massimo di <strong>3 mesi</strong>.</p>
              <p>Ogni blocco dura dai 5 ai 15 minuti di lettura. Abbastanza per immergersi, poco abbastanza da non sentirti mai sopraffatto.</p>
              <p>Nessun libro da 400 pagine che ti fissa dal comodino. Solo il prossimo blocco che non vedi l&rsquo;ora di leggere.</p>
            </div>
          </motion.div>

          {/* Visual: timeline blocchi */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="md:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-sage-200 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-bark-400 uppercase tracking-wider mb-3">Settimana 1</p>
              <div className="space-y-2.5">
                {[
                  { n: 1, label: 'Blocco 1', state: 'done', mins: '8 min' },
                  { n: 2, label: 'Blocco 2', state: 'done', mins: '11 min' },
                  { n: 3, label: 'Blocco 3', state: 'now', mins: '7 min' },
                ].map((b) => (
                  <div
                    key={b.n}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      b.state === 'now'
                        ? 'bg-sage-50 border-sage-300 ring-2 ring-sage-200'
                        : 'bg-cream-50 border-sage-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      b.state === 'done' ? 'bg-sage-500 text-white' : 'bg-amber-400 text-amber-900 animate-pulse'
                    }`}>
                      {b.state === 'done' ? <Check className="w-4 h-4" /> : b.n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sage-800">{b.label}</p>
                      <p className="text-[11px] text-bark-400">{b.mins} di lettura</p>
                    </div>
                    {b.state === 'now' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Ora
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-sage-200 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-3.5 h-3.5 text-sage-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-bark-400">Blocco 4</p>
                    <p className="text-[11px] text-bark-300">Settimana 2</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </SectionWrap>

      {/* SEZIONE 3 — I piani */}
      <SectionWrap tone="white">
        <SectionHeader
          eyebrow="💳 I piani"
          title="Inizia gratis. Rimani perch&eacute; ne vale la pena."
          subtitle="Tre opzioni. Cambi quando vuoi."
        />

        <div className="grid md:grid-cols-3 gap-5 mt-10 max-w-5xl mx-auto items-stretch">
          {/* FREE */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="bg-white border border-sage-200 rounded-2xl p-6 sm:p-7 flex flex-col hover:shadow-md hover:scale-[1.01] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-sage-50 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-sage-600" />
            </div>
            <h3 className="text-xl font-bold text-sage-800">Free</h3>
            <div className="mt-2 mb-5">
              <span className="text-4xl font-bold text-sage-900">0€</span>
            </div>
            <ul className="space-y-2.5 text-sm text-bark-600 flex-1 mb-5">
              {[
                'Il primo blocco di ogni storia &egrave; sempre gratis',
                'Scopri nuovi autori senza rischiare nulla',
                '10 token omaggio alla registrazione',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center w-full py-2.5 bg-sage-50 text-sage-700 rounded-xl font-semibold hover:bg-sage-100 transition-colors"
            >
              Inizia gratis
            </Link>
          </motion.div>

          {/* SILVER */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.08 }}
            className="bg-white border border-sage-200 rounded-2xl p-6 sm:p-7 flex flex-col hover:shadow-md hover:scale-[1.01] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Star className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-sage-800">Silver</h3>
            <div className="mt-2 mb-1">
              <span className="text-4xl font-bold text-sage-900">4,99€</span>
              <span className="text-sm text-bark-400">/mese</span>
            </div>
            <p className="text-xs text-sage-600 font-medium mb-5">o 47,99€/anno — 2 mesi gratis</p>
            <ul className="space-y-2.5 text-sm text-bark-600 flex-1 mb-5">
              {[
                '3 libri al mese dal catalogo',
                'Leggi 24h prima di tutti gli altri',
                'Sconto del 15% su ogni sblocco',
                '10 token omaggio ogni mese',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center w-full py-2.5 bg-sage-500 text-white rounded-xl font-semibold hover:bg-sage-600 transition-colors"
            >
              Scegli Silver
            </Link>
          </motion.div>

          {/* GOLD — più grande e in evidenza */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.16 }}
            className="relative bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg md:scale-[1.04] ring-4 ring-amber-100/60 hover:scale-[1.06] transition-all"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-3 py-1 rounded-full shadow">
              Pi&ugrave; scelto
            </span>
            <div className="w-11 h-11 rounded-xl bg-amber-200 flex items-center justify-center mb-4">
              <Crown className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="text-xl font-bold text-amber-900">Gold</h3>
            <div className="mt-2 mb-1">
              <span className="text-4xl font-bold text-amber-900">9,99€</span>
              <span className="text-sm text-amber-700">/mese</span>
            </div>
            <p className="text-xs text-amber-700 font-medium mb-5">o 95,99€/anno — 2 mesi gratis</p>
            <ul className="space-y-2.5 text-sm text-amber-900 flex-1 mb-5">
              {[
                'Catalogo completo, senza limiti',
                'Leggi 48h prima di tutti',
                'Sconto del 30% su ogni sblocco',
                '20 token omaggio ogni mese',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center w-full py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors shadow"
            >
              Scegli Gold
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-8 max-w-3xl mx-auto rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 text-sm text-sage-800 text-center"
        >
          <span className="mr-1" aria-hidden>📌</span>
          I libri acquistati con token rimangono in libreria <strong>per sempre</strong> — anche se cancelli l&rsquo;abbonamento.
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 4 — Token (infografica flusso) */}
      <SectionWrap tone="cream">
        <SectionHeader
          eyebrow="🪙 I token"
          title="La tua libreria. Per sempre."
          subtitle="La valuta di Libra: sblocchi qualsiasi blocco o libro fuori dal tuo piano."
        />

        {/* Flow infografico: acquisti → sblocchi → libreria per sempre */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-10 max-w-4xl mx-auto"
        >
          {[
            {
              icon: ShoppingCart,
              color: 'text-emerald-600',
              bg: 'bg-emerald-100',
              title: 'Acquisti i token',
              desc: 'Scegli il pacchetto che preferisci. Pi&ugrave; grande, pi&ugrave; risparmi.',
            },
            {
              icon: BookMarked,
              color: 'text-blue-600',
              bg: 'bg-blue-100',
              title: 'Sblocchi un libro',
              desc: 'Usa i token per accedere a qualsiasi blocco o libro completo.',
            },
            {
              icon: Heart,
              color: 'text-rose-600',
              bg: 'bg-rose-100',
              title: 'Resta tuo per sempre',
              desc: 'Anche se cancelli l&rsquo;abbonamento. Senza scadenze.',
            },
          ].map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="relative bg-white border border-sage-200 rounded-2xl p-5 sm:p-6 text-center"
            >
              {/* Freccia tra le card desktop */}
              {i < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                  <ChevronRight className="w-6 h-6 text-sage-400" />
                </div>
              )}
              <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl ${step.bg} flex items-center justify-center`}>
                <step.icon className={`w-7 h-7 ${step.color}`} />
              </div>
              <h3 className="text-base font-bold text-sage-900 mb-1.5">{step.title}</h3>
              <p
                className="text-sm text-bark-500 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: step.desc }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Tabella pacchetti */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-12 max-w-3xl mx-auto"
        >
          <p className="text-xs font-bold text-bark-400 uppercase tracking-widest text-center mb-4">Pacchetti token</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: 'Starter', price: '4,99€', tokens: 50, extra: null },
              { name: 'Medium', price: '9,99€', tokens: 110, extra: '+10%' },
              { name: 'Large', price: '19,99€', tokens: 230, extra: '+15%' },
              { name: 'XL', price: '39,99€', tokens: 500, extra: '+25%' },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border p-4 flex items-center justify-between bg-white transition-all hover:shadow-md ${
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
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 5 — Community (grid 2x2) */}
      <SectionWrap tone="white">
        <SectionHeader
          eyebrow="👥 Community"
          title="Non leggi da solo."
          subtitle="Su Libra la lettura &egrave; un&rsquo;esperienza condivisa."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-2 gap-3 sm:gap-5 mt-10 max-w-4xl mx-auto"
        >
          {[
            {
              icon: MessageCircle,
              color: 'text-blue-600',
              bg: 'bg-blue-100',
              title: 'Commenti',
              desc: 'Ogni capitolo ha la sua sezione commenti. Reagisci mentre leggi.',
            },
            {
              icon: Trophy,
              color: 'text-amber-600',
              bg: 'bg-amber-100',
              title: 'Classifiche',
              desc: 'Pi&ugrave; leggi e commenti, pi&ugrave; sali in classifica.',
            },
            {
              icon: Zap,
              color: 'text-purple-600',
              bg: 'bg-purple-100',
              title: 'XP e rank',
              desc: 'Bronzo &rarr; Argento &rarr; Oro &rarr; Diamante. Con premi reali in token.',
            },
            {
              icon: Heart,
              color: 'text-rose-600',
              bg: 'bg-rose-100',
              title: 'Mance agli autori',
              desc: 'Supporta direttamente chi scrive. Il 90% va all&rsquo;autore.',
            },
          ].map((c, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="bg-white border border-sage-200 rounded-2xl p-4 sm:p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${c.bg} rounded-2xl flex items-center justify-center mb-3 sm:mb-4`}>
                <c.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${c.color}`} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-sage-900 mb-1.5">{c.title}</h3>
              <p
                className="text-xs sm:text-sm text-bark-500 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: c.desc }}
              />
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* SEZIONE 6 — Diventa autore (solo accenno → /diventa-autore) */}
      <SectionWrap tone="cream">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-3xl mx-auto bg-white border border-sage-200 rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sage-100 flex items-center justify-center flex-shrink-0 text-3xl">
              <span aria-hidden>✍️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-sage-900 mb-1">Hai una storia da raccontare?</h3>
              <p className="text-sm text-bark-500 leading-relaxed">
                Pubblica su Libra a blocchi, costruisci il tuo pubblico e guadagna per ogni pagina letta.
              </p>
            </div>
            <Link
              href="/diventa-autore"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-sage-500 text-white rounded-xl font-semibold hover:bg-sage-600 transition-colors whitespace-nowrap"
            >
              Scopri come
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </SectionWrap>

      {/* CTA FINALE — box verde scuro centrato */}
      <section className="px-4 sm:px-6 pb-20 pt-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-3xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sage-700 via-sage-800 to-sage-900 text-white p-8 sm:p-12 text-center shadow-xl">
            {/* Pattern decorativo */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-300 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronti a leggere diversamente?</h2>
              <p className="text-sage-100 text-lg mb-2">Unisciti ai primi lettori di Libra.</p>
              <p className="text-sage-200 text-sm mb-8">
                Il primo blocco &egrave; sempre gratis — nessuna carta di credito richiesta.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-sage-700 rounded-xl font-bold hover:bg-cream-50 hover:scale-[1.02] transition-all text-base sm:text-lg shadow-lg w-full sm:w-auto justify-center"
              >
                Registrati gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
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

function FlowArrow() {
  return (
    <svg className="w-full h-6 text-sage-300" viewBox="0 0 100 24" preserveAspectRatio="none">
      <defs>
        <marker id="arrowhead-flow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
        </marker>
      </defs>
      <line
        x1="5"
        y1="12"
        x2="92"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        markerEnd="url(#arrowhead-flow)"
      />
    </svg>
  )
}
