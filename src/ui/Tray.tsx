import type { CSSProperties } from 'react'
import { PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'

export function Tray({ actions }: { actions: Actions }) {
  const found = useUI(s => s.found)
  return (
    <div className="tray">
      <div className="eyebrow dim">Progetti scoperti {found.length}/{PROJECTS.length}</div>
      <div className="tray__row">
        {PROJECTS.map(p => {
          const f = found.includes(p.id)
          return (
            <button
              key={p.id}
              data-ui="1"
              className={'tray__item' + (f ? ' is-found' : '')}
              style={{ '--tint': p.tint } as CSSProperties}
              title={f ? p.name : 'Da scoprire'}
              onClick={e => { if (f) actions.openFromUI(p, e.clientX, e.clientY) }}
            >
              {f ? p.name[0] : '?'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
