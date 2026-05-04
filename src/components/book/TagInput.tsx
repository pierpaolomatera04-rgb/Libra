'use client'

import { useEffect, useRef, useState } from 'react'
import { Hash, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface TagInputProps {
  tags: string[]
  onChange: (next: string[]) => void
  max?: number
  placeholder?: string
}

const TAG_RE = /^[a-z0-9àèéìòù_]+$/i

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .slice(0, 30)
}

/**
 * Input tag-style: scrivi e premi Invio o virgola per aggiungere.
 * Max `max` tag (default 5). Suggerisce hashtag popolari da
 * `get_popular_tags(prefix)` mentre l'utente scrive.
 */
export default function TagInput({
  tags,
  onChange,
  max = 5,
  placeholder = 'Aggiungi un hashtag e premi Invio',
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<{ tag: string; usage_count: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const supabase = createClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reachedMax = tags.length >= max

  // Suggerimenti tag popolari (con prefix matching)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (reachedMax) {
      setSuggestions([])
      return
    }
    const prefix = normalizeTag(draft)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.rpc('get_popular_tags', {
        p_prefix: prefix,
        p_limit: 8,
      })
      const filtered = (data || []).filter((s: any) => !tags.includes(s.tag))
      setSuggestions(filtered)
    }, 180)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draft, tags, reachedMax, supabase])

  const addTag = (raw: string) => {
    const t = normalizeTag(raw)
    if (!t) return
    if (!TAG_RE.test(t)) return
    if (tags.includes(t)) return
    if (tags.length >= max) return
    onChange([...tags, t])
    setDraft('')
  }

  const removeTag = (t: string) => onChange(tags.filter((x) => x !== t))

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded-xl border ${
          reachedMax ? 'border-sage-200 bg-sage-50' : 'border-sage-200 bg-white'
        } focus-within:border-sage-400 focus-within:ring-2 focus-within:ring-sage-200 transition-all`}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-sage-500/90 text-white text-xs font-medium"
          >
            <Hash className="w-3 h-3 -ml-0.5 opacity-80" />
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="ml-0.5 p-0.5 rounded-full hover:bg-white/20"
              aria-label={`Rimuovi #${t}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {!reachedMax && (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            placeholder={tags.length === 0 ? placeholder : 'Aggiungi…'}
            maxLength={30}
            className="flex-1 min-w-[120px] py-1 px-1.5 text-sm bg-transparent outline-none"
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-bark-400">
        <span>
          {tags.length}/{max} hashtag
        </span>
        <span>Invio o virgola per aggiungere</span>
      </div>

      {/* Suggerimenti */}
      {showSuggestions && !reachedMax && suggestions.length > 0 && (
        <div className="mt-2 p-2 rounded-lg border border-sage-200 bg-white shadow-sm">
          <p className="text-[11px] font-semibold text-bark-400 uppercase tracking-wide mb-1.5">
            Hashtag popolari{draft ? ` con "${normalizeTag(draft)}"` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(s.tag)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-50 hover:bg-sage-100 text-sage-700 text-xs font-medium border border-sage-200"
              >
                <Hash className="w-3 h-3 opacity-70" />
                {s.tag}
                <span className="text-[10px] text-bark-400 ml-0.5">{s.usage_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
