import { useMemo, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'

function isHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | undefined
  fallback?: React.ReactNode
}

/**
 * Renders <img> only when `src` is an https:// URL. Blocks `javascript:`,
 * `data:`, `blob:`, and any protocol-relative or malformed URL that a
 * third-party API (Polymarket, LLM tool output, etc.) could inject.
 */
export function SafeImage({ src, fallback, onError, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false)
  const ok = useMemo(() => !!src && isHttpsUrl(src), [src])

  if (!ok || errored) {
    return (fallback as React.ReactElement) ?? null
  }

  return (
    <img
      src={src}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={event => {
        setErrored(true)
        onError?.(event)
      }}
      {...rest}
    />
  )
}
