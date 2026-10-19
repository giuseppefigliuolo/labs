import { useEffect, useRef, type CSSProperties } from 'react'
import { PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { ChevronUpIcon } from './icons'
import { Orb } from './Orb'

const SWIPE = 28 // px upwards that open the projects sheet
const SWIPE_GUARD = 500 // ms during which pill clicks are ignored after a swipe

/**
 * Counter + one pill per project (its orb when found, "?" otherwise). The pill of a
 * project just found widens to show its name until the engine clears `fresh`.
 * Tapping the counter or swiping up on the tray opens the projects sheet.
 */
export function Tray({ actions }: { actions: Actions }) {
  const found = useUI(s => s.found)
  const fresh = useUI(s => s.fresh)
  const down = useRef<{ id: number; y: number } | null>(null)
  const swipedAt = useRef(0)

  // listened on window so a swipe that ends outside the tray still counts
  useEffect(() => {
    const up = (e: PointerEvent) => {
      const d = down.current
      down.current = null
      if (!d || d.id !== e.pointerId || d.y - e.clientY < SWIPE) return
      swipedAt.current = performance.now()
      actions.openList()
    }
    const cancel = () => { down.current = null }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel) }
  }, [actions])

  return (
    <div className="tray">
      <div data-ui="1" className="tray__box" onPointerDown={e => { down.current = { id: e.pointerId, y: e.clientY } }}>
        <button data-ui="1" className="tray__count" onClick={actions.openList} aria-label="Apri la lista dei progetti">
          <ChevronUpIcon />
          <span className="label">Progetti scoperti {found.length}/{PROJECTS.length}</span>
        </button>
        <div className="tray__row" style={{ '--n': PROJECTS.length } as CSSProperties}>
          {PROJECTS.map(p => {
            const f = found.includes(p.id)
            return (
              <button
                key={p.id}
                data-ui="1"
                className={'pill' + (f ? ' is-found' : '') + (fresh === p.id ? ' is-fresh' : '')}
                style={{ '--tint': p.tint } as CSSProperties}
                title={f ? p.name : 'Da scoprire'}
                onClick={e => { if (f && performance.now() - swipedAt.current > SWIPE_GUARD) actions.openFromUI(p, e.clientX, e.clientY) }}
              >
                {f ? <Orb p={p} /> : <span>?</span>}
                {f && <span className="pill__rest">{p.name}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
