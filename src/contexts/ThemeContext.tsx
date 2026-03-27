'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  blueLightFilter: boolean
  toggleBlueLightFilter: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [blueLightFilter, setBlueLightFilter] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Carica le preferenze salvate
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('libra-theme') as Theme
    const savedBlueLight = localStorage.getItem('libra-blue-light') === 'true'

    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      // Controlla preferenza di sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        setTheme('dark')
        document.documentElement.classList.add('dark')
      }
    }

    if (savedBlueLight) {
      setBlueLightFilter(true)
      document.documentElement.classList.add('blue-light-filter')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('libra-theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const toggleBlueLightFilter = () => {
    const newValue = !blueLightFilter
    setBlueLightFilter(newValue)
    localStorage.setItem('libra-blue-light', String(newValue))
    document.documentElement.classList.toggle('blue-light-filter', newValue)
  }

  // Evita flash di tema sbagliato
  if (!mounted) return null

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, blueLightFilter, toggleBlueLightFilter }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme deve essere usato dentro ThemeProvider')
  }
  return context
}
