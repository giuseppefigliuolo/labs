import { useUI } from '../store'

type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> }

/**
 * Fullscreen + landscape lock (Android Chrome). Where either is unsupported
 * (iOS Safari), fall back to the "Ruota il telefono" overlay.
 */
export async function goLandscape() {
  try {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
    const o = screen.orientation as LockableOrientation | undefined
    if (!o?.lock) throw new Error('orientation lock unsupported')
    await o.lock('landscape')
  } catch {
    useUI.setState({ rotateHint: true })
  }
}

export const dismissRotate = () => useUI.setState({ rotateHint: false })
