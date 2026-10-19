import { useEffect, useState } from 'react'

/** Length of the overlays' exit animation (`.is-leaving` in styles.css). */
export const EXIT_MS = 350

/**
 * Whether an overlay should be mounted: true while `open`, and for `ms` more after it closes
 * so it can play its exit animation (the overlay gets `leaving = !open` meanwhile).
 */
export function usePresence(open: boolean, ms = EXIT_MS) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const id = window.setTimeout(() => setMounted(false), ms)
    return () => window.clearTimeout(id)
  }, [open, ms])
  return open || mounted
}
