import { PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { ProjectList } from './ProjectList'

/** Bottom sheet listing every project, opened from the tray. The engine pauses the game while it is up. */
export function ProjectSheet({ actions }: { actions: Actions }) {
  const shown = useUI(s => s.listShown)
  const found = useUI(s => s.found)
  return (
    <>
      <div data-ui="1" className="scrim sheet-scrim" onClick={actions.closeList} style={{ opacity: shown ? 1 : 0 }} />
      <div data-ui="1" className={'sheet' + (shown ? ' is-shown' : '')} role="dialog" aria-label="Progetti Labs">
        <button data-ui="1" className="sheet__handle" onClick={actions.closeList} aria-label="Chiudi"><span /></button>
        <div className="sheet__head">
          <h2 className="sheet__title">Progetti Labs</h2>
          <div className="sheet__count">{found.length}/{PROJECTS.length} scoperti</div>
        </div>
        <ProjectList onOpen={actions.openFromList} />
        <button data-ui="1" className="sheet__back" onClick={actions.closeList}>Torna al gioco</button>
      </div>
    </>
  )
}
