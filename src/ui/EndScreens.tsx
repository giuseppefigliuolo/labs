import { CTA_HREF, PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { ChevronRightIcon } from './icons'
import { ProjectList } from './ProjectList'

export function GameOver({ actions }: { actions: Actions }) {
  const score = useUI(s => s.score)
  const best = useUI(s => s.best)
  const newRecord = useUI(s => s.newRecord)
  const found = useUI(s => s.found)
  const missing = PROJECTS.length - found.length
  return (
    <div data-ui="1" className="screen screen--over">
      <div className="screen__body">
        <div className="stack gap-4">
          <div className="over__title outlined">Game over</div>
          <div className="over__score outlined">{score}</div>
          <div className={'over__record' + (newRecord ? ' is-new' : '')}>{newRecord ? 'Nuovo record!' : 'Record ' + best}</div>
        </div>
        <div className="stack gap-12 screen__projects">
          <div className="label label--lg dim">Progetti scoperti {found.length}/{PROJECTS.length}</div>
          <ProjectList onOpen={actions.openFromUI} compact />
          {missing > 0 && (
            <p className="over__missing">
              {missing === 1 ? 'Ne manca 1: rigioca per scoprirlo.' : `Ne mancano ${missing}: rigioca per scoprirli.`}
            </p>
          )}
        </div>
        <button data-ui="1" className="btn-primary" onClick={actions.restart}>Rigioca</button>
      </div>
    </div>
  )
}

export function Complete({ actions }: { actions: Actions }) {
  const found = useUI(s => s.found)
  return (
    <div data-ui="1" className="screen screen--complete">
      <div className="screen__body">
        <div className="stack gap-12">
          <div className="label label--lg complete__label">Progetti scoperti {found.length}/{PROJECTS.length}</div>
          <div className="complete__title outlined">Li hai trovati tutti</div>
          <div className="complete__bonus outlined">Bonus +10</div>
        </div>
        <div className="done-pills">
          {PROJECTS.map(p => (
            <button key={p.id} data-ui="1" className="done-pill" style={{ background: p.tint }} onClick={e => actions.openFromUI(p, e.clientX, e.clientY)}>
              {p.name}<ChevronRightIcon size={16} />
            </button>
          ))}
        </div>
        <p className="complete__text">Ogni progetto di Labs è nato dalla curiosità di qualcuno del team. Se ti piace costruire cose così, parliamone.</p>
        <div className="actions">
          <a data-ui="1" className="btn-primary" href={CTA_HREF} target="_blank" rel="noopener">Lavora con noi</a>
          <button data-ui="1" className="btn-ghost" onClick={actions.continueGame}>Continua a giocare</button>
        </div>
      </div>
    </div>
  )
}
