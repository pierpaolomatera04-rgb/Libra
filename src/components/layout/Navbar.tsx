'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen, Search, Library, User, Menu, X, Users, Wallet,
  LogOut, LayoutDashboard, PenTool, Settings, ChevronDown
} from 'lucide-react'

export default function Navbar() {
  const { user, profile, signOut, totalTokens, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)
  const pathname = usePathname()

  // Se auth carica per più di 4 secondi, mostra lo stato attuale
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setAuthTimeout(true)
    }, 4000)
    return () => clearTimeout(timer)
  }, [loading])

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? '/browse' : '/'} className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-sage-600" />
            <span className="text-xl font-bold text-sage-800">Libra</span>
          </Link>

          {/* Nav desktop */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/browse"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/browse') ? 'text-sage-700' : 'text-bark-500 hover:text-sage-600'
              }`}
            >
              <Search className="w-4 h-4" />
              Sfoglia
            </Link>

            <Link
              href="/autori"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/autori') ? 'text-sage-700' : 'text-bark-500 hover:text-sage-600'
              }`}
            >
              <Users className="w-4 h-4" />
              Autori
            </Link>

            {user && (
              <Link
                href="/libreria"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/libreria') ? 'text-sage-700' : 'text-bark-500 hover:text-sage-600'
                }`}
              >
                <Library className="w-4 h-4" />
                La mia libreria
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            {(loading && !authTimeout) ? (
              <div className="flex items-center gap-2">
                <div className="w-20 h-8 rounded-full bg-sage-100 animate-pulse" />
                <div className="w-28 h-8 rounded-full bg-sage-100 animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* Wallet con token */}
                <Link
                  href="/wallet"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage-50 hover:bg-sage-100 transition-colors"
                >
                  <Wallet className="w-4 h-4 text-sage-500" />
                  <span className="text-sm font-semibold text-sage-700">{totalTokens}</span>
                </Link>

                {/* Profilo */}
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-50 hover:bg-sage-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-sage-300 flex items-center justify-center text-white text-xs font-bold">
                      {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-sage-800 max-w-[100px] truncate">
                      {profile?.name || 'Utente'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-sage-500" />
                  </button>

                  {profileMenuOpen && (
                    <>
                      <div className="fixed inset-0" onClick={() => setProfileMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-sage-100 py-2 animate-fade-in">
                        <div className="px-4 py-2 border-b border-sage-50">
                          <p className="text-sm font-semibold text-sage-800">{profile?.name}</p>
                          <p className="text-xs text-bark-400">{user.email}</p>
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 capitalize">
                            {profile?.subscription_plan || 'free'}
                          </span>
                        </div>

                        <Link
                          href="/profilo"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Il mio profilo
                        </Link>

                        <Link
                          href="/wallet"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 transition-colors"
                        >
                          <Wallet className="w-4 h-4" />
                          Wallet ({totalTokens} token)
                        </Link>

                        {profile?.is_author && (
                          <Link
                            href="/dashboard"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard Autore
                          </Link>
                        )}

                        {!profile?.is_author && (
                          <Link
                            href="/diventa-autore"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 transition-colors"
                          >
                            <PenTool className="w-4 h-4" />
                            Diventa autore
                          </Link>
                        )}

                        <Link
                          href="/impostazioni"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Impostazioni
                        </Link>

                        <div className="border-t border-sage-50 mt-1 pt-1">
                          <button
                            onClick={() => { signOut(); setProfileMenuOpen(false) }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Esci
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-sage-700 hover:text-sage-800 transition-colors"
                >
                  Accedi
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors"
                >
                  Registrati
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-bark-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-sage-100 animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/browse"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50"
            >
              <Search className="w-5 h-5 text-sage-500" />
              <span className="font-medium">Sfoglia</span>
            </Link>

            <Link
              href="/autori"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50"
            >
              <Users className="w-5 h-5 text-sage-500" />
              <span className="font-medium">Autori</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/libreria"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50"
                >
                  <Library className="w-5 h-5 text-sage-500" />
                  <span className="font-medium">La mia libreria</span>
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50"
                >
                  <Wallet className="w-5 h-5 text-sage-500" />
                  <span className="font-medium">{totalTokens} token</span>
                </Link>
                <Link
                  href="/profilo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50"
                >
                  <User className="w-5 h-5 text-sage-500" />
                  <span className="font-medium">Profilo</span>
                </Link>
                {profile?.is_author && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50"
                  >
                    <LayoutDashboard className="w-5 h-5 text-sage-500" />
                    <span className="font-medium">Dashboard Autore</span>
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false) }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-50 text-red-500"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Esci</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center p-3 rounded-lg border border-sage-300 text-sage-700 font-medium"
                >
                  Accedi
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center p-3 rounded-lg bg-sage-500 text-white font-medium"
                >
                  Registrati
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
