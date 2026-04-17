'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  name: string | null
  username: string | null
  avatar_url: string | null
  is_author: boolean
  author_pseudonym: string | null
  author_bio: string | null
  author_banner_url: string | null
  subscription_plan: 'free' | 'silver' | 'gold'
  subscription_end_date: string | null
  bonus_tokens: number
  premium_tokens: number
  bonus_tokens_expire_date: string | null
  preferred_genres: string[]
  completed_onboarding: boolean
  bio: string | null
  library_public: boolean
  created_at: string
  daily_streak: number
  last_reading_date: string | null
  total_xp: number
  longest_streak: number
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null; emailExists?: boolean }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
  totalTokens: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const supabase = createClient()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('🔍 Caricamento profilo per:', userId)
    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // Timeout di 5 secondi sulla query
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout caricamento profilo')), 5000)
      )

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        console.error('❌ Errore caricamento profilo:', error.message, error.code)
        return null
      }
      console.log('✅ Profilo caricato:', data?.name, 'is_author:', data?.is_author)
      return data as UserProfile
    } catch (err: any) {
      console.error('❌ Timeout o errore profilo:', err?.message)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      if (p) setProfile(p)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    // Usiamo SOLO onAuthStateChange per evitare il bug del lock di Supabase
    // che causa il blocco di 5 secondi quando getSession() e onAuthStateChange competono
    console.log('🔐 Inizializzazione auth con onAuthStateChange...')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        console.log('🔐 Auth event:', event, session ? 'con sessione' : 'senza sessione')

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Carica il profilo IN BACKGROUND — NON bloccare il callback
          // Questo rilascia il lock di Supabase immediatamente
          setLoading(false)
          fetchProfile(session.user.id).then(p => {
            if (p) {
              console.log('✅ Profilo caricato:', p.name, 'is_author:', p.is_author)
              setProfile(p)
            } else {
              console.warn('⚠️ Profilo non trovato')
            }
          })
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    // Timeout di sicurezza: se dopo 4 secondi non arriva nessun evento, sblocca
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.log('🔐 Timeout sicurezza - nessun evento auth ricevuto')
        }
        return false
      })
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [fetchProfile])

  const signUp = async (email: string, password: string, name: string) => {
    // Prima controlla se l'email esiste già
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return { error: 'Questa email è già registrata. Vuoi accedere invece?' }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'Questa email è già registrata. Vuoi accedere invece?' }
      }
      return { error: error.message }
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        // Controlla se l'email esiste
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (!data) {
          return { error: 'Nessun account trovato con questa email. Vuoi registrarti?' }
        }
        return { error: 'Password non corretta. Hai dimenticato la password?' }
      }
      return { error: error.message }
    }

    return { error: null }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignora errori di signOut
    }
    setUser(null)
    setProfile(null)
    setSession(null)
    // Forza redirect alla home dopo il logout
    window.location.href = '/'
  }

  const resetPassword = async (email: string) => {
    // Controlla se l'email esiste
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!existingUser) {
      return { error: 'Nessun account trovato con questa email.', emailExists: false }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recupera-password`,
    })

    if (error) {
      return { error: 'Errore nell\'invio dell\'email. Riprova più tardi.' }
    }

    return { error: null, emailExists: true }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Non autenticato' }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) return { error: error.message }

    await refreshProfile()
    return { error: null }
  }

  const totalTokens = (profile?.bonus_tokens ?? 0) + (profile?.premium_tokens ?? 0)

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
        totalTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return context
}
