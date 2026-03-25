'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BookOpen, Lock, Eye, EyeOff, Check, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const passwordChecks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password === confirmPassword && confirmPassword.length > 0,
  }
  const isValid = Object.values(passwordChecks).every(Boolean)

  useEffect(() => {
    // Supabase gestisce automaticamente il token dall'URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          // L'utente ha cliccato sul link di recupero, la sessione è attiva
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      toast.error('Errore nel reset della password. Il link potrebbe essere scaduto.')
    } else {
      setSuccess(true)
      toast.success('Password aggiornata con successo!')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
            <div className="w-16 h-16 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-sage-600" />
            </div>
            <h2 className="text-xl font-bold text-sage-900 mb-2">Password aggiornata!</h2>
            <p className="text-bark-500 text-sm mb-6">
              La tua password è stata reimpostata con successo. Ora puoi accedere con la nuova password.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors"
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
            <BookOpen className="w-10 h-10 text-sage-600" />
            <span className="text-2xl font-bold text-sage-800">Libra</span>
          </Link>
          <h1 className="text-2xl font-bold text-sage-900">Nuova password</h1>
          <p className="text-bark-400 mt-2">Scegli una nuova password per il tuo account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-sage-800 mb-1.5">Nuova password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La tua nuova password"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-800 mb-1.5">Conferma password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la nuova password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-sage-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {password.length > 0 && (
              <div className="space-y-1">
                {[
                  { check: passwordChecks.length, label: 'Almeno 6 caratteri' },
                  { check: passwordChecks.uppercase, label: 'Una lettera maiuscola' },
                  { check: passwordChecks.number, label: 'Un numero' },
                  { check: passwordChecks.match, label: 'Le password coincidono' },
                ].map(({ check, label }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-xs ${check ? 'text-sage-600' : 'text-bark-400'}`}>
                    <Check className={`w-3 h-3 ${check ? 'text-sage-500' : 'text-bark-300'}`} />
                    {label}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full py-3 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Aggiornamento...' : 'Aggiorna password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
