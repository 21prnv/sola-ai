import { toast } from 'sonner'

/**
 * Dynamic only renders the auth modal when `projectSettings` is loaded (see Dynamic SDK Main.js).
 * Without a valid VITE_DYNAMIC_ENVIRONMENT_ID or if the project fetch fails, `setShowAuthFlow(true)` appears to do nothing.
 */
export function canOpenDynamicAuthFlow(params: {
  environmentId: string | undefined
  sdkHasLoaded: boolean
  projectSettings: unknown
}): boolean {
  const env = params.environmentId?.trim()
  if (!env) {
    toast.error(
      'Wallet is not configured. Set VITE_DYNAMIC_ENVIRONMENT_ID in Sola-AI/.env and restart the dev server (Vite only reads env at startup).'
    )
    return false
  }
  if (!params.sdkHasLoaded) {
    toast.message('Wallet SDK is still loading…')
    return false
  }
  if (!params.projectSettings) {
    toast.error(
      'Could not load Dynamic wallet settings. Check VITE_DYNAMIC_ENVIRONMENT_ID, your network, ad blockers, and that the project exists in the Dynamic dashboard.'
    )
    return false
  }
  return true
}
