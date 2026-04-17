'use client'

/**
 * BookMockup — Componente libro 3D con dorso, spessore e ombra.
 * Usato ovunque si mostra una copertina: feed, libro, profilo, ecc.
 *
 * Props:
 *  - src: URL immagine copertina (opzionale)
 *  - alt: testo alternativo
 *  - className: classe wrapper esterno (per width)
 *  - size: 'sm' | 'md' | 'lg' preset dimensioni
 *  - hover: abilita animazione hover (default true)
 */

import { BookOpen } from 'lucide-react'

type BookMockupProps = {
  src?: string | null
  alt?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

const SIZES = {
  sm: { width: 'w-20', height: 'h-[120px]', spine: 'w-[6px]', pages: 'w-[4px]' },
  md: { width: 'w-32', height: 'h-44', spine: 'w-[8px]', pages: 'w-[5px]' },
  lg: { width: 'w-48', height: 'h-[270px]', spine: 'w-[10px]', pages: 'w-[6px]' },
}

export default function BookMockup({
  src,
  alt = 'Copertina',
  className = '',
  size = 'md',
  hover = true,
}: BookMockupProps) {
  const s = SIZES[size]

  return (
    <div className={`inline-block ${className}`}>
      <div
        className={`relative ${s.width} ${s.height} group`}
        style={{ perspective: '600px' }}
      >
        {/* Ombra sotto */}
        <div
          className="absolute -bottom-1 left-2 right-1 h-3 rounded-full opacity-30 blur-md bg-black transition-all duration-300"
          style={hover ? {} : {}}
        />

        {/* Contenitore 3D */}
        <div
          className={`relative w-full h-full transition-transform duration-300 ${
            hover ? 'group-hover:[transform:rotateY(-8deg)_translateX(-2px)]' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateY(-3deg)',
          }}
        >
          {/* Copertina frontale */}
          <div
            className="absolute inset-0 rounded-r-md rounded-l-[2px] overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)',
            }}
          >
            {src ? (
              <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sage-200 to-sage-300">
                <BookOpen className={`text-sage-500 ${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-10 h-10' : 'w-14 h-14'}`} />
              </div>
            )}
          </div>

          {/* Dorso (lato sinistro) */}
          <div
            className={`absolute top-0 bottom-0 left-0 ${s.spine} rounded-l-[2px]`}
            style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.05))',
              transform: 'translateX(-100%) rotateY(-90deg)',
              transformOrigin: 'right center',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Pagine (bordo destro) */}
          <div
            className={`absolute top-[2px] bottom-[2px] right-0 ${s.pages}`}
            style={{
              background: 'linear-gradient(to right, #f5f0e8, #e8e0d4)',
              transform: `translateX(100%)`,
              borderRadius: '0 1px 1px 0',
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.08)',
            }}
          />

          {/* Effetto lucido (riflesso) */}
          <div
            className="absolute inset-0 rounded-r-md rounded-l-[2px] pointer-events-none"
            style={{
              background: 'linear-gradient(120deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
