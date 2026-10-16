import { useUI, type Orient } from '../store'

type LockableOrientation = ScreenOrientation & { lock?: (o: Orient) => Promise<void> }

/**
 * Fullscreen + orientation lock (Android Chrome). Where either is unsupported
 * (iOS Safari), fall back to the "Ruota il telefono" overlay for that direction.
 */
export async function lockOrientation(to: Orient) {
  try {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
    const o = screen.orientation as LockableOrientation | undefined
    if (!o?.lock) throw new Error('orientation lock unsupported')
    await o.lock(to)
  } catch {
    // already there: nothing to ask
    if ((innerHeight > innerWidth) !== (to === 'portrait')) useUI.setState({ rotateHint: true, rotateTo: to })
  }
}

export const goLandscape = () => lockOrientation('landscape')

export const dismissRotate = () => useUI.setState({ rotateHint: false })
