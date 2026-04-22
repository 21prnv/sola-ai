import type { ChainId } from '@sola-ai/caip'
import { NETWORK_ICONS } from '@sola-ai/utils'

import { SafeImage } from './SafeImage'

type AssetIconProps = {
  icon?: string
  symbol?: string
  chainId?: ChainId
  networkIcon?: string
  className?: string
}

export function AssetIcon({ icon, symbol = '?', chainId, networkIcon, className }: AssetIconProps) {
  const chainIcon = chainId ? NETWORK_ICONS[chainId] : undefined
  const initial = symbol.charAt(0).toUpperCase()
  const badgeSrc = networkIcon || chainIcon

  return (
    <div className={`relative ${className ?? 'w-10 h-10'}`}>
      <SafeImage
        src={icon}
        alt={symbol}
        className="w-full h-full rounded-full"
        fallback={
          <div className="w-full h-full rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm">
            {initial}
          </div>
        }
      />
      {badgeSrc && (
        <SafeImage
          src={badgeSrc}
          alt="network"
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background"
        />
      )}
    </div>
  )
}
