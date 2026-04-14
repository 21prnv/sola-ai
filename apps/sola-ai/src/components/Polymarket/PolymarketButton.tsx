import { TrendingUp } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../ui/Button'

import { PolymarketDrawer } from './PolymarketDrawer'

export function PolymarketButton() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(true)}
        aria-label="Polymarket positions"
      >
        <TrendingUp className="w-4 h-4 text-purple-500" />
      </Button>
      <PolymarketDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
