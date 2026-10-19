import { PROJECTS, type Project } from '../data/projects'
import { useUI } from '../store'
import { ChevronRightIcon } from './icons'
import { Orb } from './Orb'

/**
 * One row per project, used by the projects sheet and the game over screen.
 * Found projects open their popup; the others show a hint and can't be tapped.
 */
export function ProjectList({ onOpen, compact }: { onOpen: (p: Project, x: number, y: number) => void; compact?: boolean }) {
  const found = useUI(s => s.found)
  return (
    <div className={'plist' + (compact ? ' plist--compact' : '')}>
      {PROJECTS.map(p => found.includes(p.id)
        ? (
          <button key={p.id} data-ui="1" className="plist__row is-found" onClick={e => onOpen(p, e.clientX, e.clientY)}>
            <Orb p={p} className="plist__dot" />
            <span className="plist__copy">
              <span className="plist__name">{p.name}</span>
              <span className="plist__sub">{p.eyebrow}</span>
            </span>
            <span className="plist__go"><ChevronRightIcon /></span>
          </button>
        )
        : (
          <div key={p.id} className="plist__row">
            <span className="plist__dot">?</span>
            <span className="plist__copy">
              <span className="plist__name">Da scoprire</span>
              <span className="plist__sub">Indizio: {p.eyebrow}</span>
            </span>
          </div>
        ))}
    </div>
  )
}
