'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, BookOpen, BarChart3, Coins,
  MessageCircle, UserCircle, Plus, Settings, ArrowLeft, Rocket
} from 'lucide-react'

const studioLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/opere', label: 'Le mie opere', icon: BookOpen },
  { href: '/dashboard/promuovi', label: 'Promuovi', icon: Rocket },
  { href: '/dashboard/analytics', label: 'Statistiche', icon: BarChart3 },
  { href: '/dashboard/guadagni', label: 'Guadagni', icon: Coins },
  { href: '/dashboard/commenti', label: 'Commenti', icon: MessageCircle },
  { href: '/dashboard/profilo-autore', label: 'Profilo autore', icon: UserCircle },
  { href: '/dashboard/impostazioni', label: 'Impostazioni', icon: Settings },
]

export default function AuthorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, loading } = useAuth()

  // Non mostrare la sidebar nelle pagine onboarding e pubblica, o durante il loading
  const showSidebar = !loading && profile?.is_author && pathname !== '/onboarding' && pathname !== '/pubblica'

  return (
    <>
      <Navbar />
      {showSidebar ? (
        <div className="min-h-[calc(100vh-4rem)] flex w-full max-w-[100vw] overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
          {/* Sidebar desktop */}
          <aside className="hidden lg:flex w-64 bg-white border-r border-sage-100 flex-col py-6 px-4 flex-shrink-0">
            <div className="mb-6 px-3">
              <h2 className="text-xs font-bold text-bark-400 uppercase tracking-wider">Studio Autore</h2>
            </div>

            <nav className="space-y-1 flex-1">
              {studioLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-sage-100 text-sage-800'
                        : 'text-bark-500 hover:bg-sage-50 hover:text-sage-700'
                    }`}
                  >
                    <link.icon className={`w-5 h-5 ${isActive ? 'text-sage-600' : 'text-bark-400'}`} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-4 pt-4 border-t border-sage-100 space-y-2">
              <Link
                href="/pubblica"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-sage-500 text-white rounded-xl text-sm font-medium hover:bg-sage-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Pubblica libro
              </Link>
              <Link
                href="/browse"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-bark-500 hover:text-sage-700 rounded-xl text-sm font-medium hover:bg-sage-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Torna al sito
              </Link>
            </div>
          </aside>

          {/* Mobile bottom tabs */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-sage-100 px-1 py-1.5 flex justify-around safe-area-bottom">
            {studioLinks.slice(0, 5).map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${
                    isActive ? 'text-sage-700' : 'text-bark-400'
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${isActive ? 'text-sage-600' : 'text-bark-400'}`} />
                  {link.label.split(' ').slice(-1)[0]}
                </Link>
              )
            })}
            <Link
              href="/browse"
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] text-bark-400"
            >
              <ArrowLeft className="w-5 h-5 text-bark-400" />
              Sito
            </Link>
          </div>

          {/* Content — min-w-0 critico: senza, i figli con tabelle/grafici larghi
              fanno espandere il flex item oltre il viewport e creano scroll orizzontale */}
          <main className="flex-1 min-w-0 bg-cream-50 min-h-[calc(100vh-4rem)] pb-20 lg:pb-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      ) : (
        <main className="min-h-[calc(100vh-4rem)] bg-cream-50 w-full max-w-[100vw] overflow-x-hidden">{children}</main>
      )}
    </>
  )
}
