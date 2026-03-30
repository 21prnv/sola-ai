import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'

export interface ThemeDefinition {
  value: string
  name: string
  description: string
}

export const THEMES: ThemeDefinition[] = [
  { value: 'default', name: 'Default', description: 'Clean and minimal' },
  { value: 'claude', name: 'Claude', description: 'Warm, earthy tones' },
  { value: 'graphite', name: 'Graphite', description: 'Dark and sophisticated' },
  { value: 'amethyst-haze', name: 'Amethyst Haze', description: 'Purple-tinted aesthetic' },
  { value: 'vercel', name: 'Vercel', description: 'High contrast monochrome' },
]

interface ThemeState {
  mode: ThemeMode
  theme: string
  setMode: (mode: ThemeMode) => void
  setTheme: (theme: string) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      mode: 'dark',
      theme: 'default',
      setMode: (mode: ThemeMode) => set({ mode }),
      setTheme: (theme: string) => set({ theme }),
    }),
    {
      name: 'sola-ai-theme',
    }
  )
)
