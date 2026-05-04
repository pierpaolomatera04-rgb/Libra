'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, PenTool } from 'lucide-react'
import { toast } from 'sonner'

export default function SignupPage() {
  // Suspense boundary richiesto da Next.js per useSearchParams in pagine statiche
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  )
}

function SignupPageInner() {
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [pseudonym, setPseudonym] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthorMode = searchParams.get('author') === '1'

  // Preserva il parametro ?redirect=... per ricondurre l'utente al contenuto
  // da cui è arrivato (es. pagina libro, reader). Validato lato client:
  // accettiamo solo path interni (che iniziano con "/") per evitare open-redirect.
  const rawRedirect = searchParams.get('redirect') || ''
  const safeRedirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : ''
  const loginHref = safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : '/login'

  const passwordChecks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }
  const isPasswordValid = Object.values(passwordChecks).every(Boolean)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) {
      toast.error('La password non soddisfa i requisiti')
      return
    }
    if (!name.trim() || !surname.trim()) {
      toast.error('Inserisci nome e cognome')
      return
    }
    if (isAuthorMode && !pseudonym.trim()) {
      toast.error('Inserisci il tuo nome d\'autore o pseudonimo')
      return
    }

    setLoading(true)
    const { error } = await signUp(
      email,
      password,
      name.trim(),
      surname.trim(),
      isAuthorMode ? { isAuthor: true, pseudonym: pseudonym.trim() } : undefined
    )

    if (error) {
      if (error.includes('già registrata')) {
        toast.error(error, {
          action: {
            label: 'Vai al login',
            onClick: () => router.push(loginHref),
          },
        })
      } else {
        toast.error(error)
      }
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
            <div className="w-16 h-16 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-sage-600" />
            </div>
            <h2 className="text-xl font-bold text-sage-900 mb-2">Controlla la tua email!</h2>
            <p className="text-bark-500 text-sm mb-6">
              Abbiamo inviato un link di conferma a <strong>{email}</strong>.
              Clicca sul link per attivare il tuo account.
            </p>
            <p className="text-xs text-bark-400 mb-4">
              Non trovi l&apos;email? Controlla la cartella spam.
            </p>
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 text-sage-600 font-medium hover:text-sage-700"
            >
              Vai al login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="Libra" className="h-12" />
          </Link>
          {isAuthorMode ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">
                <PenTool className="w-3.5 h-3.5" />
                Modalità autore
              </div>
              <h1 className="text-2xl font-bold text-sage-900">Crea il tuo account autore</h1>
              <p className="text-bark-400 mt-2">Pubblica la tua storia e guadagna per ogni pagina letta.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-sage-900">Crea il tuo account</h1>
              <p className="text-bark-400 mt-2">Unisciti alla community di lettori e autori</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Il tuo nome"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">Cognome</label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Il tuo cognome"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {isAuthorMode && (
              <div>
                <label className="block text-sm font-medium text-sage-800 mb-1.5">
                  Nome d&apos;autore o pseudonimo
                </label>
                <div className="relative">
                  <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => setPseudonym(e.target.value)}
                    placeholder="Come vuoi essere conosciuto dai lettori?"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                  />
                </div>
                <p className="text-xs text-bark-400 mt-1">
                  Sarà il nome visibile sui tuoi libri. Potrai cambiarlo in seguito.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-sage-800 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-800 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crea una password sicura"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bark-300 hover:text-bark-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { check: passwordChecks.length, label: 'Almeno 6 caratteri' },
                    { check: passwordChecks.uppercase, label: 'Una lettera maiuscola' },
                    { check: passwordChecks.number, label: 'Un numero' },
                  ].map(({ check, label }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs ${check ? 'text-sage-600' : 'text-bark-400'}`}>
                      <Check className={`w-3 h-3 ${check ? 'text-sage-500' : 'text-bark-300'}`} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                'Registrazione in corso...'
              ) : (
                <>
                  {isAuthorMode ? 'Crea account autore' : 'Crea account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-bark-500">
          Hai già un account?{' '}
          <Link href={loginHref} className="text-sage-600 font-medium hover:text-sage-700">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  )
}
