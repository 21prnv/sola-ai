import { Chat } from '@/components/Chat'
import { ConnectWallet } from '@/components/ConnectWallet'
import { GitHubStarsButton } from '@/components/GitHubStarsButton'
import { PolymarketButton } from '@/components/Polymarket/PolymarketButton'
import { SidebarLeft } from '@/components/SidebarLeft'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/Sidebar'
import { ChatProvider } from '@/providers/ChatProvider'

export const Dashboard = () => {
  return (
    <ChatProvider>
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset className="h-dvh flex flex-col">
          <header className="sticky top-0 h-12 shrink-0 flex gap-2 bg-background z-10 px-2 items-center">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <GitHubStarsButton />
              <PolymarketButton />
              <ConnectWallet />
            </div>
          </header>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <Chat />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  )
}
