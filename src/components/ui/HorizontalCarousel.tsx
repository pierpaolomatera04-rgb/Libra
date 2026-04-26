'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Carosello orizzontale riutilizzabile.
 * - Scroll con swipe/drag su mobile
 * - Frecce sinistra/destra su desktop (hover)
 * - Scrollbar nativa nascosta
 * - Usa flex: metti dentro elementi con `flex-shrink-0 w-...`
 */
export default function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll)
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [children])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = Math.max(300, Math.floor(el.clientWidth * 0.8))
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          aria-label="Scorri a sinistra"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 dark:bg-[#1e221c]/90 backdrop-blur border border-sage-200 dark:border-sage-700 rounded-full items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 text-sage-700 dark:text-sage-200" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          aria-label="Scorri a destra"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 dark:bg-[#1e221c]/90 backdrop-blur border border-sage-200 dark:border-sage-700 rounded-full items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-sage-700 dark:text-sage-200" />
        </button>
      )}
    </div>
  )
}
