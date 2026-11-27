import { describe, expect, it, vi } from 'vitest'
import {
  checkForUpdate,
  openPlayStore,
  PLAY_STORE_URL,
  type PlayUpdatePlugin,
} from './updateCheck'

function makePlugin(overrides: Partial<PlayUpdatePlugin> = {}): PlayUpdatePlugin {
  return {
    checkForUpdate: vi.fn(async () => ({ updateAvailable: false })),
    openStoreListing: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('checkForUpdate', () => {
  it('returns null on non-Android platforms without calling the plugin', async () => {
    const plugin = makePlugin()
    expect(await checkForUpdate({ platform: 'web', plugin })).toBeNull()
    expect(await checkForUpdate({ platform: 'ios', plugin })).toBeNull()
    expect(plugin.checkForUpdate).not.toHaveBeenCalled()
  })

  it('returns update info when Google Play reports an available update', async () => {
    const plugin = makePlugin({
      checkForUpdate: vi.fn(async () => ({
        updateAvailable: true,
        availableVersionCode: 5,
      })),
    })

    expect(await checkForUpdate({ platform: 'android', plugin })).toEqual({
      dismissKey: '5',
      availableVersionCode: 5,
      storeUrl: PLAY_STORE_URL,
    })
  })

  it('falls back to dismissKey "available" when availableVersionCode is missing or zero', async () => {
    const missingCodePlugin = makePlugin({
      checkForUpdate: vi.fn(async () => ({ updateAvailable: true })),
    })
    expect(await checkForUpdate({ platform: 'android', plugin: missingCodePlugin })).toEqual({
      dismissKey: 'available',
      availableVersionCode: null,
      storeUrl: PLAY_STORE_URL,
    })

    const zeroCodePlugin = makePlugin({
      checkForUpdate: vi.fn(async () => ({ updateAvailable: true, availableVersionCode: 0 })),
    })
    expect(await checkForUpdate({ platform: 'android', plugin: zeroCodePlugin })).toEqual({
      dismissKey: 'available',
      availableVersionCode: null,
      storeUrl: PLAY_STORE_URL,
    })
  })

  it('returns null when no update is available or when the plugin rejects', async () => {
    const upToDatePlugin = makePlugin({
      checkForUpdate: vi.fn(async () => ({ updateAvailable: false, availableVersionCode: 4 })),
    })
    expect(await checkForUpdate({ platform: 'android', plugin: upToDatePlugin })).toBeNull()

    const failingPlugin = makePlugin({
      checkForUpdate: vi.fn(async () => {
        throw new Error('Play Store unavailable')
      }),
    })
    expect(await checkForUpdate({ platform: 'android', plugin: failingPlugin })).toBeNull()
  })
})

describe('openPlayStore', () => {
  it('invokes openStoreListing on Android', async () => {
    const plugin = makePlugin()
    await openPlayStore({ platform: 'android', plugin })
    expect(plugin.openStoreListing).toHaveBeenCalledTimes(1)
  })
})
