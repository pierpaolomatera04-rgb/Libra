'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Search, Library, User, Menu, X, Users, Wallet,
  LogOut, LayoutDashboard, PenTool, Settings, ChevronDown,
  Sun, Moon, Eye, EyeOff, Bell, Heart, Bookmark, MessageCircle,
  UserPlus, Coins, Lock, TrendingUp
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/hooks/useNotifications'

export default function Navbar() {
  const { user, profile, signOut, totalTokens, loading } = useAuth()
  const { theme, toggleTheme, blueLightFilter, toggleBlueLightFilter } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)
  const pathname = usePathname()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setAuthTimeout(true)
    }, 4000)
    return () => clearTimeout(timer)
  }, [loading])

  const isActive = (path: string) => pathname === path

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Ora'
    if (mins < 60) return `${mins}m fa`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h fa`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}g fa`
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  return (
    <nav className="sticky top-0 z-50 bg-cream-50/80 dark:bg-[#161a14]/90 backdrop-blur-md border-b border-sage-200/50 dark:border-sage-800/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? '/browse' : '/'} className="flex items-center">
            <img src="/logo.png" alt="Libra" className="h-10 sm:h-11 dark:invert dark:brightness-90" />
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
              href="/trending"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/trending') ? 'text-sage-700' : 'text-bark-500 hover:text-sage-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Tendenze
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

                  {/* Notifiche */}
                  {profile?.is_author && (
                    <div className="relative">
                      <button
                        onClick={() => { setNotifMenuOpen(!notifMenuOpen); setProfileMenuOpen(false) }}
                        className="relative p-2 rounded-full text-bark-400 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors"
                      >
                        <Bell className="w-4.5 h-4.5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {notifMenuOpen && (
                        <>
                          <div className="fixed inset-0" onClick={() => setNotifMenuOpen(false)} />
                          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1e221c] rounded-xl shadow-lg border border-sage-100 dark:border-sage-800 py-0 animate-fade-in overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-sage-50 dark:border-sage-800">
                              <h3 className="text-sm font-bold text-sage-900 dark:text-sage-100">Notifiche</h3>
                              {unreadCount > 0 && (
                                <button
                                  onClick={() => markAllAsRead()}
                                  className="text-xs text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 font-medium"
                                >
                                  Segna tutte come lette
                                </button>
                              )}
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                              {notifications.length === 0 ? (
                                <div className="py-10 text-center">
                                  <Bell className="w-8 h-8 text-sage-200 dark:text-sage-700 mx-auto mb-2" />
                                  <p className="text-xs text-bark-400">Nessuna notifica</p>
                                </div>
                              ) : (
                                notifications.slice(0, 10).map((notif) => {
                                  const icon = notif.type === 'follow' ? UserPlus
                                    : notif.type === 'like' ? Heart
                                    : notif.type === 'save' ? Bookmark
                                    : notif.type === 'comment' ? MessageCircle
                                    : notif.type === 'unlock' ? Lock
                                    : Coins
                                  const iconColor = notif.type === 'follow' ? 'text-purple-500'
                                    : notif.type === 'like' ? 'text-red-500'
                                    : notif.type === 'save' ? 'text-sage-600'
                                    : notif.type === 'comment' ? 'text-amber-500'
                                    : notif.type === 'unlock' ? 'text-blue-500'
                                    : 'text-yellow-500'
                                  const isTip = notif.type === 'tip'
                                  const timeAgo = getTimeAgo(notif.created_at)

                                  return (
                                    <div
                                      key={notif.id}
                                      onClick={() => { if (!notif.read) markAsRead(notif.id) }}
                                      className={`flex items-start gap-3 px-4 py-3 hover:bg-sage-50 dark:hover:bg-sage-800/50 transition-colors cursor-pointer ${
                                        !notif.read ? 'bg-sage-50/50 dark:bg-sage-800/30' : ''
                                      } ${isTip ? 'border-l-2 border-yellow-400' : ''}`}
                                    >
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isTip ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-sage-50 dark:bg-sage-800'
                                      }`}>
                                        {(() => { const Icon = icon; return <Icon className={`w-4 h-4 ${iconColor}`} /> })()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs leading-relaxed ${!notif.read ? 'text-sage-900 dark:text-sage-100 font-medium' : 'text-bark-500 dark:text-sage-400'}`}>
                                          {notif.message}
                                        </p>
                                        <p className="text-[10px] text-bark-400 mt-0.5">{timeAgo}</p>
                                      </div>
                                      {!notif.read && (
                                        <div className="w-2 h-2 rounded-full bg-sage-500 flex-shrink-0 mt-1.5" />
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>

                            {notifications.length > 0 && (
                              <Link
                                href="/dashboard"
                                onClick={() => setNotifMenuOpen(false)}
                                className="block text-center py-2.5 text-xs font-medium text-sage-500 hover:text-sage-700 dark:hover:text-sage-300 border-t border-sage-50 dark:border-sage-800"
                              >
                                Vedi tutte nel dashboard
                              </Link>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Profilo */}
                  <div className="relative">
                    <button
                      onClick={() => { setProfileMenuOpen(!profileMenuOpen); setNotifMenuOpen(false) }}
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
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e221c] rounded-xl shadow-lg border border-sage-100 dark:border-sage-800 py-2 animate-fade-in">
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
              href="/trending"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800"
            >
              <TrendingUp className="w-5 h-5 text-sage-500" />
              <span className="font-medium">Tendenze</span>
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
                  <div
                    onClick={() => { setMobileMenuOpen(false); setNotifMenuOpen(true) }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-800 cursor-pointer"
                  >
                    <div className="relative">
                      <Bell className="w-5 h-5 text-sage-500" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">Notifiche</span>
                  </div>
                )}
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
