import { PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'

/** One circle per project (initial when found, "?" otherwise): used in the tray and on the end screens. */
export function ProjectDots({ actions }: { actions: Actions }) {
  const found = useUI(s => s.found)
  return PROJECTS.map(p => {
    const f = found.includes(p.id)
    return (
      <button
        key={p.id}
        data-ui="1"
        className={'dot' + (f ? ' is-found' : '')}
        title={f ? p.name : 'Da scoprire'}
        onClick={e => { if (f) actions.openFromUI(p, e.clientX, e.clientY) }}
      >
        {f ? p.name[0] : '?'}
      </button>
    )
  })
}
