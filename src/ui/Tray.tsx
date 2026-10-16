import { PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { ProjectDots } from './ProjectDots'

export function Tray({ actions }: { actions: Actions }) {
  const found = useUI(s => s.found)
  return (
    <div className="tray">
      <div className="label dim">Progetti scoperti {found.length}/{PROJECTS.length}</div>
      <div className="tray__row"><ProjectDots actions={actions} /></div>
    </div>
  )
}
