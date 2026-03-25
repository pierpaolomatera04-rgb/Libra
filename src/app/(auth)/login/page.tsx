'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const { signIn, resetPassword } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      if (error.includes('Nessun account')) {
        toast.error(error, {
          action: {
            label: 'Registrati',
            onClick: () => router.push('/signup'),
          },
        })
      } else if (error.includes('Password non corretta')) {
        toast.error(error, {
          action: {
            label: 'Recupera',
            onClick: () => {
              setResetEmail(email)
              setShowForgotPassword(true)
            },
          },
        })
      } else {
        toast.error(error)
      }
    } else {
      toast.success('Bentornato!')
      router.push('/browse')
    }

    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error, emailExists } = await resetPassword(resetEmail)

    if (error) {
      if (!emailExists) {
        toast.error('Nessun account trovato con questa email.', {
          action: {
            label: 'Registrati',
            onClick: () => router.push('/signup'),
          },
        })
      } else {
        toast.error(error)
      }
    } else {
      setResetSent(true)
      toast.success('Email di recupero inviata!')
    }

    setLoading(false)
  }

  // Modal recupero password
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <BookOpen className="w-10 h-10 text-sage-600" />
              <span className="text-2xl font-bold text-sage-800">Libra</span>
            </Link>
            <h1 className="text-2xl font-bold text-sage-900">Recupera password</h1>
            <p className="text-bark-400 mt-2">
              Inserisci la tua email e ti invieremo un link per reimpostare la password
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-sage-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-sage-600" />
                </div>
                <h2 className="text-lg font-semibold text-sage-800">Email inviata!</h2>
                <p className="text-sm text-bark-500">
                  Controlla la tua casella di posta a <strong>{resetEmail}</strong>.
                  Clicca sul link nell&apos;email per reimpostare la password.
                </p>
                <p className="text-xs text-bark-400">
                  Non vedi l&apos;email? Controlla la cartella spam.
                </p>
                <button
                  onClick={() => { setShowForgotPassword(false); setResetSent(false) }}
                  className="text-sm text-sage-600 hover:text-sage-700 font-medium"
                >
                  Torna al login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-sage-800 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="la-tua@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Invio in corso...' : 'Invia link di recupero'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-bark-500 hover:text-sage-600 transition-colors"
                >
                  Torna al login
                </button>
              </form>
            )}
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
            <BookOpen className="w-10 h-10 text-sage-600" />
            <span className="text-2xl font-bold text-sage-800">Libra</span>
          </Link>
          <h1 className="text-2xl font-bold text-sage-900">Bentornato</h1>
          <p className="text-bark-400 mt-2">Accedi al tuo account per continuare a leggere</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-sage-800">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email)
                    setShowForgotPassword(true)
                  }}
                  className="text-xs text-sage-500 hover:text-sage-700 transition-colors"
                >
                  Hai dimenticato la password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La tua password"
                  required
                  minLength={6}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                'Accesso in corso...'
              ) : (
                <>
                  Accedi
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-bark-500">
          Non hai un account?{' '}
          <Link href="/signup" className="text-sage-600 font-medium hover:text-sage-700">
            Registrati gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
