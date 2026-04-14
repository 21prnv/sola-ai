import { TrendingUp, X } from 'lucide-react'
import { useState } from 'react'

import { useWalletConnection } from '@/hooks/useWalletConnection'

import { Button } from '../ui/Button'
import { Sheet, SheetClose, SheetContent } from '../ui/Sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'

import { PolymarketOrdersList } from './PolymarketOrdersList'
import { PolymarketPositionsList } from './PolymarketPositionsList'

type PolymarketDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export function PolymarketDrawer({ isOpen, onClose }: PolymarketDrawerProps) {
  const { evmAddress } = useWalletConnection()
  const [activeTab, setActiveTab] = useState('positions')

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 [&>button]:hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">Polymarket</span>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-3 pb-3 border-b border-border">
              <TabsList className="justify-start">
                <TabsTrigger value="positions" className="px-4 py-1.5">
                  Positions
                </TabsTrigger>
                <TabsTrigger value="orders" className="px-4 py-1.5">
                  Open Orders
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="positions" className="flex-1 mt-0 min-h-0">
              <PolymarketPositionsList address={evmAddress} />
            </TabsContent>
            <TabsContent value="orders" className="flex-1 mt-0 min-h-0">
              <PolymarketOrdersList address={evmAddress} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
