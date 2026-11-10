import type { Theme } from './storage'

const THEME_COLORS: Record<Theme, string> = {
  dark: '#0b0d17',
  light: '#eef1fb',
}

export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement
  root.dataset.theme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[theme])
  }
}
