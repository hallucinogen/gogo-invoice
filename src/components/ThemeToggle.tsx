import { useStore } from '../store/AppStore'
import type { Theme } from '../types'
import { MonitorIcon, MoonIcon, SunIcon } from './icons'

const ORDER: Theme[] = ['light', 'dark', 'system']
const LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeToggle() {
  const { theme, setTheme } = useStore()

  const next = () => {
    const idx = ORDER.indexOf(theme)
    setTheme(ORDER[(idx + 1) % ORDER.length])
  }

  const Icon = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : MonitorIcon

  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={next}
      title={`Theme: ${LABEL[theme]} (click to change)`}
      aria-label={`Theme: ${LABEL[theme]}. Click to change.`}
    >
      <Icon className="btn-icon" />
      <span>{LABEL[theme]}</span>
    </button>
  )
}
