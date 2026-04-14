import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  Coins,
  Flame,
  Fuel,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import './PromptMarquee.css'

type PromptItem = {
  text: string
  icon: LucideIcon
  label: string
  color: string
  ring: string
}

const PROMPTS: PromptItem[] = [
  { text: 'Show my portfolio across all chains', icon: Wallet, label: 'Portfolio', color: 'text-blue-500', ring: 'ring-blue-500/20' },
  { text: 'Swap half my USDC on Arb to ETH', icon: ArrowLeftRight, label: 'Swap', color: 'text-purple-500', ring: 'ring-purple-500/20' },
  { text: 'Send 50 USDC to vitalik.eth', icon: Send, label: 'Send', color: 'text-green-500', ring: 'ring-green-500/20' },
  { text: 'Find Polymarket markets about Bitcoin', icon: TrendingUp, label: 'Polymarket', color: 'text-pink-500', ring: 'ring-pink-500/20' },
  { text: "What's ETH worth right now?", icon: BarChart3, label: 'Markets', color: 'text-orange-500', ring: 'ring-orange-500/20' },
  { text: 'Top trending tokens on CoinGecko', icon: Flame, label: 'Trending', color: 'text-red-500', ring: 'ring-red-500/20' },
  { text: 'Deposit 100 USDC into my vault', icon: Shield, label: 'Vault', color: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  { text: 'Gas prices across all chains', icon: Fuel, label: 'Gas', color: 'text-amber-500', ring: 'ring-amber-500/20' },
  { text: 'Show my recent transactions', icon: Coins, label: 'History', color: 'text-indigo-500', ring: 'ring-indigo-500/20' },
  { text: 'Show my saved contacts', icon: Users, label: 'Contacts', color: 'text-teal-500', ring: 'ring-teal-500/20' },
  { text: 'Give me info on LINK on Arbitrum', icon: Briefcase, label: 'Analysis', color: 'text-violet-500', ring: 'ring-violet-500/20' },
  { text: 'Tell me about Sola AI', icon: Sparkles, label: 'Sola AI', color: 'text-cyan-500', ring: 'ring-cyan-500/20' },
  { text: 'Buy 10 Yes shares at 0.45', icon: TrendingUp, label: 'Polymarket', color: 'text-pink-500', ring: 'ring-pink-500/20' },
  { text: 'Portfolio P&L this week', icon: Wallet, label: 'Portfolio', color: 'text-blue-500', ring: 'ring-blue-500/20' },
  { text: 'Top gainers last 24h', icon: BarChart3, label: 'Markets', color: 'text-orange-500', ring: 'ring-orange-500/20' },
  { text: 'Quotes for 1 ETH to SOL', icon: ArrowLeftRight, label: 'Swap', color: 'text-purple-500', ring: 'ring-purple-500/20' },
  { text: 'Cancel all Polymarket orders', icon: TrendingUp, label: 'Polymarket', color: 'text-pink-500', ring: 'ring-pink-500/20' },
  { text: 'Approvals I should revoke', icon: Coins, label: 'History', color: 'text-indigo-500', ring: 'ring-indigo-500/20' },
  { text: 'Show my Polymarket positions', icon: TrendingUp, label: 'Polymarket', color: 'text-pink-500', ring: 'ring-pink-500/20' },
  { text: 'New coins launching today', icon: Flame, label: 'Trending', color: 'text-red-500', ring: 'ring-red-500/20' },
]

function split<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => [])
  arr.forEach((it, i) => out[i % n]!.push(it))
  return out
}

function Chip({ item, onClick }: { item: PromptItem; onClick: (text: string) => void }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onClick(item.text)}
      className={`group flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-border hover:bg-accent hover:shadow-md hover:ring-2 ${item.ring}`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border/60 shadow-inner transition-transform group-hover:scale-110 ${item.color}`}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="text-foreground/90 whitespace-nowrap font-medium">{item.text}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
        {item.label}
      </span>
    </button>
  )
}

function Row({
  items,
  durationSec,
  onSelect,
  reverse,
}: {
  items: PromptItem[]
  durationSec: number
  onSelect: (text: string) => void
  reverse?: boolean
}) {
  const doubled = [...items, ...items]
  return (
    <div className="prompt-marquee relative overflow-hidden">
      <div
        className={`prompt-marquee-track flex gap-3 py-1 ${reverse ? 'prompt-marquee-reverse' : ''}`}
        style={{ animationDuration: `${durationSec}s` }}
      >
        {doubled.map((item, i) => (
          <Chip key={`${item.text}-${i}`} item={item} onClick={onSelect} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent" />
    </div>
  )
}

export function PromptMarquee({ onSelect }: { onSelect: (prompt: string) => void }) {
  const [row1, row2] = split(PROMPTS, 2)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="w-full space-y-3"
    >
      <Row items={row1!} durationSec={90} onSelect={onSelect} />
      <Row items={row2!} durationSec={120} onSelect={onSelect} reverse />
    </motion.div>
  )
}
