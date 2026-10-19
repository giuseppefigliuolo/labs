import { PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { ProjectList } from './ProjectList'

/**
 * Bottom sheet listing every project, opened from the tray (projects of the current run) or from
 * the top bar once all have been unlocked (`listAll`). The engine pauses the game while it is up.
 */
export function ProjectSheet({ actions }: { actions: Actions }) {
  const shown = useUI(s => s.listShown)
  const found = useUI(s => s.found)
  const all = useUI(s => s.listAll)
  const inGame = useUI(s => s.phase === 'play' && !s.complete)
  return (
    <>
      <div data-ui="1" className="scrim sheet-scrim" onClick={actions.closeList} style={{ opacity: shown ? 1 : 0 }} />
      <div data-ui="1" className={'sheet' + (shown ? ' is-shown' : '')} role="dialog" aria-label="Progetti Labs">
        <button data-ui="1" className="sheet__handle" onClick={actions.closeList} aria-label="Chiudi"><span /></button>
        <div className="sheet__head">
          <h2 className="sheet__title">Progetti Labs</h2>
          <div className="sheet__count">{all ? PROJECTS.length : found.length}/{PROJECTS.length} {all ? 'sbloccati' : 'scoperti'}</div>
        </div>
        <ProjectList onOpen={actions.openFromList} all={all} />
        <button data-ui="1" className="sheet__back" onClick={actions.closeList}>{inGame ? 'Torna al gioco' : 'Chiudi'}</button>
      </div>
    </>
  )
}
