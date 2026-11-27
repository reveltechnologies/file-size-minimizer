import { Capacitor, registerPlugin } from '@capacitor/core'

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.1.0'

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.reveltechnologies.filesizeminimizer'

const DISMISSED_KEY = 'revel.fsm.updateDismissed.v1'

export interface PlayUpdateCheckResult {
  updateAvailable: boolean
  availableVersionCode?: number
}

export interface PlayUpdatePlugin {
  checkForUpdate(): Promise<PlayUpdateCheckResult>
  openStoreListing(): Promise<void>
}

const PlayUpdate = registerPlugin<PlayUpdatePlugin>('PlayUpdate')

export interface UpdateInfo {
  dismissKey: string
  availableVersionCode: number | null
  storeUrl: string
}

export function isUpdateDismissed(key: string): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === key
  } catch {
    return false
  }
}

export function dismissUpdate(key: string): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, key)
  } catch {
    // ignore storage failures in restricted contexts
  }
}

export interface CheckForUpdateOptions {
  platform?: string
  plugin?: PlayUpdatePlugin
}

export async function checkForUpdate(
  options: CheckForUpdateOptions = {},
): Promise<UpdateInfo | null> {
  const platform = options.platform ?? Capacitor.getPlatform()
  if (platform !== 'android') return null

  const plugin = options.plugin ?? PlayUpdate
  try {
    const res = await plugin.checkForUpdate()
    if (!res?.updateAvailable) return null

    const code =
      typeof res.availableVersionCode === 'number' &&
      Number.isFinite(res.availableVersionCode) &&
      res.availableVersionCode > 0
        ? res.availableVersionCode
        : null

    return {
      dismissKey: code !== null ? String(code) : 'available',
      availableVersionCode: code,
      storeUrl: PLAY_STORE_URL,
    }
  } catch {
    return null
  }
}

export async function openPlayStore(options: CheckForUpdateOptions = {}): Promise<void> {
  const platform = options.platform ?? Capacitor.getPlatform()
  if (platform === 'android') {
    const plugin = options.plugin ?? PlayUpdate
    try {
      await plugin.openStoreListing()
      return
    } catch {
      // fall back to opening web URL below
    }
  }
  window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer')
}
