import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, MessageSquare, Repeat, Sparkles, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const ONBOARDING_KEY = 'sola-ai-onboarding-complete'

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Sola',
    description:
      'Your AI copilot for multi-chain crypto. Chat your way through prices, portfolios, and on-chain actions.',
    glow: 'rgba(168, 85, 247, 0.45)',
  },
  {
    icon: Wallet,
    title: 'Connect your wallet',
    description:
      'Link any EVM, Solana, Cosmos, Starknet, TON, or Tron wallet to view balances, send, and swap across chains.',
    glow: 'rgba(59, 130, 246, 0.45)',
  },
  {
    icon: MessageSquare,
    title: 'Ask anything',
    description: 'Type naturally. Ask about prices, balances, transaction history, or market trends.',
    glow: 'rgba(16, 185, 129, 0.45)',
  },
  {
    icon: Repeat,
    title: 'Swap and send',
    description: 'Say "swap 1 ETH to USDC" or "send 10 USDC to 0x..." and confirm in a single click.',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
]

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setVisible(true)
    }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    localStorage.setItem(ONBOARDING_KEY, 'true')
  }, [])

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      dismiss()
    }
  }, [currentStep, dismiss])

  if (!visible) return null

  const step = STEPS[currentStep]!
  const Icon = step.icon
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]"
          >
            <motion.div
              key={`glow-${currentStep}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: step.glow }}
            />

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            />

            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>

            <div className="relative px-7 pt-10 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentStep(i)}
                      aria-label={`Go to step ${i + 1}`}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? 'w-8 bg-white'
                          : i < currentStep
                            ? 'w-4 bg-white/40 hover:bg-white/60'
                            : 'w-4 bg-white/10 hover:bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"
                      style={{ boxShadow: `0 0 40px -10px ${step.glow}` }}
                    >
                      <Icon className="size-6 text-white" strokeWidth={1.75} />
                    </div>

                    <h3 className="mb-2.5 text-[22px] font-semibold tracking-tight text-white">{step.title}</h3>
                    <p className="mb-8 max-w-[300px] text-[13.5px] leading-relaxed text-zinc-400">{step.description}</p>
                  </motion.div>
                </AnimatePresence>

                <div className="flex w-full gap-2">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-zinc-200"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={next}
                    className="group flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-100 active:scale-[0.98]"
                  >
                    {isLast ? 'Get started' : isFirst ? 'Take the tour' : 'Next'}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                {!isLast && (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="mt-3 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
                  >
                    Skip tour
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
