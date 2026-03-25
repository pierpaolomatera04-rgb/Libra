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
  subscription_plan: 'free' | 'silver' | 'gold'
  subscription_end_date: string | null
  bonus_tokens: number
  premium_tokens: number
  bonus_tokens_expire_date: string | null
  preferred_genres: string[]
  completed_onboarding: boolean
  created_at: string
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Errore caricamento profilo:', error)
      return null
    }
    return data as UserProfile
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      if (p) setProfile(p)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
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
