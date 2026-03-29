import { withRetry as _withRetry } from '@sola-ai/utils'
import type { RetryOptions as _RetryOptions } from '@sola-ai/utils'

import { isRetryableError } from './walletErrors'

export type RetryOptions = Omit<_RetryOptions, 'isRetryable'>

export function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  return _withRetry(fn, { ...options, isRetryable: isRetryableError })
}
