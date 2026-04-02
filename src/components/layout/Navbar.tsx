'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen, Search, Library, User, Menu, X, Users, Wallet,
  LogOut, LayoutDashboard, PenTool, Settings, ChevronDown,
  Sun, Moon, Eye, EyeOff
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function Navbar() {
  const { user, profile, signOut, totalTokens, loading } = useAuth()
  const { theme, toggleTheme, blueLightFilter, toggleBlueLightFilter } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setAuthTimeout(true)
    }, 4000)
    return () => clearTimeout(timer)
  }, [loading])

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-cream-50/80 dark:bg-[#1a1a1a]/90 backdrop-blur-md border-b border-sage-200/50 dark:border-sage-800/50 transition-colors">
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
          <div className="flex items-center gap-1.5">
            {/* Theme + Eye Care toggles — sempre visibili */}
            <button
              onClick={toggleBlueLightFilter}
              className={`p-2 rounded-full transition-colors ${
                blueLightFilter
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'text-bark-400 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800'
              }`}
              title={blueLightFilter ? 'Disattiva filtro luce blu' : 'Attiva filtro luce blu'}
            >
              {blueLightFilter ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-bark-400 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
              title={theme === 'light' ? 'Modalit\u00E0 scura' : 'Modalit\u00E0 chiara'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Desktop-only actions */}
            <div className="hidden md:flex items-center gap-1.5 ml-1">
              {(loading && !authTimeout) ? (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-8 rounded-full bg-sage-100 animate-pulse" />
                  <div className="w-28 h-8 rounded-full bg-sage-100 animate-pulse" />
                </div>
              ) : user ? (
                <>
                  {/* Wallet */}
                  <Link
                    href="/wallet"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage-50 dark:bg-sage-800 hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-sage-500 dark:text-sage-300" />
                    <span className="text-sm font-semibold text-sage-700 dark:text-sage-200">{totalTokens}</span>
                  </Link>

                  {/* Profilo */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                    >
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-sage-500 flex items-center justify-center text-white text-sm font-bold">
                          {(profile?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-sage-500 dark:text-sage-400" />
                    </button>

                    {profileMenuOpen && (
                      <>
                        <div className="fixed inset-0" onClick={() => setProfileMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-lg border border-sage-100 dark:border-sage-800 py-2 animate-fade-in">
                          <div className="px-4 py-2 border-b border-sage-50 dark:border-sage-800">
                            <div className="flex items-center gap-3 mb-1">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-sage-500 flex items-center justify-center text-white text-lg font-bold">
                                  {(profile?.name || user.email || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-sage-800">{profile?.name || user.email?.split('@')[0]}</p>
                                <p className="text-xs text-bark-400">{user.email}</p>
                              </div>
                            </div>
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 capitalize">
                              {profile?.subscription_plan || 'free'}
                            </span>
                          </div>

                          <Link
                            href="/profilo"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                          >
                            <User className="w-4 h-4" />
                            Il mio profilo
                          </Link>

                          <Link
                            href="/wallet"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                          >
                            <Wallet className="w-4 h-4" />
                            Wallet ({totalTokens} token)
                          </Link>

                          {profile?.is_author && (
                            <Link
                              href="/dashboard"
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              Dashboard Autore
                            </Link>
                          )}

                          {!profile?.is_author && (
                            <Link
                              href="/diventa-autore"
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                            >
                              <PenTool className="w-4 h-4" />
                              Diventa autore
                            </Link>
                          )}

                          <Link
                            href="/impostazioni"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-bark-600 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Impostazioni
                          </Link>

                          <div className="border-t border-sage-50 dark:border-sage-800 mt-1 pt-1">
                            <button
                              onClick={() => { signOut(); setProfileMenuOpen(false) }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              Esci
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-sage-700 dark:text-sage-300 hover:text-sage-800 transition-colors"
                  >
                    Accedi
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm font-medium bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors"
                  >
                    Registrati
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-bark-500 dark:text-sage-400 ml-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage-100 dark:border-sage-800 animate-slide-up" style={{ backgroundColor: 'var(--background)' }}>
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/browse"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
            >
              <Search className="w-5 h-5 text-sage-500" />
              <span className="font-medium">Sfoglia</span>
            </Link>

            <Link
              href="/autori"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
            >
              <Users className="w-5 h-5 text-sage-500" />
              <span className="font-medium">Autori</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/libreria"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
                >
                  <Library className="w-5 h-5 text-sage-500" />
                  <span className="font-medium">La mia libreria</span>
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
                >
                  <Wallet className="w-5 h-5 text-sage-500" />
                  <span className="font-medium">{totalTokens} token</span>
                </Link>
                <Link
                  href="/profilo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
                >
                  <User className="w-5 h-5 text-sage-500" />
                  <span className="font-medium">Profilo</span>
                </Link>
                {profile?.is_author && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
                  >
                    <LayoutDashboard className="w-5 h-5 text-sage-500" />
                    <span className="font-medium">Dashboard Autore</span>
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false) }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
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
                  className="text-center p-3 rounded-lg border border-sage-300 dark:border-sage-700 text-sage-700 dark:text-sage-300 font-medium"
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
