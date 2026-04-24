'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface Props {
  value: number // 0..5
  onChange?: (v: number) => void
  size?: number
  readOnly?: boolean
  className?: string
}

/** 5-star rating. Hover preview su desktop, tap su mobile. */
export default function StarRating({ value, onChange, size = 20, readOnly = false, className = '' }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} role="radiogroup" aria-label="Valutazione">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange?.(n)}
            aria-label={`${n} stelle`}
            aria-checked={value === n}
            role="radio"
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            <Star
              style={{ width: size, height: size }}
              className={`${
                filled
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-sage-300 dark:text-sage-600'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
