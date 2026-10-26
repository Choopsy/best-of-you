'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, SunMoon } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Auto', Icon: SunMoon },
]

function readTheme(): Theme {
  const m = document.cookie.match(/(?:^|; )theme=(light|dark|system)/)
  return (m?.[1] as Theme) ?? 'light'
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme(readTheme())
    // En mode « Auto », suivre le changement jour / nuit du téléphone
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (readTheme() === 'system') apply('system') }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const choose = (t: Theme) => {
    document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`
    setTheme(t)
    apply(t)
  }

  return (
    <div role="radiogroup" aria-label="Apparence" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => choose(value)}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            theme === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  )
}
