'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, TrendingUp, Library, Users } from 'lucide-react'

const TABS = [
  { href: '/browse', label: 'Sfoglia', icon: Search },
  { href: '/classifica', label: 'Classifica', icon: TrendingUp },
  { href: '/libreria', label: 'Libreria', icon: Library },
  { href: '/autori', label: 'Autori', icon: Users },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < 50) {
          setVisible(true)
        } else if (y > lastScrollY.current + 8) {
          setVisible(false)  // scroll giù → nascondi
        } else if (y < lastScrollY.current - 4) {
          setVisible(true)   // scroll su → mostra
        }
        lastScrollY.current = y
        ticking.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#161a14]/90 backdrop-blur-lg border-t border-sage-200/50 dark:border-sage-800/50 transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around h-14">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${
                active
                  ? 'text-sage-700 dark:text-sage-300'
                  : 'text-bark-400 dark:text-sage-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
