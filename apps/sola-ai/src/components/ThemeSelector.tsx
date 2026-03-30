import { MoonIcon, PaintBucket, SunIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { THEMES, useThemeStore } from '@/stores/themeStore'

import { Button } from './ui/Button'

export function ThemeSelector() {
  const [open, setOpen] = useState(false)
  const { mode, theme, setMode, setTheme } = useThemeStore()

  return (
    <div className="relative">
      <Button variant="outline" size="icon" onClick={() => setOpen(o => !o)} title="Theme">
        <PaintBucket className="h-4 w-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[240px] rounded-lg border bg-popover p-2 shadow-md">
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">Mode</div>
            <div className="flex gap-1 mb-3">
              <button
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                  mode === 'light' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                )}
                onClick={() => setMode('light')}
              >
                <SunIcon className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                  mode === 'dark' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                )}
                onClick={() => setMode('dark')}
              >
                <MoonIcon className="h-3.5 w-3.5" />
                Dark
              </button>
            </div>

            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">Theme</div>
            <div className="space-y-0.5">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    t.value === theme ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  )}
                  onClick={() => {
                    setTheme(t.value)
                    setOpen(false)
                  }}
                >
                  <div className="flex gap-0.5">
                    <div className={cn(t.value, mode, 'h-3 w-3 rounded-sm bg-primary')} />
                    <div className={cn(t.value, mode, 'h-3 w-3 rounded-sm bg-secondary')} />
                    <div className={cn(t.value, mode, 'h-3 w-3 rounded-sm bg-accent')} />
                  </div>
                  <span>{t.name}</span>
                  {t.value === theme && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
