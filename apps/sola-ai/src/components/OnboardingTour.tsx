import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, MessageSquare, Repeat, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const ONBOARDING_KEY = 'sola-ai-onboarding-complete'

const STEPS = [
  {
    icon: Wallet,
    title: 'Connect your wallet',
    description: 'Link your EVM or Solana wallet to view balances, send tokens, and swap across chains.',
  },
  {
    icon: MessageSquare,
    title: 'Ask anything',
    description: 'Type naturally — ask about prices, portfolio balances, transaction history, or market trends.',
  },
  {
    icon: Repeat,
    title: 'Swap & send',
    description: 'Say "swap 1 ETH to USDC" or "send 10 USDC to 0x..." and confirm in one click.',
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-background p-6 shadow-2xl"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            {/* Step content */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="size-7 text-primary" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold">{step.title}</h3>
              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">{step.description}</p>

              {/* Progress dots */}
              <div className="mb-4 flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/25'
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex w-full gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {isLast ? 'Get started' : 'Next'}
                  {!isLast && <ArrowRight className="size-3.5" />}
                </button>
              </div>

              {/* Skip */}
              {!isLast && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-3 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
