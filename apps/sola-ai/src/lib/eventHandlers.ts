import type { MouseEvent } from 'react'

export const stopPropagationHandler = (e: MouseEvent) => {
  e.stopPropagation()
}
