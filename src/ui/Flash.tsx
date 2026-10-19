import { useShallow } from 'zustand/react/shallow'
import { useUI } from '../store'

/**
 * Full-screen hit flash. Subscribes on its own: the engine sets the flash twice per hit,
 * and reading it in App would re-render the whole UI each time.
 */
export function Flash() {
  const f = useUI(useShallow(s => ({ flash: s.flash, color: s.flashColor, t: s.flashT })))
  return <div className="flash" style={{ background: f.color, opacity: f.flash, transition: f.t }} />
}
